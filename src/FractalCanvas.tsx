import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { renderFractal, type ParamValues } from './renderers';

export interface RenderRequest {
  id: number;
  fractalId: string;
  params: ParamValues;
}

export function FractalCanvas({ request }: { request: RenderRequest | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    if (!request) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Re-sync size at render time in case container changed.
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    setRendering(true);
    setElapsedMs(null);

    // Two RAFs so the overlay paints before we block the main thread.
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const start = performance.now();
        renderFractal(canvas, request.fractalId, request.params);
        const dt = performance.now() - start;
        setElapsedMs(dt);
        setRendering(false);
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, [request]);

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
        <div className="canvas-overlay">
          <span className="canvas-overlay-dot" />
          <span>rendering…</span>
        </div>
      )}
      {!rendering && elapsedMs !== null && (
        <div className="canvas-stat">{elapsedMs.toFixed(0)} ms</div>
      )}
    </div>
  );
}
