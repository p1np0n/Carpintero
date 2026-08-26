"use client";

import * as React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CutlistTable } from "@/components/cutlist/cutlist-table";
import { CutlistCards } from "@/components/cutlist/cutlist-cards";
import { MaterialsSection } from "@/components/cutlist/materials-section";
import { NestingSection } from "@/components/cutlist/nesting-section";
import { computeDesignMemoized } from "@/lib/design-engine/compute";
import { cutlistToCsv } from "@/lib/design-engine/export/csv";
import { cutlistToXlsxBuffer } from "@/lib/design-engine/export/xlsx";
import { pieceToSvg } from "@/lib/design-engine/export/svg";
import { downloadBlob } from "@/lib/download-file";
import { useDesignStore } from "@/store/design-store";
import type { Design } from "@/lib/design-engine/types";

export function CutlistPanel({ projectId, design }: { projectId: string; design: Design }) {
  const projectName = useDesignStore((s) => s.projectName);
  const { cutlist, panels, totals } = React.useMemo(() => computeDesignMemoized(design), [design]);

  function exportCsv() {
    downloadBlob(cutlistToCsv(cutlist), `${projectName || "cutlist"}.csv`, "text/csv;charset=utf-8");
  }

  async function exportXlsx() {
    const buffer = await cutlistToXlsxBuffer(cutlist, projectName);
    downloadBlob(
      buffer,
      `${projectName || "cutlist"}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  function exportAllSvg() {
    cutlist.forEach((row) => downloadBlob(pieceToSvg(row), `${row.cutlistId}.svg`, "image/svg+xml"));
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

      <CutlistTable rows={cutlist} />
      <CutlistCards rows={cutlist} />
      <MaterialsSection projectId={projectId} panels={panels} cutlist={cutlist} />
      <NestingSection cutlist={cutlist} />
    </div>
  );
}
