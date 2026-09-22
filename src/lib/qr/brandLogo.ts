import type { Brand } from "./brands";
import { contrastRatio } from "./contrast";

const GLYPH_LIGHT = "#ffffff";
const GLYPH_DARK = "#0f172a";

/**
 * Brands overwhelmingly draw a white glyph on their colour — YouTube and
 * WhatsApp do, even though a plain contrast comparison would pick dark. Only
 * genuinely pale brands (Snapchat's yellow) flip, so the threshold sits low
 * enough to follow the convention rather than override it.
 */
export function glyphColorFor(hex: string): string {
  return contrastRatio(GLYPH_LIGHT, hex) < 1.6 ? GLYPH_DARK : GLYPH_LIGHT;
}

/**
 * Draws a brand tile and returns it as a PNG data URL, so a gallery pick goes
 * through exactly the same path as an uploaded file — SVG export, PNG export
 * and the 3D texture all stay identical.
 */
export function brandTileDataUrl(brand: Brand, size = 256): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = brand.hex;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  const glyph = size * 0.56;
  const scale = glyph / 24;
  ctx.save();
  ctx.translate((size - glyph) / 2, (size - glyph) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = glyphColorFor(brand.hex);
  ctx.fill(new Path2D(brand.path));
  ctx.restore();

  return canvas.toDataURL("image/png");
}
