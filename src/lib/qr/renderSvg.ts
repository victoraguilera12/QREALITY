import {
  QUIET_ZONE,
  eyeBallColorOf,
  eyeFrameColorOf,
  inLogoZone,
  type QrDesign,
} from "./design";
import { finderOrigins, inFinder, isDark, type QrMatrix } from "./matrix";
import {
  BODY_OUTLINES,
  EYE_BALL_OUTLINES,
  EYE_FRAME_OUTLINES,
  outlinePath,
} from "./outline";

const BODY_GRADIENT = "qr-body-gradient";

function gradientDefs(design: QrDesign, span: number): string {
  if (design.colorMode !== "gradient") return "";
  const stops = `<stop offset="0%" stop-color="${design.fg}"/><stop offset="100%" stop-color="${design.gradientTo}"/>`;
  if (design.gradientType === "radial") {
    return `<radialGradient id="${BODY_GRADIENT}" gradientUnits="userSpaceOnUse" cx="${span / 2}" cy="${span / 2}" r="${span / 2}">${stops}</radialGradient>`;
  }
  const rad = (design.gradientAngle * Math.PI) / 180;
  const hx = (Math.cos(rad) * span) / 2;
  const hy = (Math.sin(rad) * span) / 2;
  const c = span / 2;
  return `<linearGradient id="${BODY_GRADIENT}" gradientUnits="userSpaceOnUse" x1="${c - hx}" y1="${c - hy}" x2="${c + hx}" y2="${c + hy}">${stops}</linearGradient>`;
}

const bodyFill = (design: QrDesign) =>
  design.colorMode === "gradient" ? `url(#${BODY_GRADIENT})` : design.fg;

export function renderSvg(matrix: QrMatrix, design: QrDesign): string {
  const span = matrix.size + QUIET_ZONE * 2;
  const body: string[] = [];

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!isDark(matrix, x, y)) continue;
      if (inFinder(matrix.size, x, y)) continue;
      if (inLogoZone(design, matrix.size, x, y)) continue;
      body.push(
        outlinePath(
          BODY_OUTLINES[design.body],
          x + QUIET_ZONE + 0.5,
          y + QUIET_ZONE + 0.5,
          1,
        ),
      );
    }
  }

  const frame = EYE_FRAME_OUTLINES[design.eyeFrame];
  const frames: string[] = [];
  const balls: string[] = [];
  for (const [fx, fy] of finderOrigins(matrix.size)) {
    const cx = fx + QUIET_ZONE + 3.5;
    const cy = fy + QUIET_ZONE + 3.5;
    frames.push(outlinePath(frame.outer, cx, cy, 7));
    frames.push(outlinePath(frame.inner, cx, cy, 5));
    balls.push(outlinePath(EYE_BALL_OUTLINES[design.eyeBall], cx, cy, 3));
  }

  const logo = design.logo
    ? (() => {
        const w = design.logo.size * matrix.size;
        const at = QUIET_ZONE + (matrix.size - w) / 2;
        return `<image href="${design.logo.src}" x="${at}" y="${at}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet"/>`;
      })()
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" width="${span * 16}" height="${span * 16}" shape-rendering="geometricPrecision">` +
    `<defs>${gradientDefs(design, span)}</defs>` +
    `<rect width="${span}" height="${span}" fill="${design.bg}"/>` +
    `<path d="${body.join("")}" fill="${bodyFill(design)}"/>` +
    `<path d="${frames.join("")}" fill="${eyeFrameColorOf(design)}" fill-rule="evenodd"/>` +
    `<path d="${balls.join("")}" fill="${eyeBallColorOf(design)}"/>` +
    logo +
    `</svg>`
  );
}
