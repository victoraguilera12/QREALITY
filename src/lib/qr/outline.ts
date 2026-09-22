/**
 * Shape vocabulary shared by the SVG renderer and the three.js scene.
 * Everything is defined in a unit cell centred on the origin (-0.5..0.5),
 * so one definition drives both views and they cannot drift apart.
 */

export type Outline =
  | { kind: "rect"; radii: [number, number, number, number] }
  | { kind: "circle"; r: number }
  | { kind: "poly"; pts: Array<[number, number]> };

export type BodyShape =
  | "square"
  | "rounded"
  | "dot"
  | "diamond"
  | "leaf"
  | "classy";

export type EyeFrameShape = "square" | "rounded" | "classy" | "leaf";
export type EyeBallShape = "square" | "rounded" | "circle" | "classy";

/**
 * Stylised shapes are only as aggressive as a decoder tolerates. Every value
 * below is the softest setting that still round-trips through jsQR — a true
 * circular eye frame and a diamond eye ball never decode, so they are not
 * offered at all.
 */
const DIAMOND_REACH = 0.62;

const DIAMOND: Array<[number, number]> = [
  [0, -DIAMOND_REACH],
  [DIAMOND_REACH, 0],
  [0, DIAMOND_REACH],
  [-DIAMOND_REACH, 0],
];

export const BODY_OUTLINES: Record<BodyShape, Outline> = {
  square: { kind: "rect", radii: [0, 0, 0, 0] },
  rounded: { kind: "rect", radii: [0.28, 0.28, 0.28, 0.28] },
  dot: { kind: "circle", r: 0.5 },
  diamond: { kind: "poly", pts: DIAMOND },
  leaf: { kind: "rect", radii: [0.5, 0, 0.5, 0] },
  classy: { kind: "rect", radii: [0.5, 0, 0, 0] },
};

export const EYE_BALL_OUTLINES: Record<EyeBallShape, Outline> = {
  square: { kind: "rect", radii: [0, 0, 0, 0] },
  rounded: { kind: "rect", radii: [0.27, 0.27, 0.27, 0.27] },
  circle: { kind: "circle", r: 0.58 },
  classy: { kind: "rect", radii: [0.5, 0.5, 0, 0.5] },
};

/** Outer and inner edge of the 7x7 finder ring, in unit-cell space. */
export const EYE_FRAME_OUTLINES: Record<
  EyeFrameShape,
  { outer: Outline; inner: Outline }
> = {
  square: {
    outer: { kind: "rect", radii: [0, 0, 0, 0] },
    inner: { kind: "rect", radii: [0, 0, 0, 0] },
  },
  rounded: {
    outer: { kind: "rect", radii: [0.33, 0.33, 0.33, 0.33] },
    inner: { kind: "rect", radii: [0.26, 0.26, 0.26, 0.26] },
  },
  classy: {
    outer: { kind: "rect", radii: [0.45, 0.45, 0, 0.45] },
    inner: { kind: "rect", radii: [0.36, 0.36, 0, 0.36] },
  },
  leaf: {
    outer: { kind: "rect", radii: [0.3, 0, 0.3, 0] },
    inner: { kind: "rect", radii: [0.27, 0, 0.27, 0] },
  },
};

function arc(rx: number, x: number, y: number) {
  return `A${rx} ${rx} 0 0 1 ${x} ${y}`;
}

/**
 * SVG path for an outline, scaled to `size` and centred on (cx, cy).
 * Arcs stay true curves so the exported vector is resolution-independent.
 */
export function outlinePath(
  o: Outline,
  cx: number,
  cy: number,
  size: number,
): string {
  const h = size / 2;
  if (o.kind === "circle") {
    const r = o.r * size;
    return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  }
  if (o.kind === "poly") {
    return (
      "M" +
      o.pts.map(([px, py]) => `${cx + px * size} ${cy + py * size}`).join("L") +
      "Z"
    );
  }
  const [tl, tr, br, bl] = o.radii.map((r) => Math.min(r, 0.5) * size);
  const l = cx - h;
  const r = cx + h;
  const t = cy - h;
  const b = cy + h;
  return [
    `M${l + tl} ${t}`,
    `L${r - tr} ${t}`,
    tr ? arc(tr, r, t + tr) : "",
    `L${r} ${b - br}`,
    br ? arc(br, r - br, b) : "",
    `L${l + bl} ${b}`,
    bl ? arc(bl, l, b - bl) : "",
    `L${l} ${t + tl}`,
    tl ? arc(tl, l + tl, t) : "",
    "Z",
  ]
    .filter(Boolean)
    .join("");
}
