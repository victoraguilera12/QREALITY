function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type Scannability = {
  ratio: number;
  level: "good" | "warn" | "bad";
  message: string;
};

/** Scanners need the dark modules clearly darker than the plate. */
export function scannability(fg: string, bg: string): Scannability {
  const ratio = contrastRatio(fg, bg);
  if (luminance(fg) > luminance(bg)) {
    return {
      ratio,
      level: "warn",
      message: "Módulos más claros que el fondo: algunos lectores fallan",
    };
  }
  if (ratio >= 7)
    return { ratio, level: "good", message: "Contraste óptimo para escaneo" };
  if (ratio >= 4)
    return { ratio, level: "warn", message: "Contraste justo, prueba el escaneo" };
  return { ratio, level: "bad", message: "Contraste insuficiente, no escaneará" };
}
