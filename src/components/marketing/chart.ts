/** Tiny chart helpers for the landing page's illustrative product visuals. */

export type Point = [x: number, y: number];

/** Places `values` across `width`, mapping the [min, max] domain into [top, bottom] of `height`. */
export function toPoints(values: number[], { width, height, min, max, padX = 0, padY = 0 }: {
  width: number;
  height: number;
  min: number;
  max: number;
  padX?: number;
  padY?: number;
}): Point[] {
  const step = (width - padX * 2) / (values.length - 1);
  return values.map((v, i) => [padX + i * step, height - padY - ((v - min) / (max - min)) * (height - padY * 2)]);
}

/** A smooth line through the points (Catmull–Rom converted to cubic Béziers). */
export function smoothPath(points: Point[], tension = 0.18) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
