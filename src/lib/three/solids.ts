import type { Outline } from "../qr/outline";
import type { Profile } from "./shapes";

export type Solid3D =
  | "slab"
  | "cube"
  | "pyramid"
  | "cylinder"
  | "hexagon"
  | "dome";

/** Straight-sided loft: the default for modules and for untapered bodies. */
export const PRISM: Profile = [
  [0, 1],
  [1, 1],
];

function hemisphere(steps = 8): Profile {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [t, Math.sqrt(Math.max(0, 1 - t * t))] as [number, number];
  });
}

const HEXAGON: Outline = {
  kind: "poly",
  pts: Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 0.5, Math.sin(a) * 0.5] as [number, number];
  }),
};

export type SolidSpec = {
  /** Footprint of the body, lofted downward from the QR face. */
  footprint: Outline;
  /**
   * Footprint width as a multiple of the code's span. Round and hexagonal
   * bodies must be wide enough to contain the square quiet zone, so they
   * overshoot the span rather than clipping its corners.
   */
  sizeFactor: number;
  profile: Profile;
  /** Suggested height, in modules-as-units. */
  height: (span: number) => number;
  segments: number;
};

const SQUARE: Outline = { kind: "rect", radii: [0, 0, 0, 0] };
const CIRCLE: Outline = { kind: "circle", r: 0.5 };

export const SOLIDS: Record<Solid3D, SolidSpec> = {
  slab: {
    footprint: SQUARE,
    sizeFactor: 1,
    profile: PRISM,
    height: () => 0.8,
    segments: 1,
  },
  cube: {
    footprint: SQUARE,
    sizeFactor: 1,
    profile: PRISM,
    height: (span) => span,
    segments: 1,
  },
  pyramid: {
    footprint: SQUARE,
    sizeFactor: 1,
    profile: [
      [0, 1],
      [1, 0.08],
    ],
    height: (span) => span * 0.55,
    segments: 1,
  },
  cylinder: {
    footprint: CIRCLE,
    sizeFactor: 1.46,
    profile: PRISM,
    height: () => 2.4,
    segments: 12,
  },
  hexagon: {
    footprint: HEXAGON,
    sizeFactor: 1.64,
    profile: PRISM,
    height: () => 2.4,
    segments: 1,
  },
  dome: {
    footprint: CIRCLE,
    sizeFactor: 1.46,
    profile: hemisphere(),
    height: (span) => span * 0.32,
    segments: 12,
  },
};

export const solidFootprint = (solid: Solid3D, span: number) =>
  SOLIDS[solid].sizeFactor * span;

export const solidHeight = (solid: Solid3D, span: number) =>
  SOLIDS[solid].height(span);
