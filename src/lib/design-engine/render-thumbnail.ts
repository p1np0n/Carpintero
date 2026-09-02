import { computeLayout2D } from "./layout2d";
import type { Design } from "./types";

const GRAPHITE = "#3f3f46";

/**
 * Renders the front elevation as a standalone SVG string (line-art, no React) —
 * used as the project's dashboard thumbnail. Kept dependency-free so it can run
 * in a Server Action without pulling in `react-dom/server`.
 */
export function renderThumbnailSvg(design: Design): string {
  const layout = computeLayout2D(design);
  const mm = (v: number) => Math.round(v * 1000);
  const totalW = mm(layout.widthM) || 1;
  const totalH = mm(layout.heightM) || 1;
  const pad = Math.max(20, Math.round(Math.max(totalW, totalH) * 0.04));

  const columns = layout.columns
    .map((col) => {
      const modules = col.modules
        .map((rect) => {
          const svgY = totalH - mm(rect.y) - mm(rect.height);
          return `<rect x="${mm(col.x)}" y="${svgY}" width="${mm(rect.width)}" height="${mm(
            rect.height
          )}" fill="none" stroke="${GRAPHITE}" stroke-opacity="0.55" stroke-width="1.5" />`;
        })
        .join("");
      const outline = `<rect x="${mm(col.x)}" y="${totalH - mm(col.height)}" width="${mm(col.width)}" height="${mm(
        col.height
      )}" fill="none" stroke="${GRAPHITE}" stroke-width="2.5" />`;
      return modules + outline;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${totalW + pad * 2} ${totalH + pad * 2}" role="img" aria-label="Miniatura del proyecto">${columns}</svg>`;
}
