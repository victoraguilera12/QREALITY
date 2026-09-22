import { QUIET_ZONE, type ModuleShape, type QrDesign } from "./design";
import { finderOrigins, inFinder, isDark, type QrMatrix } from "./matrix";

function moduleShapeMarkup(
  shape: ModuleShape,
  x: number,
  y: number,
  fill: string,
): string {
  if (shape === "dot") {
    return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5" fill="${fill}"/>`;
  }
  const rx = shape === "rounded" ? 0.28 : 0;
  return `<rect x="${x}" y="${y}" width="1" height="1" rx="${rx}" fill="${fill}"/>`;
}

function finderMarkup(
  shape: ModuleShape,
  fx: number,
  fy: number,
  fill: string,
): string {
  if (shape === "dot") {
    return (
      `<circle cx="${fx + 3.5}" cy="${fy + 3.5}" r="3" fill="none" stroke="${fill}" stroke-width="1"/>` +
      `<circle cx="${fx + 3.5}" cy="${fy + 3.5}" r="1.5" fill="${fill}"/>`
    );
  }
  const outerR = shape === "rounded" ? 1.8 : 0;
  const innerR = shape === "rounded" ? 0.8 : 0;
  return (
    `<rect x="${fx + 0.5}" y="${fy + 0.5}" width="6" height="6" rx="${outerR}" fill="none" stroke="${fill}" stroke-width="1"/>` +
    `<rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" rx="${innerR}" fill="${fill}"/>`
  );
}

export function renderSvg(matrix: QrMatrix, design: QrDesign): string {
  const span = matrix.size + QUIET_ZONE * 2;
  const parts: string[] = [];

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!isDark(matrix, x, y)) continue;
      if (inFinder(matrix.size, x, y)) continue;
      parts.push(
        moduleShapeMarkup(design.shape, x + QUIET_ZONE, y + QUIET_ZONE, design.fg),
      );
    }
  }

  for (const [fx, fy] of finderOrigins(matrix.size)) {
    parts.push(
      finderMarkup(design.shape, fx + QUIET_ZONE, fy + QUIET_ZONE, design.fg),
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" width="${span * 16}" height="${span * 16}" shape-rendering="geometricPrecision">` +
    `<rect width="${span}" height="${span}" fill="${design.bg}"/>` +
    parts.join("") +
    `</svg>`
  );
}
