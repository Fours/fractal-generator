import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ParamValues } from './renderers';

export interface RenderRequest {
  id: number;
  fractalId: string;
  params: ParamValues;
}

interface FractalRenderedMessage {
  name: 'FractalRendered';
  data: {
    bitmap: ImageBitmap;
    width: number;
    height: number;
    elapsedMs: number;
    requestId: number;
  };
}

interface FractalCanvasProps {
  request: RenderRequest | null;
  onRenderingChange?: (rendering: boolean) => void;
}

export function FractalCanvas({ request, onRenderingChange }: FractalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const [rendering, setRendering] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

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
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Spin up the worker once.
  useEffect(() => {
    const worker = new Worker(new URL('./fractal.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<FractalRenderedMessage>) => {
      const msg = e.data;
      if (!msg || msg.name !== 'FractalRendered') return;
      const { bitmap, elapsedMs: dt, requestId } = msg.data;

      // Discard stale results (StrictMode double-fire, resize-triggered re-renders, etc.)
      if (requestId !== latestRequestIdRef.current) {
        bitmap.close();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        bitmap.close();
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setElapsedMs(dt);
      setRendering(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const worker = workerRef.current;
    if (!canvas || !container || !worker) return;

    // Re-sync size at render time in case container changed.
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    latestRequestIdRef.current = request.id;
    setRendering(true);
    setElapsedMs(null);

    const superscale = 2;
    worker.postMessage({
      name: 'RenderFractal',
      data: {
        fractalType: request.fractalId,
        fractalParams: request.params,
        width: w * superscale,
        height: h * superscale,
        requestId: request.id,
      },
    });
  }, [request]);

  useEffect(() => {
    onRenderingChange?.(rendering);
  }, [rendering, onRenderingChange]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <canvas ref={canvasRef} className="fractal-canvas" />
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
            <span>rendering…</span>
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
