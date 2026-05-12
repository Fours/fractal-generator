import { getPalette } from './palettes';

export type ParamValues = Record<string, number | string>;

export function renderFractal(
  canvas: HTMLCanvasElement,
  fractalId: string,
  params: ParamValues,
): void {
  switch (fractalId) {
    case 'mandelbrot':
      renderMandelbrot(canvas, params);
      return;
    case 'julia':
      renderJulia(canvas, params);
      return;
    case 'newton':
      renderNewton(canvas, params);
      return;
    case 'burning-ship':
      renderBurningShip(canvas, params);
      return;
    case 'sierpinski':
      renderSierpinski(canvas, params);
      return;
    case 'barnsley-fern':
      renderBarnsleyFern(canvas, params);
      return;
    default:
      clearCanvas(canvas);
  }
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderMandelbrot(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const maxIterations = Math.max(1, Number(params.maxIterations) | 0);
  const centerX = Number(params.centerX);
  const centerY = Number(params.centerY);
  const zoom = Math.max(1e-9, Number(params.zoom));
  const escapeRadius = Math.max(2, Number(params.escapeRadius));
  const palette = getPalette(String(params.palette));

  const viewWidth = 4 / zoom;
  const viewHeight = (viewWidth * height) / width;
  const dx = viewWidth / width;
  const dy = viewHeight / height;
  const x0 = centerX - viewWidth / 2 + dx / 2;
  const y0 = centerY + viewHeight / 2 - dy / 2;

  const escapeR2 = escapeRadius * escapeRadius;
  const logEscapeR = Math.log(escapeRadius);
  const log2 = Math.log(2);

  const imageData = ctx.createImageData(width, height);
  const buf32 = new Uint32Array(imageData.data.buffer);

  for (let py = 0; py < height; py++) {
    const cy = y0 - py * dy;
    for (let px = 0; px < width; px++) {
      const cx = x0 + px * dx;

      let iter: number;
      let zx2 = 0;
      let zy2 = 0;

      if (inMainCardioid(cx, cy) || inPeriod2Bulb(cx, cy)) {
        iter = maxIterations;
      } else {
        let zx = 0;
        let zy = 0;
        let i = 0;
        while (i < maxIterations && zx2 + zy2 <= escapeR2) {
          zy = 2 * zx * zy + cy;
          zx = zx2 - zy2 + cx;
          zx2 = zx * zx;
          zy2 = zy * zy;
          i++;
        }
        iter = i;
      }

      let color: number;
      if (iter >= maxIterations) {
        color = 0xff000000; // ABGR little-endian: opaque black
      } else {
        // Smooth iteration count: μ = i + 1 − log(log|z|) / log 2
        const logZn = Math.log(zx2 + zy2) * 0.5;
        const nu = Math.log(logZn / logEscapeR) / log2;
        const smoothed = iter + 1 - nu;
        const t = Math.sqrt(Math.max(0, smoothed) / maxIterations);
        const [r, g, b] = palette(t);
        color = (255 << 24) | (b << 16) | (g << 8) | r;
      }

      buf32[py * width + px] = color;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderJulia(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const maxIterations = Math.max(1, Number(params.maxIterations) | 0);
  const cReal = Number(params.cReal);
  const cImag = Number(params.cImag);
  const centerX = Number(params.centerX);
  const centerY = Number(params.centerY);
  const zoom = Math.max(1e-9, Number(params.zoom));
  const escapeRadius = Math.max(2, Number(params.escapeRadius));
  const palette = getPalette(String(params.palette));

  const viewWidth = 4 / zoom;
  const viewHeight = (viewWidth * height) / width;
  const dx = viewWidth / width;
  const dy = viewHeight / height;
  const x0 = centerX - viewWidth / 2 + dx / 2;
  const y0 = centerY + viewHeight / 2 - dy / 2;

  const escapeR2 = escapeRadius * escapeRadius;
  const logEscapeR = Math.log(escapeRadius);
  const log2 = Math.log(2);

  const imageData = ctx.createImageData(width, height);
  const buf32 = new Uint32Array(imageData.data.buffer);

  for (let py = 0; py < height; py++) {
    const sy = y0 - py * dy;
    for (let px = 0; px < width; px++) {
      const sx = x0 + px * dx;

      let zx = sx;
      let zy = sy;
      let zx2 = zx * zx;
      let zy2 = zy * zy;
      let i = 0;
      while (i < maxIterations && zx2 + zy2 <= escapeR2) {
        zy = 2 * zx * zy + cImag;
        zx = zx2 - zy2 + cReal;
        zx2 = zx * zx;
        zy2 = zy * zy;
        i++;
      }

      let color: number;
      if (i >= maxIterations) {
        color = 0xff000000;
      } else {
        const logZn = Math.log(zx2 + zy2) * 0.5;
        const nu = Math.log(logZn / logEscapeR) / log2;
        const smoothed = i + 1 - nu;
        const t = Math.sqrt(Math.max(0, smoothed) / maxIterations);
        const [r, g, b] = palette(t);
        color = (255 << 24) | (b << 16) | (g << 8) | r;
      }

      buf32[py * width + px] = color;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderBarnsleyFern(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const points = Math.max(1, Number(params.points) | 0);
  const stemBias = Math.max(0, Number(params.stemBias));
  const palette = getPalette(String(params.palette));

  // Attractor bounding box (well-known limits of the standard Barnsley fern).
  const xMin = -2.2;
  const xMax = 2.7;
  const yMin = 0;
  const yMax = 10;
  const fernW = xMax - xMin;
  const fernH = yMax - yMin;

  const marginPx = 16;
  const availW = Math.max(1, width - 2 * marginPx);
  const availH = Math.max(1, height - 2 * marginPx);
  const scale = Math.min(availW / fernW, availH / fernH);
  const fernPxW = fernW * scale;
  const fernPxH = fernH * scale;
  const offsetX = (width - fernPxW) / 2 - xMin * scale;
  const offsetY = (height + fernPxH) / 2;

  // Stem bias scales f1's weight (default classical weight is 0.01); renormalize.
  const w0 = 0.01 * stemBias;
  const wSum = w0 + 0.85 + 0.07 + 0.07;
  const p1 = w0 / wSum;
  const p12 = (w0 + 0.85) / wSum;
  const p123 = (w0 + 0.85 + 0.07) / wSum;

  const counts = new Uint32Array(width * height);

  let x = 0;
  let y = 0;
  const warmup = 20;
  const total = points + warmup;

  for (let i = 0; i < total; i++) {
    const r = Math.random();
    let nx: number;
    let ny: number;
    if (r < p1) {
      // f1 — stem
      nx = 0;
      ny = 0.16 * y;
    } else if (r < p12) {
      // f2 — successively smaller leaflets
      nx = 0.85 * x + 0.04 * y;
      ny = -0.04 * x + 0.85 * y + 1.6;
    } else if (r < p123) {
      // f3 — left leaflet
      nx = 0.2 * x - 0.26 * y;
      ny = 0.23 * x + 0.22 * y + 1.6;
    } else {
      // f4 — right leaflet
      nx = -0.15 * x + 0.28 * y;
      ny = 0.26 * x + 0.24 * y + 0.44;
    }
    x = nx;
    y = ny;

    if (i < warmup) continue;

    const px = (offsetX + x * scale) | 0;
    const py = (offsetY - y * scale) | 0;
    if (px >= 0 && px < width && py >= 0 && py < height) {
      counts[py * width + px]++;
    }
  }

  let maxCount = 1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) maxCount = counts[i];
  }
  const logMax = Math.log(1 + maxCount);

  const imageData = ctx.createImageData(width, height);
  const buf32 = new Uint32Array(imageData.data.buffer);

  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c === 0) {
      buf32[i] = 0xff000000;
    } else {
      const t = Math.log(1 + c) / logMax;
      const [r, g, b] = palette(t);
      buf32[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderSierpinski(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const depth = Math.max(0, Math.min(14, Number(params.depth) | 0));
  const rotationDeg = Number(params.rotation) || 0;
  const palette = getPalette(String(params.palette));

  const rot = (rotationDeg * Math.PI) / 180;
  const margin = 16;
  const radius = Math.min(width, height) / 2 - margin;
  const cxView = width / 2;
  const cyView = height / 2;

  type V = { x: number; y: number };
  const verts: V[] = [];
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + rot + (2 * Math.PI * k) / 3;
    verts.push({ x: cxView + radius * Math.cos(a), y: cyView + radius * Math.sin(a) });
  }

  // Group leaves into color bands by centroid x so we issue one fill per band.
  const bands = 32;
  const paths: Path2D[] = [];
  for (let i = 0; i < bands; i++) paths.push(new Path2D());

  const minX = Math.min(verts[0].x, verts[1].x, verts[2].x);
  const maxX = Math.max(verts[0].x, verts[1].x, verts[2].x);
  const spanX = Math.max(1e-9, maxX - minX);

  const subdivide = (v0: V, v1: V, v2: V, level: number): void => {
    if (level <= 0) {
      const tx = (v0.x + v1.x + v2.x) / 3;
      const t = Math.max(0, Math.min(0.9999, (tx - minX) / spanX));
      const path = paths[Math.floor(t * bands)];
      path.moveTo(v0.x, v0.y);
      path.lineTo(v1.x, v1.y);
      path.lineTo(v2.x, v2.y);
      path.closePath();
      return;
    }
    const m01: V = { x: (v0.x + v1.x) / 2, y: (v0.y + v1.y) / 2 };
    const m12: V = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
    const m02: V = { x: (v0.x + v2.x) / 2, y: (v0.y + v2.y) / 2 };
    subdivide(v0, m01, m02, level - 1);
    subdivide(m01, v1, m12, level - 1);
    subdivide(m02, m12, v2, level - 1);
  };

  subdivide(verts[0], verts[1], verts[2], depth);

  for (let i = 0; i < bands; i++) {
    const [r, g, b] = palette((i + 0.5) / bands);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill(paths[i]);
  }
}

function renderBurningShip(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const maxIterations = Math.max(1, Number(params.maxIterations) | 0);
  const centerX = Number(params.centerX);
  const centerY = Number(params.centerY);
  const zoom = Math.max(1e-9, Number(params.zoom));
  const escapeRadius = Math.max(2, Number(params.escapeRadius));
  const palette = getPalette(String(params.palette));

  const viewWidth = 4 / zoom;
  const viewHeight = (viewWidth * height) / width;
  const dx = viewWidth / width;
  const dy = viewHeight / height;
  const x0 = centerX - viewWidth / 2 + dx / 2;
  const y0 = centerY + viewHeight / 2 - dy / 2;

  const escapeR2 = escapeRadius * escapeRadius;
  const logEscapeR = Math.log(escapeRadius);
  const log2 = Math.log(2);

  const imageData = ctx.createImageData(width, height);
  const buf32 = new Uint32Array(imageData.data.buffer);

  for (let py = 0; py < height; py++) {
    const cy = y0 - py * dy;
    for (let px = 0; px < width; px++) {
      const cx = x0 + px * dx;

      let zx = 0;
      let zy = 0;
      let zx2 = 0;
      let zy2 = 0;
      let i = 0;
      while (i < maxIterations && zx2 + zy2 <= escapeR2) {
        // z_{n+1} = (|Re z| + i|Im z|)^2 + c
        // → zx' = zx² − zy² + cx,  zy' = 2·|zx|·|zy| + cy
        const absXY = Math.abs(zx) * Math.abs(zy);
        zx = zx2 - zy2 + cx;
        zy = 2 * absXY + cy;
        zx2 = zx * zx;
        zy2 = zy * zy;
        i++;
      }

      let color: number;
      if (i >= maxIterations) {
        color = 0xff000000;
      } else {
        const logZn = Math.log(zx2 + zy2) * 0.5;
        const nu = Math.log(logZn / logEscapeR) / log2;
        const smoothed = i + 1 - nu;
        const t = Math.sqrt(Math.max(0, smoothed) / maxIterations);
        const [r, g, b] = palette(t);
        color = (255 << 24) | (b << 16) | (g << 8) | r;
      }

      buf32[py * width + px] = color;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

const NEWTON_DEGREES: Record<string, number> = {
  'z3-1': 3,
  'z4-1': 4,
  'z5-1': 5,
  'z6-1': 6,
};

function renderNewton(canvas: HTMLCanvasElement, params: ParamValues) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const n = NEWTON_DEGREES[String(params.polynomial)] ?? 3;
  const maxIterations = Math.max(1, Number(params.maxIterations) | 0);
  const tolerance = Math.max(1e-12, Number(params.tolerance));
  const a = Number(params.relaxation);
  const zoom = Math.max(1e-9, Number(params.zoom));
  const palette = getPalette(String(params.palette));

  const viewWidth = 4 / zoom;
  const viewHeight = (viewWidth * height) / width;
  const dx = viewWidth / width;
  const dy = viewHeight / height;
  const x0 = -viewWidth / 2 + dx / 2;
  const y0 = viewHeight / 2 - dy / 2;

  // Roots of z^n - 1 are the nth roots of unity.
  const rootsX = new Float64Array(n);
  const rootsY = new Float64Array(n);
  const rootColors: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const theta = (2 * Math.PI * k) / n;
    rootsX[k] = Math.cos(theta);
    rootsY[k] = Math.sin(theta);
    rootColors.push(palette((k + 0.5) / n));
  }

  const tol2 = tolerance * tolerance;
  const imageData = ctx.createImageData(width, height);
  const buf32 = new Uint32Array(imageData.data.buffer);

  for (let py = 0; py < height; py++) {
    const sy = y0 - py * dy;
    for (let px = 0; px < width; px++) {
      let zx = x0 + px * dx;
      let zy = sy;

      let iter = 0;
      let rootIdx = -1;

      while (iter < maxIterations) {
        // p = z^(n-1) via repeated complex multiplication.
        let px_ = 1;
        let py_ = 0;
        for (let k = 0; k < n - 1; k++) {
          const t = px_ * zx - py_ * zy;
          py_ = px_ * zy + py_ * zx;
          px_ = t;
        }
        // z^n = z^(n-1) · z
        const znx = px_ * zx - py_ * zy;
        const zny = px_ * zy + py_ * zx;

        // f(z) = z^n − 1,  f'(z) = n · z^(n-1)
        const fx = znx - 1;
        const fy = zny;
        const fpx = n * px_;
        const fpy = n * py_;

        const denom = fpx * fpx + fpy * fpy;
        if (denom < 1e-30) break;

        // Δ = f / f'
        const dxz = (fx * fpx + fy * fpy) / denom;
        const dyz = (fy * fpx - fx * fpy) / denom;

        // z ← z − a · Δ
        zx -= a * dxz;
        zy -= a * dyz;

        iter++;

        for (let k = 0; k < n; k++) {
          const ex = zx - rootsX[k];
          const ey = zy - rootsY[k];
          if (ex * ex + ey * ey < tol2) {
            rootIdx = k;
            break;
          }
        }
        if (rootIdx >= 0) break;
      }

      let color: number;
      if (rootIdx < 0) {
        color = 0xff000000;
      } else {
        const [cr, cg, cb] = rootColors[rootIdx];
        const t = 1 - iter / maxIterations;
        const shade = 0.22 + 0.78 * Math.sqrt(Math.max(0, t));
        const r = (cr * shade) | 0;
        const g = (cg * shade) | 0;
        const b = (cb * shade) | 0;
        color = (255 << 24) | (b << 16) | (g << 8) | r;
      }

      buf32[py * width + px] = color;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function inMainCardioid(x: number, y: number): boolean {
  const xm = x - 0.25;
  const q = xm * xm + y * y;
  return q * (q + xm) <= 0.25 * y * y;
}

function inPeriod2Bulb(x: number, y: number): boolean {
  const xp = x + 1;
  return xp * xp + y * y <= 0.0625;
}
