"use client";

import * as React from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Edges, GizmoHelper, GizmoViewport, OrbitControls, Sparkles, Text } from "@react-three/drei";
import { computeDesignMemoized } from "@/lib/design-engine/compute";
import type { Piece3D } from "@/lib/design-engine/geometry3d";
import type { Design } from "@/lib/design-engine/types";
import { designHeightM, designWidthM } from "@/lib/design-engine/types";

export type ViewMode3D = "solid" | "open" | "exploded";

const GRAPHITE = "#a1a1aa";
const GRAPHITE_SOFT = "#d4d4d8";
const SELECTED_COLOR = "#60a5fa";

/** Synthetic moduleIds used for pieces that belong to the column's fixed structure
 * rather than any single editable module — these aren't selectable in the 2D editor. */
const NON_MODULE_IDS = new Set(["__carcass__", "__fulldoor__"]);

function getTransform(piece: Piece3D, mode: ViewMode3D) {
  const base: [number, number, number] = [piece.centerX, piece.centerY, piece.centerZ];

  if (mode === "open") {
    if (piece.role === "door-front") return { position: base, rotationY: piece.openRotationY };
    return {
      position: [
        base[0] + piece.openTranslation[0],
        base[1] + piece.openTranslation[1],
        base[2] + piece.openTranslation[2],
      ] as [number, number, number],
      rotationY: 0,
    };
  }

  if (mode === "exploded") {
    const dist = piece.explodeDistance;
    return {
      position: [
        base[0] + piece.explodeDirection[0] * dist,
        base[1] + piece.explodeDirection[1] * dist,
        base[2] + piece.explodeDirection[2] * dist,
      ] as [number, number, number],
      rotationY: 0,
    };
  }

  return { position: base, rotationY: 0 };
}

/** The cutlist ID (E1, S2, D3…) floating above a piece, always facing the camera so it
 * stays readable regardless of the piece's own rotation or the current orbit angle. */
function PieceIdLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Billboard position={position}>
      <Text fontSize={0.028} color="#facc15" outlineWidth={0.003} outlineColor="#000000" anchorX="center" anchorY="middle">
        {text}
      </Text>
    </Billboard>
  );
}

