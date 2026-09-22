import * as THREE from "three";
import type { Outline } from "../qr/outline";

const HALF_PI = Math.PI / 2;

/**
 * Outline points in three.js space (y up), so they mirror the SVG renderer:
 * a point at SVG local (dx, dy) is world local (dx, -dy).
 */
export function outlinePoints(
  o: Outline,
  size: number,
  segments: number,
): THREE.Vector2[] {
  if (o.kind === "circle") {
    const r = o.r * size;
    const n = Math.max(8, segments * 4);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    });
  }
  if (o.kind === "poly") {
    return o.pts
      .map(([x, y]) => new THREE.Vector2(x * size, -y * size))
      .reverse();
  }

  const h = size / 2;
  const [tl, tr, br, bl] = o.radii.map((r) => Math.min(r, 0.5) * size);
  const pts: THREE.Vector2[] = [];
  const corner = (cx: number, cy: number, r: number, from: number) => {
    if (r <= 0) {
      pts.push(new THREE.Vector2(cx, cy));
      return;
    }
    for (let i = 0; i <= segments; i++) {
      const a = from + (i / segments) * HALF_PI;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  };

  // Counter-clockwise from the bottom-right corner.
  corner(h - br, -h + br, br, -HALF_PI);
  corner(h - tr, h - tr, tr, 0);
  corner(-h + tl, h - tl, tl, HALF_PI);
  corner(-h + bl, -h + bl, bl, Math.PI);
  return pts;
}

export function outlineToShape(
  o: Outline,
  size: number,
  segments: number,
): THREE.Shape {
  return new THREE.Shape(outlinePoints(o, size, segments));
}

/** [height fraction, footprint scale] samples from base to tip. */
export type Profile = Array<[number, number]>;

export const PROFILE_SEGMENTS: Record<string, number> = {
  square: 1,
  rounded: 3,
  dot: 5,
  diamond: 1,
  leaf: 4,
  classy: 4,
  circle: 5,
};

/**
 * Lofts a 2D outline along a vertical profile: one base footprint, scaled at
 * each profile step, walled together. Unit footprint, z from 0 to 1.
 */
export function profiledGeometry(
  outline: Outline,
  profile: Profile,
  segments: number,
): THREE.BufferGeometry {
  const pts = outlinePoints(outline, 1, segments);
  const n = pts.length;
  const faces = THREE.ShapeUtils.triangulateShape(pts, []);
  const verts: number[] = [];

  const push = (p: THREE.Vector2, scale: number, z: number) =>
    verts.push(p.x * scale, p.y * scale, z);

  for (let s = 0; s < profile.length - 1; s++) {
    const [z0, k0] = profile[s];
    const [z1, k1] = profile[s + 1];
    if (k0 === k1 && z0 === z1) continue;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if (k1 === 0) {
        push(a, k0, z0);
        push(b, k0, z0);
        verts.push(0, 0, z1);
      } else if (k0 === 0) {
        verts.push(0, 0, z0);
        push(b, k1, z1);
        push(a, k1, z1);
      } else {
        push(a, k0, z0);
        push(b, k0, z0);
        push(b, k1, z1);
        push(a, k0, z0);
        push(b, k1, z1);
        push(a, k1, z1);
      }
    }
  }

  const cap = (scale: number, z: number, up: boolean) => {
    for (const f of faces) {
      const tri = up ? f : [f[2], f[1], f[0]];
      for (const idx of tri) push(pts[idx], scale, z);
    }
  };
  cap(profile[0][1], profile[0][0], false);
  const top = profile[profile.length - 1];
  if (top[1] > 0) cap(top[1], top[0], true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

/** The 7x7 finder ring stays a straight prism: a tapered ring reads as a defect. */
export function frameGeometry(
  outer: Outline,
  inner: Outline,
  segments: number,
): THREE.ExtrudeGeometry {
  const shape = outlineToShape(outer, 7, segments);
  const hole = new THREE.Path(outlinePoints(inner, 5, segments).reverse());
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: segments,
  });
}
