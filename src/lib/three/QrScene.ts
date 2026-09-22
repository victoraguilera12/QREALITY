import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { QUIET_ZONE, type QrDesign } from "../qr/design";
import { finderOrigins, inFinder, isDark, type QrMatrix } from "../qr/matrix";
import { finderShapes, moduleGeometry } from "./shapes";

const FOV = 24;
const TILT_MAX = THREE.MathUtils.degToRad(54);
const AZIM_MAX = THREE.MathUtils.degToRad(26);
/** Fraction of the timeline consumed by the centre-out stagger. */
const STAGGER_SPREAD = 0.45;
const FLAT_EPSILON = 0.012;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class QrScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
  private group = new THREE.Group();

  private moduleMesh: THREE.InstancedMesh | null = null;
  private finderMesh: THREE.Mesh | null = null;
  private plate: THREE.Mesh | null = null;

  private delays = new Float32Array(0);
  private origins = new Float32Array(0);
  private finderDelay = 0;
  private span = 1;

  private progress = 0;
  private depth = 1.6;
  private plateDepth = 0.8;

  private azimuthDrift = 0;
  private userAzimuth = 0;
  private userTilt = 0;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  private dummy = new THREE.Object3D();
  private frame = 0;
  private running = false;
  private lastTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // LDR scene: tone mapping would shift the exact hex the user picked.
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene.add(this.group);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(3, 4, 9);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(-6, -3, 4);
    this.scene.add(rim);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  build(matrix: QrMatrix, design: QrDesign) {
    this.disposeContent();
    this.depth = design.depth;
    this.plateDepth = design.plate;
    this.span = matrix.size + QUIET_ZONE * 2;

    const half = matrix.size / 2;
    const positions: number[] = [];
    const delays: number[] = [];
    const maxDist = Math.hypot(half, half);

    for (let y = 0; y < matrix.size; y++) {
      for (let x = 0; x < matrix.size; x++) {
        if (!isDark(matrix, x, y)) continue;
        if (inFinder(matrix.size, x, y)) continue;
        const wx = x + 0.5 - half;
        const wy = half - y - 0.5;
        positions.push(wx, wy);
        delays.push(Math.min(1, Math.hypot(wx, wy) / maxDist));
      }
    }

    this.origins = new Float32Array(positions);
    this.delays = new Float32Array(delays);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(design.fg),
      roughness: 0.55,
      metalness: 0.04,
    });

    const count = delays.length;
    if (count > 0) {
      this.moduleMesh = new THREE.InstancedMesh(
        moduleGeometry(design.shape),
        material,
        count,
      );
      this.moduleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(this.moduleMesh);
    }

    const finderGeos: THREE.BufferGeometry[] = [];
    for (const [fx, fy] of finderOrigins(matrix.size)) {
      for (const shape of finderShapes(design.shape)) {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 1,
          bevelEnabled: false,
          // Finders are 7x7 modules, so their curvature reads at full size.
          curveSegments: design.shape === "dot" ? 28 : 10,
        });
        geo.translate(fx - half, half - fy - 7, 0);
        finderGeos.push(geo);
      }
    }
    const merged = mergeGeometries(finderGeos, false);
    for (const g of finderGeos) g.dispose();
    if (merged) {
      this.finderMesh = new THREE.Mesh(merged, material);
      this.group.add(this.finderMesh);
    }
    // Finders sit at the corners, so they are the last thing to rise.
    this.finderDelay = 1;

    const plateGeo = new THREE.BoxGeometry(this.span, this.span, 1);
    plateGeo.translate(0, 0, -0.5);
    this.plate = new THREE.Mesh(
      plateGeo,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(design.bg),
        roughness: 0.85,
        metalness: 0,
      }),
    );
    this.group.add(this.plate);

    this.resize();
    this.setProgress(this.progress);
  }

  setProgress(p: number) {
    this.progress = THREE.MathUtils.clamp(p, 0, 1);
    this.applyHeights();
    this.updateCamera();
  }

  setDepth(depth: number, plate: number) {
    this.depth = depth;
    this.plateDepth = plate;
    this.applyHeights();
  }

  setColors(fg: string, bg: string) {
    const moduleMat = (this.moduleMesh?.material ??
      this.finderMesh?.material) as THREE.MeshStandardMaterial | undefined;
    moduleMat?.color.set(fg);
    (this.plate?.material as THREE.MeshStandardMaterial | undefined)?.color.set(
      bg,
    );
  }

  private heightAt(delay: number) {
    const local = THREE.MathUtils.clamp(
      (this.progress - delay * STAGGER_SPREAD) / (1 - STAGGER_SPREAD),
      0,
      1,
    );
    return Math.max(FLAT_EPSILON, local * this.depth);
  }

  private applyHeights() {
    if (this.moduleMesh) {
      for (let i = 0; i < this.delays.length; i++) {
        this.dummy.position.set(this.origins[i * 2], this.origins[i * 2 + 1], 0);
        this.dummy.scale.set(1, 1, this.heightAt(this.delays[i]));
        this.dummy.updateMatrix();
        this.moduleMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.moduleMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.finderMesh) {
      this.finderMesh.scale.z = this.heightAt(this.finderDelay);
    }
    if (this.plate) {
      this.plate.scale.z = Math.max(
        FLAT_EPSILON,
        this.progress * this.plateDepth,
      );
    }
  }

  private fitDistance() {
    const aspect = this.camera.aspect;
    const halfV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const halfH = halfV * aspect;
    // Tilting swings the plate's diagonal into frame, so pull back as it rises.
    const margin = 1.12 + 0.22 * this.progress;
    return (this.span / 2 / Math.min(halfV, halfH)) * margin;
  }

  private updateCamera() {
    const tilt = THREE.MathUtils.clamp(
      (TILT_MAX + this.userTilt) * this.progress,
      0,
      THREE.MathUtils.degToRad(82),
    );
    const azim =
      (AZIM_MAX + this.userAzimuth + this.azimuthDrift) * this.progress;
    const r = this.fitDistance();
    const sin = Math.sin(tilt);
    this.camera.position.set(
      r * sin * Math.sin(azim),
      -r * sin * Math.cos(azim),
      r * Math.cos(tilt),
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.progress < 0.5) return;
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.userAzimuth += dx * 0.006;
    this.userTilt = THREE.MathUtils.clamp(
      this.userTilt + dy * 0.005,
      -TILT_MAX + 0.15,
      THREE.MathUtils.degToRad(80) - TILT_MAX,
    );
    this.updateCamera();
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  start() {
    if (this.running) return;
    this.running = true;
    const idle = !prefersReducedMotion();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0;
      this.lastTime = now;
      if (idle && !this.dragging && this.progress > 0.99) {
        this.azimuthDrift += dt * 0.06;
        this.updateCamera();
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  /** Solid geometry at full extrusion, in world units, for mesh export. */
  exportGeometry(): THREE.BufferGeometry | null {
    const parts: THREE.BufferGeometry[] = [];
    if (this.moduleMesh) {
      const base = this.moduleMesh.geometry;
      for (let i = 0; i < this.delays.length; i++) {
        const g = base.clone();
        g.scale(1, 1, this.depth);
        g.translate(this.origins[i * 2], this.origins[i * 2 + 1], 0);
        parts.push(g);
      }
    }
    if (this.finderMesh) {
      const g = this.finderMesh.geometry.clone();
      g.scale(1, 1, this.depth);
      parts.push(g);
    }
    const box = new THREE.BoxGeometry(this.span, this.span, this.plateDepth);
    box.translate(0, 0, -this.plateDepth / 2);
    // ExtrudeGeometry is non-indexed; mergeGeometries refuses a mixed set.
    const plate = box.toNonIndexed();
    box.dispose();
    parts.push(plate);

    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    return merged;
  }

  private disposeContent() {
    for (const child of [this.moduleMesh, this.finderMesh, this.plate]) {
      if (!child) continue;
      this.group.remove(child);
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
    this.moduleMesh = null;
    this.finderMesh = null;
    this.plate = null;
  }

  dispose() {
    this.stop();
    this.disposeContent();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.dispose();
  }
}
