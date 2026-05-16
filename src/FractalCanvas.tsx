import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ParamValues } from './renderers';

export interface RenderRequest {
  id: number;
  fractalId: string;
  params: ParamValues;
  animation?: { zoomDelta: number; frames: number } | null;
}

interface FractalRenderedMessage {
  name: 'FractalRendered';
  data: {
    bitmap: ImageBitmap;
    width: number;
    height: number;
    elapsedMs: number;
    requestId: number;
    frameIndex: number;
  };
}

export interface CrosshairConfig {
  currentX: number;
  currentY: number;
  renderedX: number;
  renderedY: number;
  renderedZoom: number;
  onChange: (centerX: number, centerY: number) => void;
}

interface FractalCanvasProps {
  request: RenderRequest | null;
  onRenderingChange?: (rendering: boolean) => void;
  crosshair?: CrosshairConfig | null;
}

const PLAYBACK_INTERVAL_MS = 1000; // 1 fps
const FRAME_FADE_MS = 200;

export function FractalCanvas({
  request,
  onRenderingChange,
  crosshair = null,
}: FractalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const dragAxisRef = useRef<'x' | 'y' | null>(null);
  const dragViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Animation orchestration
  const framePayloadsRef = useRef<{ fractalId: string; params: ParamValues }[]>([]);
  const bitmapsRef = useRef<(ImageBitmap | null)[]>([]);
  const renderSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const totalElapsedRef = useRef<number>(0);
  const playbackTimerRef = useRef<number | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const priorFrameRef = useRef<ImageBitmap | null>(null);

  const [rendering, setRendering] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Match canvas size to container; observe resize.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const sync = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      setCanvasSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const cancelFade = () => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current !== null) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    cancelFade();
    priorFrameRef.current = null;
  };

  const closeBitmaps = () => {
    for (const b of bitmapsRef.current) {
      if (b) b.close();
    }
    bitmapsRef.current = [];
  };

  const drawBitmap = (bitmap: ImageBitmap) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  };

  // Crossfade from priorFrameRef → next over FRAME_FADE_MS, then promote next to prior.
  const fadeInFrame = (next: ImageBitmap) => {
    cancelFade();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prior = priorFrameRef.current;
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / FRAME_FADE_MS);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (prior) {
        ctx.globalAlpha = 1;
        ctx.drawImage(prior, 0, 0, canvas.width, canvas.height);
      }
      ctx.globalAlpha = t;
      ctx.drawImage(next, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadeRafRef.current = null;
        priorFrameRef.current = next;
      }
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  };

  const startPlayback = () => {
    const bitmaps = bitmapsRef.current;
    if (bitmaps.length === 0) return;

    // Single-frame (non-animation) render: instant draw, no fade.
    if (bitmaps.length === 1) {
      const only = bitmaps[0];
      if (only) drawBitmap(only);
      return;
    }

    // Animation: fade each frame in over FRAME_FADE_MS, advance at PLAYBACK_INTERVAL_MS.
    priorFrameRef.current = null;
    let idx = 0;
    const showNext = () => {
      const frame = bitmapsRef.current[idx];
      if (frame) fadeInFrame(frame);
      idx = (idx + 1) % bitmapsRef.current.length;
    };
    showNext();
    playbackTimerRef.current = window.setInterval(showNext, PLAYBACK_INTERVAL_MS);
  };

  const sendFrame = (frameIndex: number) => {
    const worker = workerRef.current;
    if (!worker) return;
    const payload = framePayloadsRef.current[frameIndex];
    if (!payload) return;
    const { w, h } = renderSizeRef.current;
    worker.postMessage({
      name: 'RenderFractal',
      data: {
        fractalType: payload.fractalId,
        fractalParams: payload.params,
        width: w,
        height: h,
        requestId: latestRequestIdRef.current,
        frameIndex,
      },
    });
  };

  // Spin up the worker once.
  useEffect(() => {
    const worker = new Worker(new URL('./fractal.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<FractalRenderedMessage>) => {
      const msg = e.data;
      if (!msg || msg.name !== 'FractalRendered') return;
      const { bitmap, elapsedMs: dt, requestId, frameIndex } = msg.data;

      // Discard stale results (StrictMode double-fire, superseded request, etc.)
      if (requestId !== latestRequestIdRef.current) {
        bitmap.close();
        return;
      }

      bitmapsRef.current[frameIndex] = bitmap;
      totalElapsedRef.current += dt;

      const total = framePayloadsRef.current.length;
      const nextIndex = frameIndex + 1;
      setProgress({ current: nextIndex, total });

      if (nextIndex < total) {
        sendFrame(nextIndex);
      } else {
        // All frames rendered — begin playback.
        setElapsedMs(totalElapsedRef.current);
        setRendering(false);
        setProgress(null);
        startPlayback();
      }
    };

    return () => {
      stopPlayback();
      closeBitmaps();
      worker.terminate();
      workerRef.current = null;
    };
    // Worker spins up once; helper closures read refs, so identity drift is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!request) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const worker = workerRef.current;
    if (!canvas || !container || !worker) return;

    // Tear down anything from the previous request.
    stopPlayback();
    closeBitmaps();

    // Re-sync size at render time in case container changed.
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const superscale = 2;
    renderSizeRef.current = { w: w * superscale, h: h * superscale };

    // Build per-frame payloads.
    const animation = request.animation;
    const animFrames =
      animation && animation.frames >= 1 ? Math.floor(animation.frames) : 0;
    if (animFrames > 0) {
      const baseZoom =
        typeof request.params.zoom === 'number' ? request.params.zoom : 0;
      const payloads: { fractalId: string; params: ParamValues }[] = [];
      const zoomMultiplier = (100 + animation!.zoomDelta)/100;
      let zoom = baseZoom;
      for (let i = 0; i < animFrames; i++) {
        if (i > 0) {
            zoom = zoom * zoomMultiplier
        }
        payloads.push({
          fractalId: request.fractalId,
          params: { ...request.params, zoom: zoom },
        });
      }
      framePayloadsRef.current = payloads;
    } else {
      framePayloadsRef.current = [
        { fractalId: request.fractalId, params: request.params },
      ];
    }

    bitmapsRef.current = new Array(framePayloadsRef.current.length).fill(null);
    totalElapsedRef.current = 0;
    latestRequestIdRef.current = request.id;
    setRendering(true);
    setElapsedMs(null);
    setProgress(
      framePayloadsRef.current.length > 1
        ? { current: 0, total: framePayloadsRef.current.length }
        : null,
    );

    sendFrame(0);
    // Helpers are stable closures over refs; including them would re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  useEffect(() => {
    onRenderingChange?.(rendering);
  }, [rendering, onRenderingChange]);

  let crosshairPx: { x: number; y: number } | null = null;
  if (crosshair && canvasSize.w > 0 && canvasSize.h > 0 && crosshair.renderedZoom > 0) {
    const dxPerPx = 4 / crosshair.renderedZoom / canvasSize.w;
    crosshairPx = {
      x: canvasSize.w / 2 + (crosshair.currentX - crosshair.renderedX) / dxPerPx,
      y: canvasSize.h / 2 - (crosshair.currentY - crosshair.renderedY) / dxPerPx,
    };
  }

  const makeDragHandlers = (axis: 'x' | 'y') => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!crosshair) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragAxisRef.current = axis;
      dragViewportRef.current = {
        x: crosshair.renderedX,
        y: crosshair.renderedY,
        zoom: crosshair.renderedZoom,
      };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragAxisRef.current !== axis || !crosshair) return;
      const vp = dragViewportRef.current;
      if (!vp || vp.zoom <= 0) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dxPerPx = 4 / vp.zoom / rect.width;
      if (axis === 'x') {
        const newX = vp.x + (e.clientX - rect.left - rect.width / 2) * dxPerPx;
        crosshair.onChange(newX, crosshair.currentY);
      } else {
        const newY = vp.y - (e.clientY - rect.top - rect.height / 2) * dxPerPx;
        crosshair.onChange(crosshair.currentX, newY);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragAxisRef.current === axis) {
        dragAxisRef.current = null;
        dragViewportRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // pointer may already be released
        }
      }
    },
  });

  return (
    <div className="canvas-area" ref={containerRef}>
      <canvas ref={canvasRef} className="fractal-canvas" />
      {crosshair && crosshairPx && (
        <>
          <div
            className="crosshair-bar crosshair-vertical"
            style={{ left: `${crosshairPx.x}px` }}
            {...makeDragHandlers('x')}
          />
          <div
            className="crosshair-bar crosshair-horizontal"
            style={{ top: `${crosshairPx.y}px` }}
            {...makeDragHandlers('y')}
          />
        </>
      )}
      {!request && (
        <div className="canvas-hint">
          <div className="canvas-hint-line">// awaiting parameters</div>
          <div className="canvas-hint-line dim">press GENERATE to render</div>
        </div>
      )}
      {rendering && (
        <>
          <div className="canvas-overlay">
            <span className="canvas-overlay-dot" />
            <span>
              {progress
                ? `rendering frame ${progress.current + 1}/${progress.total}…`
                : 'rendering…'}
            </span>
          </div>
          <div className="canvas-spinner" aria-label="rendering" role="status" />
        </>
      )}
      {!rendering && elapsedMs !== null && (
        <div className="canvas-stat">{elapsedMs.toFixed(0)} ms</div>
      )}
    </div>
  );
}
