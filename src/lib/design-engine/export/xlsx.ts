import ExcelJS from "exceljs";
import type { CutlistRow } from "../cutlist";
import { ORIENTATION_LABELS, PANEL_ROLE_LABELS } from "../labels";

export async function cutlistToXlsxBuffer(
  rows: CutlistRow[],
  projectName: string
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Carpintero";
  const sheet = workbook.addWorksheet("Cutlist");

  sheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Pieza", key: "role", width: 22 },
    { header: "Orientación", key: "orientation", width: 16 },
    { header: "Ancho (m)", key: "width", width: 12 },
    { header: "Alto (m)", key: "height", width: 12 },
    { header: "Espesor (mm)", key: "thickness", width: 14 },
    { header: "Cantidad", key: "qty", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      id: row.cutlistId,
      role: PANEL_ROLE_LABELS[row.role],
      orientation: ORIENTATION_LABELS[row.orientation],
      width: Number(row.widthM.toFixed(3)),
      height: Number(row.heightM.toFixed(3)),
      thickness: row.thicknessMm,
      qty: row.qty,
    });
  }

  sheet.getCell("A1").note = `Lista de corte — ${projectName}`;

  return workbook.xlsx.writeBuffer();
}
