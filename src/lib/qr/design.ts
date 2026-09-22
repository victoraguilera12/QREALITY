import type { EccLevel } from "./matrix";
import type { BodyShape, EyeBallShape, EyeFrameShape } from "./outline";

export type ColorMode = "single" | "gradient";
export type GradientType = "linear" | "radial";

/** Vertical profile of an extruded module. */
export type Profile3D =
  | "prism"
  | "bevel"
  | "frustum"
  | "pyramid"
  | "dome"
  | "ziggurat";

export type Logo = {
  /** Data URL of the uploaded image. */
  src: string;
  /** Width as a fraction of the code, excluding the quiet zone. */
  size: number;
  /** Clear the modules underneath so the logo never fights the pattern. */
  clearSpace: boolean;
};

export type QrDesign = {
  text: string;
  ecc: EccLevel;

  body: BodyShape;
  eyeFrame: EyeFrameShape;
  eyeBall: EyeBallShape;

  colorMode: ColorMode;
  fg: string;
  gradientTo: string;
  gradientType: GradientType;
  /** Degrees, 0 = left to right. */
  gradientAngle: number;
  bg: string;
  /** null follows the body colour. */
  eyeFrameColor: string | null;
  eyeBallColor: string | null;

  logo: Logo | null;

  profile: Profile3D;
  /** Extrusion height, in modules-as-units. */
  depth: number;
  /** Plate thickness, in modules-as-units. */
  plate: number;
};

export const QUIET_ZONE = 4;

export const DEFAULT_DESIGN: QrDesign = {
  text: "https://astro.build",
  ecc: "M",
  body: "rounded",
  eyeFrame: "rounded",
  eyeBall: "rounded",
  colorMode: "single",
  fg: "#0f172a",
  gradientTo: "#22c55e",
  gradientType: "linear",
  gradientAngle: 45,
  bg: "#f8fafc",
  eyeFrameColor: null,
  eyeBallColor: null,
  logo: null,
  profile: "prism",
  depth: 1.6,
  plate: 0.8,
};

export type Preset = { name: string; fg: string; bg: string };

export const PRESETS: Preset[] = [
  { name: "Terminal", fg: "#22c55e", bg: "#0f172a" },
  { name: "Paper", fg: "#0f172a", bg: "#f8fafc" },
  { name: "Slate", fg: "#f8fafc", bg: "#1e293b" },
  { name: "Ember", fg: "#f8fafc", bg: "#7c2d12" },
  { name: "Cobalt", fg: "#f8fafc", bg: "#1e3a8a" },
  { name: "Filament", fg: "#0f172a", bg: "#facc15" },
];

export const eyeFrameColorOf = (d: QrDesign) => d.eyeFrameColor ?? d.fg;
export const eyeBallColorOf = (d: QrDesign) => d.eyeBallColor ?? d.fg;

/** Half-width of the logo's clear zone, in modules. */
export function logoClearRadius(design: QrDesign, size: number): number {
  if (!design.logo || !design.logo.clearSpace) return 0;
  return (design.logo.size * size) / 2 + 0.6;
}

export function inLogoZone(
  design: QrDesign,
  size: number,
  x: number,
  y: number,
): boolean {
  const r = logoClearRadius(design, size);
  if (r <= 0) return false;
  const c = (size - 1) / 2;
  return Math.abs(x - c) <= r && Math.abs(y - c) <= r;
}
