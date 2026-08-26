import type { NestingResult, SheetSize } from "../nesting";

function dxfLine(x1: number, y1: number, x2: number, y2: number): string {
  return ["0", "LINE", "8", "0", "10", x1, "20", y1, "30", "0.0", "11", x2, "21", y2, "31", "0.0"].join(
    "\n"
  );
}

function dxfText(x: number, y: number, height: number, text: string): string {
  return ["0", "TEXT", "8", "0", "10", x, "20", y, "30", "0.0", "40", height, "1", text].join("\n");
}

function dxfRect(x: number, y: number, w: number, h: number, label: string): string {
  return [
    dxfLine(x, y, x + w, y),
    dxfLine(x + w, y, x + w, y + h),
    dxfLine(x + w, y + h, x, y + h),
    dxfLine(x, y + h, x, y),
    dxfText(x + 4, y + h / 2, Math.max(6, Math.min(w, h) / 8), label),
  ].join("\n");
}

/** One minimal ASCII DXF (R12) document per sheet, millimeter units, ready for CNC nesting software. */
export function nestingToDxf(result: NestingResult, sheet: SheetSize): string[] {
  const widthMm = sheet.widthM * 1000;
  const heightMm = sheet.heightM * 1000;

  const docs: string[] = [];
  for (let i = 0; i < result.sheetCount; i += 1) {
    const entities = [dxfRect(0, 0, widthMm, heightMm, "PLANCHA")]
      .concat(
        result.placements
          .filter((p) => p.sheetIndex === i)
          .map((p) => dxfRect(p.x * 1000, p.y * 1000, p.width * 1000, p.height * 1000, p.cutlistId))
      )
      .join("\n");

    docs.push(["0", "SECTION", "2", "ENTITIES", entities, "0", "ENDSEC", "0", "EOF"].join("\n"));
  }
  return docs;
}
