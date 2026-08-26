import type { NestingResult } from "../nesting";
import type { SheetSize } from "../nesting";
import type { CutlistRow } from "../cutlist";

const AMBER = "#f59e0b";
const AMBER_DARK = "#78350f";

/** One SVG document per sheet, with each placed piece drawn to scale (px = mm). */
export function nestingToSvg(result: NestingResult, sheet: SheetSize): string[] {
  const widthPx = Math.round(sheet.widthM * 1000);
  const heightPx = Math.round(sheet.heightM * 1000);

  const svgs: string[] = [];
  for (let i = 0; i < result.sheetCount; i += 1) {
    const rects = result.placements
      .filter((p) => p.sheetIndex === i)
      .map((p) => {
        const x = Math.round(p.x * 1000);
        const y = Math.round(p.y * 1000);
        const w = Math.round(p.width * 1000);
        const h = Math.round(p.height * 1000);
        return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${AMBER}" stroke-width="2" />
  <text x="${x + w / 2}" y="${y + h / 2}" fill="${AMBER_DARK}" font-size="${Math.min(w, h) / 6}" text-anchor="middle" dominant-baseline="middle">${p.cutlistId}</text>
</g>`;
      })
      .join("\n");

    svgs.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="#1c1917" stroke="#57534e" stroke-width="4" />
  ${rects}
</svg>`
    );
  }
  return svgs;
}

/** A single labeled rectangle for one cutlist row — useful for a per-piece cut sheet. */
export function pieceToSvg(row: CutlistRow): string {
  const widthPx = Math.round(row.widthM * 1000);
  const heightPx = Math.round(row.heightM * 1000);
  const pad = 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx + pad * 2}" height="${heightPx + pad * 2}" viewBox="0 0 ${widthPx + pad * 2} ${heightPx + pad * 2}">
  <rect x="${pad}" y="${pad}" width="${widthPx}" height="${heightPx}" fill="none" stroke="${AMBER}" stroke-width="2" />
  <text x="${pad + widthPx / 2}" y="${pad + heightPx / 2}" fill="${AMBER_DARK}" font-size="16" text-anchor="middle" dominant-baseline="middle">${row.cutlistId} · ${row.widthM.toFixed(3)}×${row.heightM.toFixed(3)} m ×${row.qty}</text>
</svg>`;
}
