import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Viewport, { type ViewportHandle } from "./Viewport";
import {
  DEFAULT_DESIGN,
  PRESETS,
  QUIET_ZONE,
  eyeBallColorOf,
  eyeFrameColorOf,
  type QrDesign,
} from "../../lib/qr/design";
import { createMatrix, type EccLevel, type QrMatrix } from "../../lib/qr/matrix";
import { renderSvg } from "../../lib/qr/renderSvg";
import { scannability } from "../../lib/qr/contrast";
import { verifyScannable } from "../../lib/qr/verify";
import { brandTileDataUrl } from "../../lib/qr/brandLogo";
import type { Brand } from "../../lib/qr/brands";
import LogoGallery from "./LogoGallery";
import {
  downloadPng,
  downloadStl,
  downloadSvg,
} from "../../lib/export/download";
import {
  BALL_OPTIONS,
  BODY_OPTIONS,
  FRAME_OPTIONS,
  OptionGrid,
  SOLID_OPTIONS,
} from "./pickers";
import {
  solidFootprint,
  solidHeight,
  type Solid3D,
} from "../../lib/three/solids";
import {
  AlertIcon,
  CheckIcon,
  ChevronIcon,
  CubeIcon,
  DownloadIcon,
  ImageIcon,
  LinkIcon,
  OrbitIcon,
  SquareIcon,
  TrashIcon,
} from "./icons";

type SectionId = "content" | "colors" | "logo" | "design" | "model";

const ECC: Array<{ id: EccLevel; label: string }> = [
  { id: "L", label: "L" },
  { id: "M", label: "M" },
  { id: "Q", label: "Q" },
  { id: "H", label: "H" },
];

const ECC_HINT: Record<EccLevel, string> = {
  L: "7% de recuperación",
  M: "15% de recuperación",
  Q: "25% de recuperación",
  H: "30% de recuperación",
};

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 1_500_000;

