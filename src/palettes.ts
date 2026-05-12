export type Palette = (t: number) => [number, number, number];

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function makeGradient(stops: [number, number, number][]): Palette {
  const n = stops.length - 1;
  return (t) => {
    const s = clamp01(t) * n;
    const i = Math.min(Math.floor(s), n - 1);
    const f = s - i;
    const a = stops[i];
    const b = stops[i + 1];
    return [
      (a[0] + (b[0] - a[0]) * f) | 0,
      (a[1] + (b[1] - a[1]) * f) | 0,
      (a[2] + (b[2] - a[2]) * f) | 0,
    ];
  };
}

const electric = makeGradient([
  [3, 6, 22],
  [10, 40, 110],
  [40, 130, 220],
  [120, 220, 255],
  [240, 252, 255],
]);

const plasma = makeGradient([
  [13, 8, 135],
  [84, 2, 163],
  [156, 23, 158],
  [205, 75, 118],
  [237, 121, 83],
  [252, 168, 50],
  [240, 249, 33],
]);

const inferno = makeGradient([
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 193, 39],
  [252, 255, 164],
]);

const viridis = makeGradient([
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
]);

const mono = makeGradient([
  [0, 0, 0],
  [255, 255, 255],
]);

const palettes: Record<string, Palette> = {
  electric,
  plasma,
  inferno,
  viridis,
  mono,
};

export function getPalette(name: string): Palette {
  return palettes[name] ?? electric;
}
