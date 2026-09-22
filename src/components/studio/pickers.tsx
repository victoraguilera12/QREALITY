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
import { PROFILES } from "../../lib/three/shapes";
import type { Profile3D } from "../../lib/qr/design";

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

/** Side silhouette straight from the extrusion profile data. */
function ProfileArt({ profile }: { profile: Profile3D }) {
  const steps = PROFILES[profile];
  const left = steps.map(([h, s]) => `${0.5 - s / 2} ${1 - h}`);
  const right = [...steps].reverse().map(([h, s]) => `${0.5 + s / 2} ${1 - h}`);
  return (
    <svg viewBox="0 0 1 1" className="size-7" aria-hidden="true">
      <path d={`M${left.join("L")}L${right.join("L")}Z`} fill="currentColor" />
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

export const PROFILE_OPTIONS: Array<{
  id: Profile3D;
  label: string;
  art: ReactNode;
}> = (
  [
    "prism",
    "bevel",
    "frustum",
    "pyramid",
    "dome",
    "ziggurat",
  ] as Profile3D[]
).map((id) => ({
  id,
  label: {
    prism: "Prisma",
    bevel: "Bisel",
    frustum: "Tronco",
    pyramid: "Pirámide",
    dome: "Cúpula",
    ziggurat: "Zigurat",
  }[id],
  art: <ProfileArt profile={id} />,
}));
