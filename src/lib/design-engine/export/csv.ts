import type { CutlistRow } from "../cutlist";
import { ORIENTATION_LABELS, PANEL_ROLE_LABELS } from "../labels";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function cutlistToCsv(rows: CutlistRow[]): string {
  const header = ["ID", "Pieza", "Orientación", "Ancho (m)", "Alto (m)", "Espesor (mm)", "Cantidad"];
  const lines = [header.join(",")];

  for (const row of rows) {
    const fields = [
      row.cutlistId,
      PANEL_ROLE_LABELS[row.role],
      ORIENTATION_LABELS[row.orientation],
      row.widthM.toFixed(3),
      row.heightM.toFixed(3),
      String(row.thicknessMm),
      String(row.qty),
    ];
    lines.push(fields.map(escapeCsvField).join(","));
  }

  return lines.join("\n");
}
