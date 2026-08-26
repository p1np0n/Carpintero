import { describe, expect, it } from "vitest";
import { SEED_TEMPLATES } from "../templates";
import { computeDesign } from "../compute";

describe("seed templates", () => {
  it("includes exactly the 4 demos from the original product", () => {
    const slugs = SEED_TEMPLATES.map((t) => t.slug).sort();
    expect(slugs).toEqual(["chest", "closet", "double-closet", "side-table"]);
  });

  it.each(SEED_TEMPLATES)("$name computes a non-empty cutlist without throwing", (template) => {
    const computed = computeDesign(template.design);
    expect(computed.cutlist.length).toBeGreaterThan(0);
    expect(computed.totals.totalPieces).toBeGreaterThan(0);
  });
});
