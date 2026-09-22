import { readFileSync, writeFileSync } from "node:fs";

const SLUGS = [
  "whatsapp", "facebook", "messenger", "x", "youtube", "instagram",
  "tiktok", "pinterest", "telegram", "snapchat", "reddit", "discord",
  "spotify", "soundcloud", "vimeo", "twitch", "xing", "github",
  "gmail", "googleplay", "appstore", "paypal", "bitcoin", "shopify",
];

const data = JSON.parse(
  readFileSync("node_modules/simple-icons/data/simple-icons.json", "utf8"),
);
const list = Array.isArray(data) ? data : data.icons;

const slugify = (t) =>
  t.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");

const bySlug = new Map();
for (const icon of list) bySlug.set(icon.slug ?? slugify(icon.title), icon);

const out = [];
for (const slug of SLUGS) {
  const svg = readFileSync(`node_modules/simple-icons/icons/${slug}.svg`, "utf8");
  const path = svg.match(/ d="([^"]+)"/)[1];
  const title = svg.match(/<title>([^<]+)<\/title>/)[1];
  const meta = bySlug.get(slug);
  const hex = meta?.hex ?? "444444";
  out.push({ slug, title, hex: `#${hex.toLowerCase()}`, path });
}

const file = `// Generated from simple-icons (CC0). Regenerate with scripts/gen-brands.mjs.
// Brand names and marks remain the property of their respective owners; they are
// offered here only so people can point a QR at their own profile.

export type Brand = {
  slug: string;
  title: string;
  /** Official brand colour. */
  hex: string;
  /** Glyph path in a 24x24 viewBox. */
  path: string;
};

export const BRANDS: Brand[] = ${JSON.stringify(out, null, 2)};
`;

writeFileSync("src/lib/qr/brands.ts", file);
console.log(`wrote ${out.length} brands`);
