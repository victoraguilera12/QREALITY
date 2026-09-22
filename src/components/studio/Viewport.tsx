import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import gsap from "gsap";
import type * as THREE from "three";
import { QrScene } from "../../lib/three/QrScene";
import type { QrDesign } from "../../lib/qr/design";
import type { QrMatrix } from "../../lib/qr/matrix";

export type ViewportHandle = {
  exportGeometry: () => THREE.BufferGeometry | null;
};

type Props = {
  matrix: QrMatrix;
  design: QrDesign;
  mode: "2d" | "3d";
};

const Viewport = forwardRef<ViewportHandle, Props>(function Viewport(
  { matrix, design, mode },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<QrScene | null>(null);
  const progressRef = useRef({ value: 0 });

  useImperativeHandle(ref, () => ({
    exportGeometry: () => sceneRef.current?.exportGeometry() ?? null,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new QrScene(canvas);
    sceneRef.current = scene;
    scene.start();

    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.build(matrix, design);
  }, [
    matrix,
    design.body,
    design.eyeFrame,
    design.eyeBall,
    design.solid,
    design.logo?.src,
    design.logo?.size,
    design.logo?.clearSpace,
  ]);

  useEffect(() => {
    sceneRef.current?.setDepth(design.depth, design.bodyHeight);
  }, [design.depth, design.bodyHeight]);

  useEffect(() => {
    sceneRef.current?.applyColors(design);
  }, [
    design.colorMode,
    design.fg,
    design.bg,
    design.gradientTo,
    design.gradientType,
    design.gradientAngle,
    design.eyeFrameColor,
    design.eyeBallColor,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const target = mode === "3d" ? 1 : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      progressRef.current.value = target;
      scene.setProgress(target);
      return;
    }

    const tween = gsap.to(progressRef.current, {
      value: target,
      duration: 1.1,
      ease: target === 1 ? "power3.inOut" : "power2.inOut",
      overwrite: true,
      onUpdate: () => scene.setProgress(progressRef.current.value),
    });
    return () => {
      tween.kill();
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      style={{ cursor: mode === "3d" ? "grab" : "default" }}
      aria-label={`Vista ${mode === "3d" ? "3D" : "2D"} del código QR`}
    />
  );
});

export default Viewport;
