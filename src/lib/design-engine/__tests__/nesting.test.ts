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

describe("packSheets (first-fit-decreasing)", () => {
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
});
