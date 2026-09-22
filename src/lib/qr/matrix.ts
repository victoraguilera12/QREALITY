import QRCode from "qrcode";

export type EccLevel = "L" | "M" | "Q" | "H";

export type QrMatrix = {
  size: number;
  /** Row-major, 1 = dark module. */
  data: Uint8Array;
};

export function createMatrix(text: string, ecc: EccLevel): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: ecc });
  return { size: qr.modules.size, data: Uint8Array.from(qr.modules.data) };
}

export function isDark(m: QrMatrix, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.size || y >= m.size) return false;
  return m.data[y * m.size + x] === 1;
}

/** The three 7x7 finder squares, whose top-left corners are fixed by the spec. */
export function finderOrigins(size: number): Array<[number, number]> {
  return [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
}

export function inFinder(size: number, x: number, y: number): boolean {
  return finderOrigins(size).some(
    ([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7,
  );
}
