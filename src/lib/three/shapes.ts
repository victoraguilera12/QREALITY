import * as THREE from "three";
import type { ModuleShape } from "../qr/design";

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): THREE.Shape {
  const s = new THREE.Shape();
  const radius = Math.min(r, w / 2, h / 2);
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.quadraticCurveTo(x + w, y, x + w, y + radius);
  s.lineTo(x + w, y + h - radius);
  s.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  s.lineTo(x + radius, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

function ringPath(cx: number, cy: number, r: number): THREE.Path {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

/** A module is ~1% of the plate on screen, so corners need very few segments. */
export const CURVE_SEGMENTS: Record<ModuleShape, number> = {
  square: 1,
  rounded: 4,
  dot: 14,
};

export function extrudeSettings(shape: ModuleShape) {
  return {
    depth: 1,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS[shape],
  };
}

/** Unit module: 1x1 footprint centred on origin, extruded from z=0 to z=1. */
export function moduleGeometry(shape: ModuleShape): THREE.ExtrudeGeometry {
  const settings = extrudeSettings(shape);
  if (shape === "dot") {
    const circle = new THREE.Shape();
    circle.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
    return new THREE.ExtrudeGeometry(circle, settings);
  }
  const r = shape === "rounded" ? 0.28 : 0;
  return new THREE.ExtrudeGeometry(
    roundedRect(-0.5, -0.5, 1, 1, r),
    settings,
  );
}

/**
 * The 7x7 finder as two solids (outer ring + centre), matching the SVG export
 * exactly so the 2D and 3D views read as the same object.
 * Local coords: 0..7 with origin at the finder's top-left module.
 */
export function finderShapes(shape: ModuleShape): THREE.Shape[] {
  if (shape === "dot") {
    const ring = new THREE.Shape();
    ring.absarc(3.5, 3.5, 3.5, 0, Math.PI * 2, false);
    ring.holes.push(ringPath(3.5, 3.5, 2.5));
    const centre = new THREE.Shape();
    centre.absarc(3.5, 3.5, 1.5, 0, Math.PI * 2, false);
    return [ring, centre];
  }
  const rounded = shape === "rounded";
  const ring = roundedRect(0, 0, 7, 7, rounded ? 2.3 : 0);
  const hole = roundedRect(1, 1, 5, 5, rounded ? 1.3 : 0);
  ring.holes.push(new THREE.Path(hole.getPoints(32)));
  const centre = roundedRect(2, 2, 3, 3, rounded ? 0.8 : 0);
  return [ring, centre];
}
