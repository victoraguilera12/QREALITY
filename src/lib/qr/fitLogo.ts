import { QUIET_ZONE, type QrDesign } from "./design";
import { createMatrix } from "./matrix";
import { renderSvg } from "./renderSvg";
import { verifyScannable } from "./verify";

const FLOOR = 0.1;
const STEP = 0.03;

/**
 * Largest logo size at or below `requested` that still decodes, or null when
 * even the smallest one fails.
 *
 * Error-correction capacity alone does not predict this: a logo is a solid
 * blob over the middle of the code, which hurts far more than its area
 * suggests and varies with the version, so the only reliable answer comes
 * from decoding candidates.
 */
export async function fitLogoSize(
  design: QrDesign,
  requested: number,
): Promise<number | null> {
  const text = design.text.trim();
  if (!text || !design.logo) return null;

  let matrix;
  try {
    matrix = createMatrix(text, design.ecc);
  } catch {
    return null;
  }
  const span = matrix.size + QUIET_ZONE * 2;

  for (let size = requested; size >= FLOOR - 1e-9; size -= STEP) {
    const rounded = Math.round(size * 100) / 100;
    const candidate: QrDesign = {
      ...design,
      logo: { ...design.logo, size: rounded },
    };
    const ok = await verifyScannable(
      renderSvg(matrix, candidate),
      text,
      span,
    );
    if (ok === true) return rounded;
  }
  return null;
}
