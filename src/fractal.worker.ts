/// <reference lib="webworker" />
import { renderFractal, type ParamValues } from './renderers';

interface RenderFractalMessage {
  name: 'RenderFractal';
  data: {
    fractalType: string;
    fractalParams: ParamValues;
    width: number;
    height: number;
    requestId: number;
    frameIndex: number;
  };
}

type InboundMessage = RenderFractalMessage;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<InboundMessage>) => {
  const msg = e.data;
  if (!msg || msg.name !== 'RenderFractal') return;

  const { fractalType, fractalParams, width, height, requestId, frameIndex } = msg.data;

  const canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
  const start = performance.now();
  renderFractal(canvas, fractalType, fractalParams);
  const elapsedMs = performance.now() - start;

  const bitmap = canvas.transferToImageBitmap();
  ctx.postMessage(
    {
      name: 'FractalRendered',
      data: { bitmap, width, height, elapsedMs, requestId, frameIndex },
    },
    { transfer: [bitmap] },
  );
};
