export type ParamDef =
  | { key: string; label: string; type: 'number'; default: number; step?: number; min?: number; max?: number }
  | { key: string; label: string; type: 'slider'; default: number; min: number; max: number; step?: number }
  | { key: string; label: string; type: 'select'; default: string; options: { value: string; label: string }[] };

export interface FractalDef {
  id: string;
  name: string;
  formula: string;
  params: ParamDef[];
}

const palettes = [
  { value: 'electric', label: 'Electric Blue' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'mono', label: 'Monochrome' },
];

const escapeTimeParams = (cx: number, cy: number, zoom = 1): ParamDef[] => [
  { key: 'maxIterations', label: 'Max iterations', type: 'slider', default: 256, min: 16, max: 2048, step: 16 },
  { key: 'centerX', label: 'Center X', type: 'number', default: cx, step: 0.01 },
  { key: 'centerY', label: 'Center Y', type: 'number', default: cy, step: 0.01 },
  { key: 'zoom', label: 'Zoom', type: 'number', default: zoom, step: 0.1, min: 0.0001 },
  { key: 'escapeRadius', label: 'Escape radius', type: 'number', default: 2, step: 0.1, min: 0 },
  { key: 'palette', label: 'Palette', type: 'select', default: 'electric', options: palettes },
];

export const fractals: FractalDef[] = [
  {
    id: 'mandelbrot',
    name: 'Mandelbrot Set',
    formula: 'zₙ₊₁ = zₙ² + c',
    params: escapeTimeParams(-0.5, 0),
  },
  {
    id: 'julia',
    name: 'Julia Set',
    formula: 'zₙ₊₁ = zₙ² + c',
    params: [
      { key: 'maxIterations', label: 'Max iterations', type: 'slider', default: 256, min: 16, max: 2048, step: 16 },
      { key: 'cReal', label: 'c (real)', type: 'number', default: -0.7, step: 0.01 },
      { key: 'cImag', label: 'c (imaginary)', type: 'number', default: 0.27015, step: 0.01 },
      { key: 'centerX', label: 'Center X', type: 'number', default: 0, step: 0.01 },
      { key: 'centerY', label: 'Center Y', type: 'number', default: 0, step: 0.01 },
      { key: 'zoom', label: 'Zoom', type: 'number', default: 1, step: 0.1, min: 0.0001 },
      { key: 'escapeRadius', label: 'Escape radius', type: 'number', default: 2, step: 0.1, min: 0 },
      { key: 'palette', label: 'Palette', type: 'select', default: 'plasma', options: palettes },
    ],
  },
  {
    id: 'burning-ship',
    name: 'Burning Ship',
    formula: 'zₙ₊₁ = (|Re zₙ| + i|Im zₙ|)² + c',
    params: escapeTimeParams(-0.5, -0.5),
  },
  {
    id: 'newton',
    name: 'Newton Fractal',
    formula: 'zₙ₊₁ = zₙ − f(zₙ) / f′(zₙ)',
    params: [
      {
        key: 'polynomial',
        label: 'Polynomial',
        type: 'select',
        default: 'z3-1',
        options: [
          { value: 'z3-1', label: 'z³ − 1' },
          { value: 'z4-1', label: 'z⁴ − 1' },
          { value: 'z5-1', label: 'z⁵ − 1' },
          { value: 'z6-1', label: 'z⁶ − 1' },
        ],
      },
      { key: 'maxIterations', label: 'Max iterations', type: 'slider', default: 50, min: 5, max: 500, step: 5 },
      { key: 'tolerance', label: 'Tolerance', type: 'number', default: 0.000001, step: 0.000001, min: 0 },
      { key: 'relaxation', label: 'Relaxation (a)', type: 'number', default: 1, step: 0.1 },
      { key: 'zoom', label: 'Zoom', type: 'number', default: 1, step: 0.1, min: 0.0001 },
      { key: 'palette', label: 'Palette', type: 'select', default: 'inferno', options: palettes },
    ],
  },
  {
    id: 'sierpinski',
    name: 'Sierpinski Triangle',
    formula: 'Chaos game · 3 vertices',
    params: [
      { key: 'depth', label: 'Depth', type: 'slider', default: 7, min: 1, max: 11, step: 1 },
      { key: 'rotation', label: 'Rotation (°)', type: 'slider', default: 0, min: 0, max: 360, step: 1 },
      { key: 'palette', label: 'Palette', type: 'select', default: 'mono', options: palettes },
    ],
  },
  {
    id: 'barnsley-fern',
    name: 'Barnsley Fern',
    formula: 'IFS · 4 affine maps',
    params: [
      { key: 'points', label: 'Points', type: 'slider', default: 100000, min: 1000, max: 1000000, step: 1000 },
      { key: 'stemBias', label: 'Stem bias', type: 'slider', default: 1, min: 0, max: 10, step: 1 },
      { key: 'palette', label: 'Palette', type: 'select', default: 'viridis', options: palettes },
    ],
  },
];

export function getDefaults(fractal: FractalDef): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const p of fractal.params) out[p.key] = p.default;
  return out;
}
