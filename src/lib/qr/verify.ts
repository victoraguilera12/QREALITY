import jsQR from "jsqr";

/**
 * jsQR's binariser works on 8x8 pixel blocks, so its success depends on how the
 * module size lands against that grid — not simply on having more pixels. A
 * single scale produces false negatives on sparse shapes, so try a few and
 * accept the first that reads, the way a phone succeeds once you move it.
 */
const SCALES = [12, 10, 16];
const MAX_SIDE = 1600;

/**
 * Decodes the rendered SVG the same way a scanner would. Styling can pass a
 * contrast check and still be unreadable — an oversized logo against a low
 * correction level is the common case — so this reads the real output rather
 * than trusting the settings.
 *
 * Returns null when the check itself could not run.
 */
export async function verifyScannable(
  svg: string,
  expected: string,
  span: number,
): Promise<boolean | null> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("rasterize failed"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    // Deliberately not willReadFrequently: that backend antialiases thin
    // shapes badly enough to fail codes that scan fine.
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    for (const scale of SCALES) {
      const side = Math.min(span * scale, MAX_SIDE);
      canvas.width = side;
      canvas.height = side;
      ctx.drawImage(img, 0, 0, side, side);
      const pixels = ctx.getImageData(0, 0, side, side);
      if (jsQR(pixels.data, side, side)?.data === expected) return true;
    }
    return false;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
