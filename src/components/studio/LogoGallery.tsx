import { BRANDS, type Brand } from "../../lib/qr/brands";
import { glyphColorFor } from "../../lib/qr/brandLogo";

export function BrandTile({ brand }: { brand: Brand }) {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <rect width="24" height="24" rx="5.3" fill={brand.hex} />
      <g transform="translate(5.3 5.3) scale(0.558)">
        <path d={brand.path} fill={glyphColorFor(brand.hex)} />
      </g>
    </svg>
  );
}

export default function LogoGallery({
  selected,
  onPick,
}: {
  selected?: string;
  onPick: (brand: Brand) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Galería de logos"
      className="grid grid-cols-6 gap-2"
    >
      {BRANDS.map((brand) => {
        const active = brand.slug === selected;
        return (
          <button
            key={brand.slug}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={brand.title}
            title={brand.title}
            onClick={() => onPick(brand)}
            className={`aspect-square cursor-pointer overflow-hidden rounded-lg border p-0.5 transition-all duration-200 ${
              active
                ? "border-accent ring-2 ring-accent/40"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <BrandTile brand={brand} />
          </button>
        );
      })}
    </div>
  );
}
