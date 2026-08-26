"use client";

import * as React from "react";
import { Wand2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { packSheets, type NestingResult, type SheetSize } from "@/lib/design-engine/nesting";
import { nestingToSvg } from "@/lib/design-engine/export/svg";
import { nestingToDxf } from "@/lib/design-engine/export/dxf";
import { downloadBlob } from "@/lib/download-file";
import type { CutlistRow } from "@/lib/design-engine/cutlist";

const AMBER = "#f59e0b";

export function NestingSection({ cutlist }: { cutlist: CutlistRow[] }) {
  const [sheet, setSheet] = React.useState<SheetSize>({ widthM: 1.83, heightM: 2.44 });
  const [result, setResult] = React.useState<NestingResult | null>(null);
  const [activeSheet, setActiveSheet] = React.useState(0);

  function optimize() {
    const r = packSheets(cutlist, sheet);
    setResult(r);
    setActiveSheet(0);
  }

  function exportSvg() {
    if (!result) return;
    const docs = nestingToSvg(result, sheet);
    docs.forEach((doc, i) => downloadBlob(doc, `nesting-plancha-${i + 1}.svg`, "image/svg+xml"));
  }

  function exportDxf() {
    if (!result) return;
    const docs = nestingToDxf(result, sheet);
    docs.forEach((doc, i) => downloadBlob(doc, `nesting-plancha-${i + 1}.dxf`, "application/dxf"));
  }

  const svgDocs = result ? nestingToSvg(result, sheet) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Optimización de corte (nesting)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ancho plancha (m)</Label>
            <Input
              type="number"
              step={0.01}
              value={sheet.widthM}
              onChange={(e) => setSheet((s) => ({ ...s, widthM: Number(e.target.value) }))}
              className="h-8 w-24"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Alto plancha (m)</Label>
            <Input
              type="number"
              step={0.01}
              value={sheet.heightM}
              onChange={(e) => setSheet((s) => ({ ...s, heightM: Number(e.target.value) }))}
              className="h-8 w-24"
            />
          </div>
          <Button onClick={optimize}>
            <Wand2 /> Optimizar corte
          </Button>
          {result && (
            <>
              <Button variant="outline" onClick={exportSvg}>
                <Download /> SVG por plancha
              </Button>
              <Button variant="outline" onClick={exportDxf}>
                <Download /> DXF por plancha
              </Button>
            </>
          )}
        </div>

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Planchas necesarias" value={String(result.sheetCount)} emphasis />
              <Stat label="Desperdicio" value={`${result.wastePct}%`} />
              <Stat label="Área usada" value={`${result.usedAreaSqm.toFixed(2)} m²`} />
              <Stat label="Sin ubicar" value={String(result.unplaced.length)} />
            </div>

            {result.sheetCount > 0 && (
              <div>
                <div className="mb-2 flex gap-1">
                  {Array.from({ length: result.sheetCount }).map((_, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={activeSheet === i ? "default" : "outline"}
                      onClick={() => setActiveSheet(i)}
                    >
                      Plancha {i + 1}
                    </Button>
                  ))}
                </div>
                <div
                  className="max-w-xl rounded border border-border p-2"
                  style={{ color: AMBER }}
                  dangerouslySetInnerHTML={{ __html: svgDocs[activeSheet] ?? "" }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasis ? "text-lg font-semibold text-primary" : "text-sm font-medium"}>{value}</p>
    </div>
  );
}
