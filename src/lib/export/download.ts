import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(svg: string, filename: string) {
  save(new Blob([svg], { type: "image/svg+xml" }), filename);
}

export async function downloadPng(svg: string, filename: string, size = 1024) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo rasterizar el SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (png) save(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Scales the scene's module-unit geometry so the object's widest dimension
 * measures `widthMm`, then writes binary STL (millimetres, Z up).
 */
export function downloadStl(
  geometry: THREE.BufferGeometry,
  widthUnits: number,
  widthMm: number,
  filename: string,
) {
  const mesh = new THREE.Mesh(geometry);
  mesh.scale.setScalar(widthMm / widthUnits);
  mesh.updateMatrixWorld(true);
  const data = new STLExporter().parse(mesh, { binary: true });
  save(new Blob([data as unknown as ArrayBuffer], { type: "model/stl" }), filename);
  geometry.dispose();
}
