import { useDeferredValue, useMemo, useRef, useState } from "react";
import Viewport, { type ViewportHandle } from "./Viewport";
import {
  DEFAULT_DESIGN,
  PRESETS,
  QUIET_ZONE,
  type ModuleShape,
  type QrDesign,
} from "../../lib/qr/design";
import { createMatrix, type EccLevel, type QrMatrix } from "../../lib/qr/matrix";
import { renderSvg } from "../../lib/qr/renderSvg";
import { scannability } from "../../lib/qr/contrast";
import {
  downloadPng,
  downloadStl,
  downloadSvg,
} from "../../lib/export/download";
import {
  AlertIcon,
  CheckIcon,
  CubeIcon,
  DownloadIcon,
  LinkIcon,
  OrbitIcon,
  SquareIcon,
} from "./icons";

const SHAPES: Array<{ id: ModuleShape; label: string }> = [
  { id: "square", label: "Cuadrado" },
  { id: "rounded", label: "Redondeado" },
  { id: "dot", label: "Punto" },
];

const ECC: Array<{ id: EccLevel; label: string; hint: string }> = [
  { id: "L", label: "L", hint: "7% de recuperación" },
  { id: "M", label: "M", hint: "15% de recuperación" },
  { id: "Q", label: "Q", hint: "25% de recuperación" },
  { id: "H", label: "H", hint: "30% de recuperación" },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {hint && (
          <span className="font-mono text-xs text-muted-foreground/70">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-lg border border-border bg-background p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`min-h-11 cursor-pointer rounded-md px-3 font-mono text-sm transition-colors duration-200 ${
              active
                ? "bg-accent text-on-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
    <Field label={label} hint={`${value}${suffix}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-11 w-full cursor-pointer accent-[#22c55e]"
      />
    </Field>
  );
}

export default function QrStudio() {
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [printMm, setPrintMm] = useState(60);
  const viewportRef = useRef<ViewportHandle>(null);
  const lastMatrix = useRef<QrMatrix | null>(null);

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

  const handleStl = () => {
    const geometry = viewportRef.current?.exportGeometry();
    if (geometry) downloadStl(geometry, span, printMm, "qr-studio.stl");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="order-2 space-y-5 rounded-xl border border-border bg-card p-6 lg:order-1 lg:h-[640px] lg:overflow-y-auto">
        <Field label="Destino" hint={matrix ? `v${(matrix.size - 17) / 4}` : ""}>
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
        </Field>

        <Field label="Paleta">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const active = p.fg === design.fg && p.bg === design.bg;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    setDesign((d) => ({ ...d, fg: p.fg, bg: p.bg }))
                  }
                  aria-pressed={active}
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
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(
              [
                ["fg", "Módulos"],
                ["bg", "Placa"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2"
              >
                <input
                  type="color"
                  value={design[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={`Color de ${label.toLowerCase()}`}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Forma del módulo">
          <Segmented
            options={SHAPES}
            value={design.shape}
            onChange={(v) => set("shape", v)}
            label="Forma del módulo"
          />
        </Field>

        <Field
          label="Corrección de errores"
          hint={ECC.find((e) => e.id === design.ecc)?.hint}
        >
          <Segmented
            options={ECC}
            value={design.ecc}
            onChange={(v) => set("ecc", v)}
            label="Nivel de corrección de errores"
          />
        </Field>

        <div
          className="grid transition-[grid-template-rows] duration-500 ease-out"
          style={{ gridTemplateRows: is3d ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-5 border-t border-border pt-5">
              <Slider
                label="Relieve"
                value={design.depth}
                min={0.4}
                max={4}
                step={0.1}
                suffix=" u"
                onChange={(v) => set("depth", v)}
              />
              <Slider
                label="Grosor de placa"
                value={design.plate}
                min={0.3}
                max={3}
                step={0.1}
                suffix=" u"
                onChange={(v) => set("plate", v)}
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
            </div>
          </div>
        </div>

        <div
          className={`flex items-start gap-2 rounded-lg border p-3 ${
            scan.level === "good"
              ? "border-accent/40 bg-accent/10"
              : scan.level === "warn"
                ? "border-border bg-muted"
                : "border-destructive/50 bg-destructive/10"
          }`}
        >
          {scan.level === "good" ? (
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <AlertIcon
              className={`mt-0.5 size-4 shrink-0 ${
                scan.level === "bad" ? "text-destructive" : "text-muted-foreground"
              }`}
            />
          )}
          <div className="space-y-0.5">
            <p className="text-sm text-card-foreground">{scan.message}</p>
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
                  onClick={() => setMode(id)}
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
                is3d ? "opacity-100 text-accent" : "opacity-40"
              }`}
            />
            {is3d ? "Arrastra para orbitar" : "Pulsa 3D para extruir"}
          </p>
        </header>

        <div className="relative flex-1">
          {matrix && <Viewport ref={viewportRef} matrix={matrix} design={design} mode={mode} />}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border p-4">
          {is3d ? (
            <button
              type="button"
              onClick={handleStl}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 font-mono text-sm font-semibold text-on-accent transition-all duration-200 hover:-translate-y-px hover:opacity-90"
            >
              <DownloadIcon className="size-4" />
              STL para imprimir
            </button>
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
            {matrix ? `${matrix.size}×${matrix.size} módulos` : ""}
            {is3d && ` · ${printMm}mm`}
          </span>
        </footer>
      </section>
    </div>
  );
}