function Piece3DMesh({
  piece,
  mode,
  selectedModuleId,
  onSelectModule,
}: {
  piece: Piece3D;
  mode: ViewMode3D;
  selectedModuleId?: string | null;
  onSelectModule?: (columnId: string, moduleId: string) => void;
}) {
  const isModulePiece = !NON_MODULE_IDS.has(piece.moduleId);
  const isSelected = isModulePiece && piece.moduleId === selectedModuleId;
  const color = isSelected ? SELECTED_COLOR : piece.isHardware ? GRAPHITE_SOFT : GRAPHITE;

  // Clicking a piece in the 3D view selects its module, mirroring the selection back to
  // the 2D elevation editor and the module properties panel (both read the same store).
  const clickHandlers =
    isModulePiece && onSelectModule
      ? {
          onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelectModule(piece.columnId, piece.moduleId);
          },
          onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          },
          onPointerOut: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            document.body.style.cursor = "auto";
          },
        }
      : {};

  if (piece.role === "hanging-rod" && piece.orientation === "rod") {
    const { position } = getTransform(piece, mode);
    const radius = Math.max(0.008, piece.sizeZ / 2);
    return (
      <>
        <mesh position={position} rotation={[0, 0, Math.PI / 2]} {...clickHandlers}>
          <cylinderGeometry args={[radius, radius, piece.sizeX, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <PieceIdLabel position={position} text={piece.cutlistId} />
      </>
    );
  }

  if (piece.role === "door-front" && mode === "open") {
    if (piece.hinge === "up" || piece.hinge === "down") {
      const hingeY = piece.hinge === "up" ? piece.centerY + piece.sizeY / 2 : piece.centerY - piece.sizeY / 2;
      const offsetY = piece.hinge === "up" ? -piece.sizeY / 2 : piece.sizeY / 2;
      const groupPosition: [number, number, number] = [piece.centerX, hingeY, piece.centerZ];
      return (
        <>
          <group position={groupPosition} rotation={[piece.openRotationX, 0, 0]}>
            <mesh position={[0, offsetY, 0]} {...clickHandlers}>
              <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
              <meshStandardMaterial color={color} transparent opacity={isSelected ? 0.55 : 0.28} />
              <Edges color={color} />
            </mesh>
            {piece.handle && (
              <mesh position={[0, offsetY + (piece.hinge === "up" ? -piece.sizeY * 0.35 : piece.sizeY * 0.35), piece.sizeZ]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
          </group>
          <PieceIdLabel position={groupPosition} text={piece.cutlistId} />
        </>
      );
    }
    const hingeX = piece.hinge === "left" ? piece.centerX - piece.sizeX / 2 : piece.centerX + piece.sizeX / 2;
    const offsetX = piece.hinge === "left" ? piece.sizeX / 2 : -piece.sizeX / 2;
    const groupPosition: [number, number, number] = [hingeX, piece.centerY, piece.centerZ];
    return (
      <>
        <group position={groupPosition} rotation={[0, piece.openRotationY, 0]}>
          <mesh position={[offsetX, 0, 0]} {...clickHandlers}>
            <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
            <meshStandardMaterial color={color} transparent opacity={isSelected ? 0.55 : 0.28} />
            <Edges color={color} />
          </mesh>
          {piece.handle && (
            <mesh position={[offsetX + (piece.hinge === "left" ? piece.sizeX * 0.35 : -piece.sizeX * 0.35), 0, piece.sizeZ]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )}
        </group>
        <PieceIdLabel position={groupPosition} text={piece.cutlistId} />
      </>
    );
  }

  const { position } = getTransform(piece, mode);
  return (
    <>
      <mesh position={position} {...clickHandlers}>
        <boxGeometry args={[Math.max(piece.sizeX, 0.004), Math.max(piece.sizeY, 0.004), Math.max(piece.sizeZ, 0.004)]} />
        <meshStandardMaterial color={color} transparent opacity={isSelected ? 0.55 : 0.22} />
        <Edges color={color} />
        {piece.handle && (
          <mesh position={[0, 0, piece.sizeZ / 2]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
      </mesh>
      <PieceIdLabel position={position} text={piece.cutlistId} />
    </>
  );
}

/** Translucent blue box spanning the selected module's whole slot (its full width,
 * height and depth) — not just whatever physical board(s) it happens to generate. A
 * "shelf" module, for instance, only produces one thin board, which on its own barely
 * reads as "selected"; this makes the entire compartment it occupies stand out, matching
 * the filled rectangle already shown for the selected module in the 2D editor. Shown in
 * "solid" and "open" mode — "open" only swings doors and slides drawer fronts forward,
 * every other piece (shelves, sides, back, dividers) stays right where "solid" has it, so
 * the compartment itself never moves. Skipped in "exploded" mode, which scatters every
 * piece away from its slot, leaving nothing here for a static box to line up with. */
function SelectedModuleHighlight({ design, selectedModuleId }: { design: Design; selectedModuleId?: string | null }) {
  if (!selectedModuleId) return null;
  const { layout2D } = computeDesignMemoized(design);
  const depthM = design.globalParams.depthM;

  for (const col of layout2D.columns) {
    const rect = col.modules.find((m) => m.module.id === selectedModuleId);
    if (!rect) continue;
    const position: [number, number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2, depthM / 2];
    return (
      <mesh position={position} renderOrder={1}>
        <boxGeometry args={[rect.width, Math.max(rect.height, 0.004), depthM]} />
        <meshStandardMaterial color={SELECTED_COLOR} transparent opacity={0.18} depthWrite={false} />
        <Edges color={SELECTED_COLOR} lineWidth={2} />
      </mesh>
    );
  }
  return null;
}

function FurnitureModel({
  design,
  mode,
  selectedModuleId,
  onSelectModule,
}: {
  design: Design;
  mode: ViewMode3D;
  selectedModuleId?: string | null;
  onSelectModule?: (columnId: string, moduleId: string) => void;
}) {
  const { pieces3D } = computeDesignMemoized(design);
  return (
    <group>
      {mode !== "exploded" && <SelectedModuleHighlight design={design} selectedModuleId={selectedModuleId} />}
      {pieces3D.map((p) => (
        <Piece3DMesh key={p.id} piece={p} mode={mode} selectedModuleId={selectedModuleId} onSelectModule={onSelectModule} />
      ))}
    </group>
  );
}

export function View3DScene({
  design,
  mode,
  selectedModuleId,
  onSelectModule,
}: {
  design: Design;
  mode: ViewMode3D;
  selectedModuleId?: string | null;
  onSelectModule?: (columnId: string, moduleId: string) => void;
}) {
  const width = designWidthM(design) || 1;
  const height = designHeightM(design) || 1;
  const depth = design.globalParams.depthM || 0.45;
  const center: [number, number, number] = [width / 2, height / 2, depth / 2];
  // Pieces spread out well beyond the design's own bounding box in "exploded" mode, so pull
  // the camera back further to start with the whole assembly in frame instead of cropped.
  const explodePadding = mode === "exploded" ? 1.4 : 0;
  const maxDim = Math.max(width, height, depth, 0.5) + explodePadding;

  return (
    <Canvas camera={{ position: [center[0] + maxDim, center[1] + maxDim * 0.7, center[2] + maxDim * 1.4], fov: 40 }}>
      <color attach="background" args={["#161310"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
      <Sparkles count={60} scale={[maxDim * 2.5, maxDim * 2.5, maxDim * 2.5]} size={2} speed={0.15} color={GRAPHITE} opacity={0.25} position={center} />
      <React.Suspense fallback={null}>
        <FurnitureModel design={design} mode={mode} selectedModuleId={selectedModuleId} onSelectModule={onSelectModule} />
      </React.Suspense>
      <OrbitControls target={center} makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={[GRAPHITE, "#84cc16", "#38bdf8"]} labelColor="black" />
      </GizmoHelper>
    </Canvas>
  );
}
