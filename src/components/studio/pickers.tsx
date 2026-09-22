import type { ReactNode } from "react";
import {
  BODY_OUTLINES,
  EYE_BALL_OUTLINES,
  EYE_FRAME_OUTLINES,
  outlinePath,
  type BodyShape,
  type EyeBallShape,
  type EyeFrameShape,
} from "../../lib/qr/outline";
import { SOLIDS, type Solid3D } from "../../lib/three/solids";

export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 3,
}: {
  options: Array<{ id: T; label: string; art: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.label}
            onClick={() => onChange(o.id)}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors duration-200 ${
              active
                ? "border-accent bg-accent/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <span
              className={
                active ? "text-accent" : "text-muted-foreground"
              }
            >
              {o.art}
            </span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const PATTERN = [
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
];

function BodyArt({ shape }: { shape: BodyShape }) {
  const d = PATTERN.flatMap((row, y) =>
    row.map((on, x) =>
      on ? outlinePath(BODY_OUTLINES[shape], x + 0.5, y + 0.5, 1) : "",
    ),
  ).join("");
  return (
    <svg viewBox="0 0 3 3" className="size-7" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function FrameArt({ shape }: { shape: EyeFrameShape }) {
  const spec = EYE_FRAME_OUTLINES[shape];
  const d =
    outlinePath(spec.outer, 3.5, 3.5, 7) + outlinePath(spec.inner, 3.5, 3.5, 5);
  return (
    <svg viewBox="0 0 7 7" className="size-7" aria-hidden="true">
      <path d={d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function BallArt({ shape }: { shape: EyeBallShape }) {
  return (
    <svg viewBox="0 0 3 3" className="size-7" aria-hidden="true">
      <path
        d={outlinePath(EYE_BALL_OUTLINES[shape], 1.5, 1.5, 3)}
        fill="currentColor"
      />
    </svg>
  );
}

/** Top face plus side silhouette, both straight from the solid's own spec. */
function SolidArt({ solid }: { solid: Solid3D }) {
  const spec = SOLIDS[solid];
  const W = 18;
  const cx = 12;
  const topY = 6;
  const ry = W * 0.16;
  const ratio = spec.height(33) / 33;
  const drawH = Math.min(13, Math.max(3, ratio * 16));

  const left = spec.profile.map(
    ([t, s]) => `${cx - (W / 2) * s} ${topY + drawH * t}`,
  );
  const right = [...spec.profile]
    .reverse()
    .map(([t, s]) => `${cx + (W / 2) * s} ${topY + drawH * t}`);

  const face =
    spec.footprint.kind === "circle" ? (
      <ellipse cx={cx} cy={topY} rx={W / 2} ry={ry} />
    ) : spec.footprint.kind === "poly" ? (
      <polygon
        points={spec.footprint.pts
          .map(([x, y]) => `${cx + x * W},${topY + y * ry * 2}`)
          .join(" ")}
      />
    ) : (
      <rect x={cx - W / 2} y={topY - ry} width={W} height={ry * 2} />
    );

  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <path
        d={`M${left.join("L")}L${right.join("L")}Z`}
        fill="currentColor"
        opacity="0.5"
      />
      <g fill="currentColor">{face}</g>
    </svg>
  );
}

export const BODY_OPTIONS: Array<{
  id: BodyShape;
  label: string;
  art: ReactNode;
}> = (
  ["square", "rounded", "dot", "diamond", "leaf", "classy"] as BodyShape[]
).map((id) => ({
  id,
  label: {
    square: "Cuadrado",
    rounded: "Redondo",
    dot: "Punto",
    diamond: "Rombo",
    leaf: "Hoja",
    classy: "Classy",
  }[id],
  art: <BodyArt shape={id} />,
}));

export const FRAME_OPTIONS: Array<{
  id: EyeFrameShape;
  label: string;
  art: ReactNode;
}> = (["square", "rounded", "classy", "leaf"] as EyeFrameShape[]).map((id) => ({
  id,
  label: {
    square: "Cuadrado",
    rounded: "Redondo",
    classy: "Classy",
    leaf: "Hoja",
  }[id],
  art: <FrameArt shape={id} />,
}));

export const BALL_OPTIONS: Array<{
  id: EyeBallShape;
  label: string;
  art: ReactNode;
}> = (["square", "rounded", "circle", "classy"] as EyeBallShape[]).map((id) => ({
  id,
  label: {
    square: "Cuadrado",
    rounded: "Redondo",
    circle: "Círculo",
    classy: "Classy",
  }[id],
  art: <BallArt shape={id} />,
}));

export const SOLID_OPTIONS: Array<{
  id: Solid3D;
  label: string;
  art: ReactNode;
}> = (
  ["slab", "cube", "pyramid", "cylinder", "hexagon", "dome"] as Solid3D[]
).map((id) => ({
  id,
  label: {
    slab: "Placa",
    cube: "Cubo",
    pyramid: "Pirámide",
    cylinder: "Cilindro",
    hexagon: "Hexágono",
    dome: "Cúpula",
  }[id],
  art: <SolidArt solid={id} />,
}));
