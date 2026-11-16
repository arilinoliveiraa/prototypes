/* Gera assets/icons.css com os SVGs embutidos como data URI.
   Motivo: mask-image com arquivo externo é bloqueado por CORS quando o
   protótipo é aberto via file:// (dois cliques no index.html).
   Data URI resolve nos dois modos (file:// e http://). */

import fs from "node:fs";
import path from "node:path";

const ASSETS = "assets";
const OUT = "assets/icons.css";

function clean(svg) {
  return svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .replace(/\s*preserveAspectRatio="[^"]*"/g, "")
    .replace(/\s*overflow="[^"]*"/g, "")
    .replace(/\s*style="[^"]*"/g, "")
    .replace(/\s*id="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDataUri(svg) {
  return "data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
}

/* Ícones usados como máscara (cor vem de currentColor). */
const MASK_ICONS = [
  "arrow-left", "caret", "chevron-up", "chevron-down", "plus",
  "loupe", "pen", "user-plus", "times", "trash",
];

/* Ícones usados como imagem de fundo (cor própria importa). */
const IMAGE_ICONS = ["checkbox-check"];

const lines = [":root {"];

for (const name of MASK_ICONS) {
  const file = path.join(ASSETS, name + ".svg");
  let svg = fs.readFileSync(file, "utf8");
  svg = clean(svg).replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#ffffff"');
  lines.push(`  --i-${name}: url("${toDataUri(svg)}");`);
}

for (const name of IMAGE_ICONS) {
  const file = path.join(ASSETS, name + ".svg");
  const svg = clean(fs.readFileSync(file, "utf8"));
  lines.push(`  --i-${name}: url("${toDataUri(svg)}");`);
  /* variante branca, usada sobre a swatch colorida */
  const white = svg.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#ffffff"');
  lines.push(`  --i-${name}-white: url("${toDataUri(white)}");`);
}

lines.push("}");

fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`gerado ${OUT} com ${MASK_ICONS.length + IMAGE_ICONS.length * 2 + 1} ícones`);
