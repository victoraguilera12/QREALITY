import type { EccLevel } from "./matrix";

export type ModuleShape = "square" | "rounded" | "dot";

export type QrDesign = {
  text: string;
  ecc: EccLevel;
  shape: ModuleShape;
  /** Module (dark) colour. */
  fg: string;
  /** Plate (light) colour. */
  bg: string;
  /** Extrusion height of a module, in modules-as-units. */
  depth: number;
  /** Plate thickness, in modules-as-units. */
  plate: number;
};

export const QUIET_ZONE = 4;

export const DEFAULT_DESIGN: QrDesign = {
  text: "https://astro.build",
  ecc: "M",
  shape: "rounded",
  fg: "#0f172a",
  bg: "#f8fafc",
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