function Section({
  id,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  hint?: string;
  open: SectionId | null;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 py-3 text-left"
      >
        <span className="font-mono text-xs tracking-wide text-foreground uppercase">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {hint && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {hint}
            </span>
          )}
          <ChevronIcon
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="truncate font-mono text-xs text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto font-mono text-[10px] text-muted-foreground/70 uppercase">
        {value}
      </span>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-[11px] text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-9 w-full cursor-pointer accent-[#22c55e]"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <Label>{label}</Label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
          checked ? "bg-accent" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-[left] duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function QrStudio() {
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [printMm, setPrintMm] = useState(60);
  const [open, setOpen] = useState<SectionId | null>("content");
  const [logoError, setLogoError] = useState<string | null>(null);
  const viewportRef = useRef<ViewportHandle>(null);
  const lastMatrix = useRef<QrMatrix | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const deferredText = useDeferredValue(design.text);

  const { matrix, problem } = useMemo(() => {
    const text = deferredText.trim();
    if (!text) return { matrix: lastMatrix.current, problem: "empty" as const };
    try {
      const m = createMatrix(text, design.ecc);
      lastMatrix.current = m;
      return { matrix: m, problem: null };
    } catch {
      return { matrix: lastMatrix.current, problem: "toolong" as const };
    }
  }, [deferredText, design.ecc]);

  const svg = useMemo(
    () => (matrix ? renderSvg(matrix, design) : ""),
    [matrix, design],
  );

  const scan = scannability(design.fg, design.bg);
  const set = <K extends keyof QrDesign>(key: K, value: QrDesign[K]) =>
    setDesign((d) => ({ ...d, [key]: value }));

  const is3d = mode === "3d";
  const span = matrix ? matrix.size + QUIET_ZONE * 2 : 0;

  const [decoded, setDecoded] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const expected = deferredText.trim();
    if (!svg || !expected) return;
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      const result = await verifyScannable(svg, expected, span);
      if (cancelled) return;
      setDecoded(result);
      setChecking(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [svg, span, deferredText]);

  const status: {
    level: "good" | "warn" | "bad" | "idle";
    message: string;
  } = checking
    ? { level: "idle", message: "Verificando lectura…" }
    : decoded === false
      ? {
          level: "bad",
          message:
            "No se pudo leer: reduce el logo o sube la corrección de errores",
        }
      : scan.level === "bad"
        ? { level: "bad", message: scan.message }
        : scan.level === "warn"
          ? { level: "warn", message: scan.message }
          : decoded === true
            ? { level: "good", message: "Verificado: el código se lee bien" }
            : { level: "warn", message: scan.message };
  const customEyes =
    design.eyeFrameColor !== null || design.eyeBallColor !== null;

  const toggleSection = (id: SectionId) =>
    setOpen((current) => (current === id ? null : id));

  const switchMode = (next: "2d" | "3d") => {
    setMode(next);
    if (next === "3d") setOpen("model");
  };

  /** Each body has its own natural proportions, so retune the height with it. */
  const pickSolid = (next: Solid3D) =>
    setDesign((d) => ({ ...d, solid: next, bodyHeight: solidHeight(next, span) }));

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Solo PNG, JPG o WebP");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("Máximo 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoError(null);
      setDesign((d) => ({
        ...d,
        ecc: "H",
        logo: {
          src: String(reader.result),
          size: d.logo?.size ?? 0.22,
          clearSpace: d.logo?.clearSpace ?? true,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const pickBrand = (brand: Brand) =>
    setDesign((d) => ({
      ...d,
      ecc: "H",
      logo: {
        src: brandTileDataUrl(brand),
        brand: brand.slug,
        size: d.logo?.size ?? 0.22,
        clearSpace: d.logo?.clearSpace ?? true,
      },
    }));

  const handleStl = () => {
    const geometry = viewportRef.current?.exportGeometry();
    // Round bodies overshoot the code's span, so scale by what is actually
    // the widest part or the print would come out oversized.
    if (geometry)
      downloadStl(
        geometry,
        solidFootprint(design.solid, span),
        printMm,
        "qr-studio.stl",
      );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
      <aside className="order-2 rounded-xl border border-border bg-card px-6 lg:order-1 lg:h-[640px] lg:overflow-y-auto">
        <Section
          id="content"
          title="Contenido"
          hint={matrix ? `v${(matrix.size - 17) / 4}` : undefined}
          open={open}
          onToggle={toggleSection}
        >
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 transition-colors duration-200 focus-within:border-accent">
            <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={design.text}
              onChange={(e) => set("text", e.target.value)}
              placeholder="https://tu-link.com"
              aria-label="Link o texto a codificar"
              spellCheck={false}
              className="min-h-11 w-full bg-transparent font-mono text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {problem === "empty" && (
            <p className="font-mono text-xs text-muted-foreground">
              Pega un link para generar tu código
            </p>
          )}
          {problem === "toolong" && (
            <p className="font-mono text-xs text-destructive">
              Demasiado contenido para este nivel de corrección
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label>Corrección de errores</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {ECC_HINT[design.ecc]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-background p-1">
              {ECC.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={design.ecc === e.id}
                  onClick={() => set("ecc", e.id)}
                  className={`min-h-11 cursor-pointer rounded-md font-mono text-sm transition-colors duration-200 ${
                    design.ecc === e.id
                      ? "bg-accent text-on-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="colors"
          title="Colores"
          hint={design.colorMode === "gradient" ? "degradado" : "sólido"}
          open={open}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const active =
                p.fg === design.fg &&
                p.bg === design.bg &&
                design.colorMode === "single";
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setDesign((d) => ({
                      ...d,
                      fg: p.fg,
                      bg: p.bg,
                      colorMode: "single",
                    }))
                  }
                  className={`group flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2 transition-colors duration-200 ${
                    active
                      ? "border-accent"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span
                    className="size-5 shrink-0 rounded border border-border"
                    style={{
                      background: `linear-gradient(135deg, ${p.bg} 50%, ${p.fg} 50%)`,
                    }}
                  />
                  <span className="truncate font-mono text-xs text-muted-foreground group-hover:text-foreground">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
            {(
              [
                ["single", "Sólido"],
                ["gradient", "Degradado"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={design.colorMode === id}
                onClick={() => set("colorMode", id)}
                className={`min-h-11 cursor-pointer rounded-md font-mono text-sm transition-colors duration-200 ${
                  design.colorMode === id
                    ? "bg-accent text-on-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <ColorRow
              label={design.colorMode === "gradient" ? "Desde" : "Módulos"}
              value={design.fg}
              onChange={(v) => set("fg", v)}
            />
            {design.colorMode === "gradient" && (
              <>
                <ColorRow
                  label="Hasta"
                  value={design.gradientTo}
                  onChange={(v) => set("gradientTo", v)}
                />
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
                  {(
                    [
                      ["linear", "Lineal"],
                      ["radial", "Radial"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={design.gradientType === id}
                      onClick={() => set("gradientType", id)}
                      className={`min-h-11 cursor-pointer rounded-md font-mono text-xs transition-colors duration-200 ${
                        design.gradientType === id
                          ? "bg-accent text-on-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {design.gradientType === "linear" && (
                  <Slider
                    label="Ángulo"
                    value={design.gradientAngle}
                    min={0}
                    max={360}
                    step={15}
                    suffix="°"
                    onChange={(v) => set("gradientAngle", v)}
                  />
                )}
              </>
            )}
            <ColorRow
              label="Fondo"
              value={design.bg}
              onChange={(v) => set("bg", v)}
            />
          </div>

          <div className="border-t border-border pt-2">
            <Toggle
              label="Color propio de ojos"
              checked={customEyes}
              onChange={(on) =>
                setDesign((d) => ({
                  ...d,
                  eyeFrameColor: on ? eyeFrameColorOf(d) : null,
                  eyeBallColor: on ? eyeBallColorOf(d) : null,
                }))
              }
            />
            {customEyes && (
              <div className="space-y-2 pt-1">
                <ColorRow
                  label="Marco"
                  value={eyeFrameColorOf(design)}
                  onChange={(v) => set("eyeFrameColor", v)}
                />
                <ColorRow
                  label="Pupila"
                  value={eyeBallColorOf(design)}
                  onChange={(v) => set("eyeBallColor", v)}
                />
              </div>
            )}
          </div>
        </Section>

        <Section
          id="logo"
          title="Logo"
          hint={design.logo ? "activo" : undefined}
          open={open}
          onToggle={toggleSection}
        >
          <input
            ref={fileRef}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => onLogoFile(e.target.files?.[0])}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={!design.logo}
              onClick={() => setDesign((d) => ({ ...d, logo: null }))}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border font-mono text-xs transition-colors duration-200 ${
                design.logo
                  ? "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  : "border-accent bg-accent/10 text-accent"
              }`}
            >
              Sin logo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border font-mono text-xs transition-colors duration-200 ${
                design.logo && !design.logo.brand
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="size-4" />
              Usa imagen
            </button>
          </div>

          <LogoGallery selected={design.logo?.brand} onPick={pickBrand} />

          {design.logo && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
                <img
                  src={design.logo.src}
                  alt="Logo seleccionado"
                  className="size-12 shrink-0 rounded object-contain"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11 cursor-pointer font-mono text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => setDesign((d) => ({ ...d, logo: null }))}
                  aria-label="Quitar logo"
                  className="ml-auto flex min-h-11 cursor-pointer items-center gap-1 px-2 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:text-destructive"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
              <Slider
                label="Tamaño"
                value={Math.round(design.logo.size * 100)}
                min={10}
                max={32}
                step={1}
                suffix="%"
                onChange={(v) =>
                  setDesign((d) =>
                    d.logo ? { ...d, logo: { ...d.logo, size: v / 100 } } : d,
                  )
                }
              />
              <Toggle
                label="Despejar módulos detrás"
                checked={design.logo.clearSpace}
                onChange={(on) =>
                  setDesign((d) =>
                    d.logo ? { ...d, logo: { ...d.logo, clearSpace: on } } : d,
                  )
                }
              />
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                Con logo conviene el nivel H: recupera hasta un 30% del código
                tapado.
              </p>
            </div>
          )}
          {logoError && (
            <p className="font-mono text-xs text-destructive">{logoError}</p>
          )}
        </Section>

        <Section
          id="design"
          title="Diseño"
          open={open}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            <Label>Cuerpo</Label>
            <OptionGrid
              options={BODY_OPTIONS}
              value={design.body}
              onChange={(v) => set("body", v)}
              label="Forma del cuerpo"
            />
          </div>
          <div className="space-y-2">
            <Label>Marco del ojo</Label>
            <OptionGrid
              options={FRAME_OPTIONS}
              value={design.eyeFrame}
              onChange={(v) => set("eyeFrame", v)}
              label="Forma del marco del ojo"
              columns={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Pupila del ojo</Label>
            <OptionGrid
              options={BALL_OPTIONS}
              value={design.eyeBall}
              onChange={(v) => set("eyeBall", v)}
              label="Forma de la pupila del ojo"
              columns={4}
            />
          </div>
        </Section>

        <Section
          id="model"
          title="Modelo 3D"
          hint={SOLID_OPTIONS.find((s) => s.id === design.solid)?.label}
          open={open}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            <Label>Figura del objeto</Label>
            <OptionGrid
              options={SOLID_OPTIONS}
              value={design.solid}
              onChange={pickSolid}
              label="Figura del objeto"
            />
          </div>
          <Slider
            label="Relieve de los módulos"
            value={design.depth}
            min={0.4}
            max={4}
            step={0.1}
            suffix=" u"
            onChange={(v) => set("depth", v)}
          />
          <Slider
            label="Altura del cuerpo"
            value={design.bodyHeight}
            min={0.3}
            max={40}
            step={0.1}
            suffix=" u"
            onChange={(v) => set("bodyHeight", v)}
          />
          <Slider
            label="Tamaño de impresión"
            value={printMm}
            min={30}
            max={200}
            step={5}
            suffix=" mm"
            onChange={setPrintMm}
          />
          {!is3d && (
            <p className="font-mono text-[11px] text-muted-foreground">
              Cambia a la vista 3D para verlo en relieve.
            </p>
          )}
        </Section>

        <div
          className={`my-4 flex items-start gap-2 rounded-lg border p-3 ${
            status.level === "good"
              ? "border-accent/40 bg-accent/10"
              : status.level === "bad"
                ? "border-destructive/50 bg-destructive/10"
                : "border-border bg-muted"
          }`}
          aria-live="polite"
        >
          {status.level === "good" ? (
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <AlertIcon
              className={`mt-0.5 size-4 shrink-0 ${
                status.level === "bad"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            />
          )}
          <div className="space-y-0.5">
            <p className="text-sm text-card-foreground">{status.message}</p>
            <p className="font-mono text-xs text-muted-foreground">
              contraste {scan.ratio.toFixed(1)}:1
            </p>
          </div>
        </div>
      </aside>

      <section className="order-1 flex h-[460px] flex-col overflow-hidden rounded-xl border border-border bg-card sm:h-[560px] lg:order-2 lg:h-[640px]">
        <header className="flex items-center justify-between gap-4 border-b border-border p-4">
          <div
            role="radiogroup"
            aria-label="Modo de vista"
            className="flex gap-1 rounded-lg border border-border bg-background p-1"
          >
            {(
              [
                ["2d", "2D", SquareIcon],
                ["3d", "3D", CubeIcon],
              ] as const
            ).map(([id, label, Icon]) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => switchMode(id)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 font-mono text-sm transition-colors duration-200 ${
                    active
                      ? "bg-accent text-on-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="hidden items-center gap-2 font-mono text-xs text-muted-foreground sm:flex">
            <OrbitIcon
              className={`size-4 transition-opacity duration-300 ${
                is3d ? "text-accent opacity-100" : "opacity-40"
              }`}
            />
            {is3d ? "Arrastra para orbitar" : "Pulsa 3D para extruir"}
          </p>
        </header>

        <div className="relative flex-1">
          {matrix && (
            <Viewport
              ref={viewportRef}
              matrix={matrix}
              design={design}
              mode={mode}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border p-4">
          {is3d ? (
            <>
              <button
                type="button"
                onClick={handleStl}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 font-mono text-sm font-semibold text-on-accent transition-all duration-200 hover:-translate-y-px hover:opacity-90"
              >
                <DownloadIcon className="size-4" />
                STL para imprimir
              </button>
              {design.logo && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  el logo no va en la malla
                </span>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => downloadSvg(svg, "qr-studio.svg")}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 font-mono text-sm font-semibold text-on-accent transition-all duration-200 hover:-translate-y-px hover:opacity-90"
              >
                <DownloadIcon className="size-4" />
                SVG
              </button>
              <button
                type="button"
                onClick={() => downloadPng(svg, "qr-studio.png")}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-5 font-mono text-sm text-foreground transition-colors duration-200 hover:border-accent hover:text-accent"
              >
                <DownloadIcon className="size-4" />
                PNG
              </button>
            </>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {matrix ? `${matrix.size}×${matrix.size}` : ""}
            {is3d && ` · ${printMm}mm`}
          </span>
        </footer>
      </section>
    </div>
  );
}
