"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Edges, GizmoHelper, GizmoViewport, OrbitControls, Sparkles } from "@react-three/drei";
import { computeDesignMemoized } from "@/lib/design-engine/compute";
import type { Piece3D } from "@/lib/design-engine/geometry3d";
import type { Design } from "@/lib/design-engine/types";
import { designHeightM, designWidthM } from "@/lib/design-engine/types";

export type ViewMode3D = "solid" | "open" | "exploded";

const GRAPHITE = "#a1a1aa";
const GRAPHITE_SOFT = "#d4d4d8";

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
    const dist = 0.45;
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

function Piece3DMesh({ piece, mode }: { piece: Piece3D; mode: ViewMode3D }) {
  const color = piece.isHardware ? GRAPHITE_SOFT : GRAPHITE;

  if (piece.role === "hanging-rod" && piece.orientation === "rod") {
    const { position } = getTransform(piece, mode);
    const radius = Math.max(0.008, piece.sizeZ / 2);
    return (
      <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, piece.sizeX, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (piece.role === "door-front" && mode === "open") {
    if (piece.hinge === "up" || piece.hinge === "down") {
      const hingeY = piece.hinge === "up" ? piece.centerY + piece.sizeY / 2 : piece.centerY - piece.sizeY / 2;
      const offsetY = piece.hinge === "up" ? -piece.sizeY / 2 : piece.sizeY / 2;
      return (
        <group position={[piece.centerX, hingeY, piece.centerZ]} rotation={[piece.openRotationX, 0, 0]}>
          <mesh position={[0, offsetY, 0]}>
            <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
            <meshStandardMaterial color={color} transparent opacity={0.28} />
            <Edges color={color} />
          </mesh>
          {piece.handle && (
            <mesh position={[0, offsetY + (piece.hinge === "up" ? -piece.sizeY * 0.35 : piece.sizeY * 0.35), piece.sizeZ]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )}
        </group>
      );
    }
    const hingeX = piece.hinge === "left" ? piece.centerX - piece.sizeX / 2 : piece.centerX + piece.sizeX / 2;
    const offsetX = piece.hinge === "left" ? piece.sizeX / 2 : -piece.sizeX / 2;
    return (
      <group position={[hingeX, piece.centerY, piece.centerZ]} rotation={[0, piece.openRotationY, 0]}>
        <mesh position={[offsetX, 0, 0]}>
          <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
          <meshStandardMaterial color={color} transparent opacity={0.28} />
          <Edges color={color} />
        </mesh>
        {piece.handle && (
          <mesh position={[offsetX + (piece.hinge === "left" ? piece.sizeX * 0.35 : -piece.sizeX * 0.35), 0, piece.sizeZ]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
      </group>
    );
  }

  const { position } = getTransform(piece, mode);
  return (
    <mesh position={position}>
      <boxGeometry args={[Math.max(piece.sizeX, 0.004), Math.max(piece.sizeY, 0.004), Math.max(piece.sizeZ, 0.004)]} />
      <meshStandardMaterial color={color} transparent opacity={0.22} />
      <Edges color={color} />
      {piece.handle && (
        <mesh position={[0, 0, piece.sizeZ / 2]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </mesh>
  );
}

function FurnitureModel({ design, mode }: { design: Design; mode: ViewMode3D }) {
  const { pieces3D } = computeDesignMemoized(design);
  return (
    <group>
      {pieces3D.map((p) => (
        <Piece3DMesh key={p.id} piece={p} mode={mode} />
      ))}
    </group>
  );
}

export function View3DScene({ design, mode }: { design: Design; mode: ViewMode3D }) {
  const width = designWidthM(design) || 1;
  const height = designHeightM(design) || 1;
  const depth = design.globalParams.depthM || 0.45;
  const center: [number, number, number] = [width / 2, height / 2, depth / 2];
  const maxDim = Math.max(width, height, depth, 0.5);

  return (
    <Canvas camera={{ position: [center[0] + maxDim, center[1] + maxDim * 0.7, center[2] + maxDim * 1.4], fov: 40 }}>
      <color attach="background" args={["#161310"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
      <Sparkles count={60} scale={[maxDim * 2.5, maxDim * 2.5, maxDim * 2.5]} size={2} speed={0.15} color={GRAPHITE} opacity={0.25} position={center} />
      <React.Suspense fallback={null}>
        <FurnitureModel design={design} mode={mode} />
      </React.Suspense>
      <OrbitControls target={center} makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={[GRAPHITE, "#84cc16", "#38bdf8"]} labelColor="black" />
      </GizmoHelper>
    </Canvas>
  );
}
