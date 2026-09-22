# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/qr-studio/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** QR Studio
**Generated:** 2026-09-22
**Category:** Developer Tool / Creative Generator
**Design Dials:** Variance 7/10 (Balanced / Modern) | Motion 9/10 (Complex) | Density 5/10 (Standard)

> **Sourcing note:** Pattern + Style come from `search.py --design-system "creative generator tool 3D preview editor studio"`.
> Palette replaced with the verified `--domain color` result **"Developer Tool / IDE"** and typography with the verified
> `--domain typography` result **"Developer Mono"** — the design-system run mis-inferred the category as "Resume / CV Builder"
> and returned a light real-estate profile that does not match this product. Both replacements are verified skill output.

---

## Global Rules

### Color Palette

Dark-first. The 3D viewport is the focal surface — a dark canvas makes the extruded QR and the accent green read with
maximum contrast.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E293B` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#22C55E` | `--color-accent` |
| On Accent/CTA | `#0F172A` | `--color-on-accent` |
| Background | `#0F172A` | `--color-background` |
| Foreground | `#F8FAFC` | `--color-foreground` |
| Card | `#1B2336` | `--color-card` |
| Card Foreground | `#F8FAFC` | `--color-card-foreground` |
| Muted | `#272F42` | `--color-muted` |
| Muted Foreground | `#94A3B8` | `--color-muted-foreground` |
| Border | `#475569` | `--color-border` |
| Destructive | `#EF4444` | `--color-destructive` |
| On Destructive | `#000000` | `--color-on-destructive` |
| Ring | `#FFFFFF` | `--color-ring` |

**Color Notes:** Code dark + run green. Accent `#22C55E` is reserved for primary actions and the active 3D state —
never used as a large background fill.

### Typography

- **Heading Font:** JetBrains Mono
- **Body Font:** IBM Plex Sans
- **Mood:** code, developer, technical, precise, functional
- **Google Fonts:** [IBM Plex Sans + JetBrains Mono](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

**Tailwind Config:**
```js
fontFamily: { mono: ['JetBrains Mono', 'monospace'], sans: ['IBM Plex Sans', 'sans-serif'] }
```

Usage: JetBrains Mono for headings, labels, numeric readouts and anything that reads as "machine output"
(dimensions, URLs, file sizes). IBM Plex Sans for body copy and long-form text.

### Spacing Variables

*Density: 5/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

On a dark background, elevation is carried by **border luminance + accent glow**, not by drop shadows.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.5)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.55)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.6)` | Featured cards, 3D viewport |
| `--glow-accent` | `0 0 0 1px #22C55E, 0 0 24px rgba(34,197,94,0.25)` | Active/3D state |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #22C55E;
  color: #0F172A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #F8FAFC;
  border: 1px solid #475569;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: #22C55E;
  color: #22C55E;
}
```

### Cards

```css
.card {
  background: #1B2336;
  border: 1px solid #475569;
  border-radius: 12px;
  padding: 24px;
  transition: all 200ms ease;
}

.card:hover {
  border-color: #64748B;
  box-shadow: var(--shadow-lg);
}
```

### Inputs

```css
.input {
  background: #0F172A;
  color: #F8FAFC;
  padding: 12px 16px;
  border: 1px solid #475569;
  border-radius: 8px;
  font-size: 16px; /* never below 16px — prevents iOS zoom-on-focus */
  transition: border-color 200ms ease;
}

.input::placeholder { color: #94A3B8; }

.input:focus {
  border-color: #22C55E;
  outline: none;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
}

.modal {
  background: #1B2336;
  border: 1px solid #475569;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Product Demo + Features

- **Conversion Strategy:** Use an interactive demo only when it explains value better than static media. Provide visible
  play/pause (here: the 2D↔3D toggle) and a non-animated fallback; do not autoplay under reduced motion. Keep the final
  product state available as static content.
- **CTA Placement:** Demo center + CTA right/bottom
- **Section Order:** Hero > Interactive demo (center) > Feature breakdown > CTA

---

## Motion

**Hover Micro-interaction** (Complex) — Trigger: hover + mousemove | Duration: 300-500ms | Easing: `elastic.out(1,0.4)`

```js
const onPointerMove = (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.3); }; el.addEventListener('pointermove', onPointerMove); return () => el.removeEventListener('pointermove', onPointerMove);
```

**Framework notes:** Keep a stable named pointer handler so cleanup removes the same function; in React/Vue return the
removeEventListener cleanup; use `gsap.matchMedia('(prefers-reduced-motion: reduce)')` and render x/y at the final
neutral state.

- Clamp the pull strength (e.g. `* 0.3`) so the element never fully leaves its hit box
- Don't apply the magnetic effect to more than 1-2 focal elements per screen; it becomes noisy
- Use `will-change: transform` on the target element for smoother compositing

**Stagger List** (Standard) — load/scroll | 300-450ms | `back.out(1.4)` — used for the module-by-module QR build-in.

**Scroll Reveal** (Subtle) — viewport enter | 300-400ms | `power1.out`, y offset 8-16px.

### Signature transition: 2D → 3D

The product's hero moment. Rules:
- Single continuous camera + extrusion tween, not two separate animations — spatial continuity is what sells it.
- Modules rise with a **grid-aware stagger** (`from: 'center'`) so the code appears to inflate outward.
- Duration 900-1200ms. Longer than a normal UI transition because it is the demo itself, not a state change.
- Under `prefers-reduced-motion: reduce`: skip the tween, render the final 3D state immediately.
- The toggle is reversible and interruptible — never trap the user mid-animation.

---

## 3D Viewport Rules (three.js)

- `THREE.ColorManagement.enabled = true`; `renderer.outputColorSpace = THREE.SRGBColorSpace`;
  `renderer.toneMapping = THREE.ACESFilmicToneMapping`. Never use the removed `outputEncoding` / `sRGBEncoding`.
- `MeshStandardMaterial` requires **both** an `AmbientLight` (fill) and a `DirectionalLight` (shading direction),
  or geometry renders solid black.
- Merge module geometries into a single buffer instead of one mesh per module — a QR can exceed 1000 modules.
- Cap `devicePixelRatio` at 2 and pause the render loop when the canvas is offscreen.

---

## Anti-Patterns (Do NOT Use)

- **No live preview** — the QR must update as the user types, never behind a "Generate" button
- **Decorative clutter** — every element on the canvas must serve the code or the export
- **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- **Layout-shifting hovers** — Avoid scale transforms that shift layout
- **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- **Instant state changes** — Always use transitions (150-300ms)
- **Invisible focus states** — Focus states must be visible for a11y
- **Light mode as default** — this product is dark-first

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from a consistent icon set (Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum against `#0F172A` / `#1B2336`
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected (incl. the 2D→3D transition)
- [ ] Touch targets min 44x44px with 8px+ spacing
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] QR remains scannable at every customization state (contrast + ECC validated)
