"use client";

import * as React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CutlistTable } from "@/components/cutlist/cutlist-table";
import { CutlistCards } from "@/components/cutlist/cutlist-cards";
import { MaterialsSection } from "@/components/cutlist/materials-section";
import { NestingSection } from "@/components/cutlist/nesting-section";
import { computeDesignMemoized } from "@/lib/design-engine/compute";
import { computeCutlistTotals, cutlistRowKey } from "@/lib/design-engine/cutlist";
import { cutlistToCsv } from "@/lib/design-engine/export/csv";
import { cutlistToXlsxBuffer } from "@/lib/design-engine/export/xlsx";
import { pieceToSvg } from "@/lib/design-engine/export/svg";
import { downloadBlob } from "@/lib/download-file";
import { useDesignStore } from "@/store/design-store";
import type { CutlistRow } from "@/lib/design-engine/cutlist";
import type { Design } from "@/lib/design-engine/types";

export function CutlistPanel({ projectId, design }: { projectId: string; design: Design }) {
  const projectName = useDesignStore((s) => s.projectName);
  const setGlobalParams = useDesignStore((s) => s.setGlobalParams);
  const { cutlist, panels } = React.useMemo(() => computeDesignMemoized(design), [design]);

  // Parts the maker already has on hand (e.g. leftover boards) and marked as not needing
  // to be cut or bought — kept out of the budget, nesting and exports below, but still
  // listed (struck through) in the table/cards so they can be re-included at any time.
  const excludedKeys = React.useMemo(
    () => new Set(design.globalParams.excludedPartKeys ?? []),
    [design.globalParams.excludedPartKeys]
  );
  const activeCutlist = React.useMemo(
    () => cutlist.filter((row) => !excludedKeys.has(cutlistRowKey(row))),
    [cutlist, excludedKeys]
  );
  const totals = React.useMemo(() => computeCutlistTotals(activeCutlist), [activeCutlist]);

  // computeBudget bills straight off the panel pieces (using the cutlist only to label
  // each one), so excluding a row from the cutlist alone wouldn't stop its pieces from
  // still being billed — the underlying pieces need filtering too.
  const activePanels = React.useMemo(() => {
    const excludedPieceIds = new Set<string>();
    for (const row of cutlist) {
      if (excludedKeys.has(cutlistRowKey(row))) row.pieceIds.forEach((id) => excludedPieceIds.add(id));
    }
    return panels.filter((p) => !excludedPieceIds.has(p.id));
  }, [panels, cutlist, excludedKeys]);

  function toggleExcluded(row: CutlistRow) {
    const key = cutlistRowKey(row);
    const current = design.globalParams.excludedPartKeys ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setGlobalParams({ excludedPartKeys: next });
  }

  function exportCsv() {
    downloadBlob(cutlistToCsv(activeCutlist), `${projectName || "cutlist"}.csv`, "text/csv;charset=utf-8");
  }

  async function exportXlsx() {
    const buffer = await cutlistToXlsxBuffer(activeCutlist, projectName);
    downloadBlob(
      buffer,
      `${projectName || "cutlist"}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  function exportAllSvg() {
    activeCutlist.forEach((row) => downloadBlob(pieceToSvg(row), `${row.cutlistId}.svg`, "image/svg+xml"));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{totals.totalPieces}</strong> piezas
          </span>
          <span>
            <strong className="text-foreground">{totals.totalAreaSqm.toFixed(2)}</strong> m² de tablero
          </span>
          {totals.totalHardwarePieces > 0 && (
            <span>
              <strong className="text-foreground">{totals.totalHardwarePieces}</strong> herrajes
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx}>
            <FileSpreadsheet /> XLSX
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllSvg}>
            <Download /> SVG por pieza
          </Button>
        </div>
      </div>

      <CutlistTable rows={cutlist} excludedKeys={excludedKeys} onToggleExcluded={toggleExcluded} />
      <CutlistCards rows={cutlist} excludedKeys={excludedKeys} onToggleExcluded={toggleExcluded} />
      <MaterialsSection projectId={projectId} panels={activePanels} cutlist={activeCutlist} />
      <NestingSection cutlist={activeCutlist} />
    </div>
  );
}
