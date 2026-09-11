import { describe, expect, it } from "vitest";
import { packSheets } from "../nesting";
import type { CutlistRow } from "../cutlist";

function row(overrides: Partial<CutlistRow>): CutlistRow {
  return {
    cutlistId: "X1",
    role: "shelf",
    orientation: "horizontal-xz",
    widthM: 0.5,
    heightM: 0.4,
    thicknessMm: 18,
    qty: 1,
    isHardware: false,
    pieceIds: [],
    ...overrides,
  };
}

describe("packSheets (guillotine best-short-side-fit)", () => {
  it("packs pieces that clearly fit into a single 1.83x2.44 sheet", () => {
    const rows = [row({ cutlistId: "A1", widthM: 0.5, heightM: 0.4, qty: 4 })];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });
    expect(result.sheetCount).toBe(1);
    expect(result.placements).toHaveLength(4);
    expect(result.unplaced).toHaveLength(0);
  });

  it("opens a second sheet once the first is full", () => {
    // Large pieces that only fit 2 per sheet row-wise, many of them
    const rows = [row({ cutlistId: "A1", widthM: 1.0, heightM: 1.0, qty: 8 })];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });
    expect(result.sheetCount).toBeGreaterThan(1);
    expect(result.placements).toHaveLength(8);
  });

  it("ignores hardware rows entirely", () => {
    const rows = [row({ cutlistId: "R1", isHardware: true, qty: 3 })];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });
    expect(result.sheetCount).toBe(0);
    expect(result.placements).toHaveLength(0);
  });

  it("reports pieces larger than the sheet as unplaced instead of crashing", () => {
    const rows = [row({ cutlistId: "TOO-BIG", widthM: 3, heightM: 3, qty: 1 })];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });
    expect(result.unplaced).toHaveLength(1);
  });

  it("computes waste percentage between 0 and 100", () => {
    const rows = [row({ cutlistId: "A1", widthM: 0.9, heightM: 1.2, qty: 2 })];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });
    expect(result.wastePct).toBeGreaterThanOrEqual(0);
    expect(result.wastePct).toBeLessThanOrEqual(100);
  });

  it("never places two pieces overlapping on the same sheet", () => {
    const rows = [
      row({ cutlistId: "A", widthM: 0.7, heightM: 0.5, qty: 3 }),
      row({ cutlistId: "B", widthM: 0.4, heightM: 0.9, qty: 2 }),
      row({ cutlistId: "C", widthM: 0.3, heightM: 0.3, qty: 6 }),
    ];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });

    for (let s = 0; s < result.sheetCount; s += 1) {
      const onSheet = result.placements.filter((p) => p.sheetIndex === s);
      for (let i = 0; i < onSheet.length; i += 1) {
        for (let j = i + 1; j < onSheet.length; j += 1) {
          const a = onSheet[i];
          const b = onSheet[j];
          const overlapsX = a.x < b.x + b.width - 1e-6 && b.x < a.x + a.width - 1e-6;
          const overlapsY = a.y < b.y + b.height - 1e-6 && b.y < a.y + a.height - 1e-6;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    }
  });

  it("reaches the mathematical minimum sheet count and waste (bounded by rounding up to whole sheets), not just whatever a single fixed heuristic happens to find", () => {
    const rows = [
      row({ cutlistId: "A", widthM: 0.9, heightM: 1.0, qty: 3 }),
      row({ cutlistId: "B", widthM: 0.6, heightM: 1.5, qty: 2 }),
    ];
    const sheet = { widthM: 1.83, heightM: 2.44 };
    const result = packSheets(rows, sheet);

    const totalAreaSqm = 0.9 * 1.0 * 3 + 0.6 * 1.5 * 2;
    const sheetAreaSqm = sheet.widthM * sheet.heightM;
    const minSheets = Math.ceil(totalAreaSqm / sheetAreaSqm);
    const floorWastePct = 100 * (1 - totalAreaSqm / (minSheets * sheetAreaSqm));

    expect(result.sheetCount).toBe(minSheets);
    expect(result.unplaced).toHaveLength(0);
    expect(result.wastePct).toBeCloseTo(floorWastePct, 1);
  });

  it("fills the leftover strip beside a tall piece with smaller pieces instead of opening a new sheet", () => {
    // A 1.9m-tall piece on a 2.44m sheet leaves a ~0.54m strip; several 0.3m-tall pieces
    // should share that sheet rather than each forcing (or piling onto) a separate one —
    // a shelf packer that only reuses already-open shelves and never opens a fresh,
    // exactly-sized one in that leftover headroom fails this by stranding it as waste.
    const rows = [
      row({ cutlistId: "TALL", widthM: 0.6, heightM: 1.9, qty: 1 }),
      row({ cutlistId: "SMALL", widthM: 0.4, heightM: 0.3, qty: 5 }),
    ];
    const result = packSheets(rows, { widthM: 1.83, heightM: 2.44 });

    expect(result.sheetCount).toBe(1);
    expect(result.unplaced).toHaveLength(0);
  });
});
