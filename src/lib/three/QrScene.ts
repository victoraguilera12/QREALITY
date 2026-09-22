import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  QUIET_ZONE,
  eyeBallColorOf,
  eyeFrameColorOf,
  inLogoZone,
  type QrDesign,
} from "../qr/design";
import { finderOrigins, inFinder, isDark, type QrMatrix } from "../qr/matrix";
import {
  BODY_OUTLINES,
  EYE_BALL_OUTLINES,
  EYE_FRAME_OUTLINES,
} from "../qr/outline";
import {
  frameGeometry,
  profiledGeometry,
  PROFILES,
  PROFILE_SEGMENTS,
} from "./shapes";

const FOV = 24;
const TILT_MAX = THREE.MathUtils.degToRad(54);
const AZIM_MAX = THREE.MathUtils.degToRad(26);
/** Fraction of the timeline consumed by the centre-out stagger. */
const STAGGER_SPREAD = 0.45;
const FLAT_EPSILON = 0.012;
const LOGO_LIFT = 0.03;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function standard(color: string) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.55,
    metalness: 0.04,
  });
}

export class QrScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
  private group = new THREE.Group();

  private moduleMesh: THREE.InstancedMesh | null = null;
  private frameMesh: THREE.Mesh | null = null;
  private ballMesh: THREE.Mesh | null = null;
  private plate: THREE.Mesh | null = null;
  private logoMesh: THREE.Mesh | null = null;

  private delays = new Float32Array(0);
  private origins = new Float32Array(0);
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
    const segments = PROFILE_SEGMENTS[design.body] ?? 4;
    const profile = PROFILES[design.profile];

    const positions: number[] = [];
    const delays: number[] = [];
    const maxDist = Math.hypot(half, half);

    for (let y = 0; y < matrix.size; y++) {
      for (let x = 0; x < matrix.size; x++) {
        if (!isDark(matrix, x, y)) continue;
        if (inFinder(matrix.size, x, y)) continue;
        if (inLogoZone(design, matrix.size, x, y)) continue;
        const wx = x + 0.5 - half;
        const wy = half - y - 0.5;
        positions.push(wx, wy);
        delays.push(Math.min(1, Math.hypot(wx, wy) / maxDist));
      }
    }

    this.origins = new Float32Array(positions);
    this.delays = new Float32Array(delays);

    if (delays.length > 0) {
      this.moduleMesh = new THREE.InstancedMesh(
        profiledGeometry(BODY_OUTLINES[design.body], profile, segments),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.55,
          metalness: 0.04,
        }),
        delays.length,
      );
      this.moduleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(this.moduleMesh);
    }

    const frameSpec = EYE_FRAME_OUTLINES[design.eyeFrame];
    const frameSegments = PROFILE_SEGMENTS[design.eyeFrame] ?? 5;
    const ballSegments = PROFILE_SEGMENTS[design.eyeBall] ?? 5;
    const frames: THREE.BufferGeometry[] = [];
    const balls: THREE.BufferGeometry[] = [];

    for (const [fx, fy] of finderOrigins(matrix.size)) {
      const cx = fx + 3.5 - half;
      const cy = half - fy - 3.5;
      const f = frameGeometry(frameSpec.outer, frameSpec.inner, frameSegments);
      f.translate(cx, cy, 0);
      frames.push(f);
      const b = profiledGeometry(
        EYE_BALL_OUTLINES[design.eyeBall],
        profile,
        ballSegments,
      );
      b.scale(3, 3, 1);
      b.translate(cx, cy, 0);
      balls.push(b);
    }

    const mergedFrames = mergeGeometries(frames, false);
    for (const g of frames) g.dispose();
    if (mergedFrames) {
      this.frameMesh = new THREE.Mesh(
        mergedFrames,
        standard(eyeFrameColorOf(design)),
      );
      this.group.add(this.frameMesh);
    }

    const mergedBalls = mergeGeometries(balls, false);
    for (const g of balls) g.dispose();
    if (mergedBalls) {
      this.ballMesh = new THREE.Mesh(
        mergedBalls,
        standard(eyeBallColorOf(design)),
      );
      this.group.add(this.ballMesh);
    }

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

    this.buildLogo(design, matrix.size);
    this.applyColors(design);
    this.resize();
    this.setProgress(this.progress);
  }

  private buildLogo(design: QrDesign, size: number) {
    if (!design.logo) return;
    const w = design.logo.size * size;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w),
      // Basic keeps brand colours exactly as uploaded, unlit.
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    );
    mesh.position.z = LOGO_LIFT;
    this.logoMesh = mesh;
    this.group.add(mesh);

    new THREE.TextureLoader().load(design.logo.src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map = texture;
      material.needsUpdate = true;
    });
  }

  applyColors(design: QrDesign) {
    if (this.moduleMesh) {
      const from = new THREE.Color(design.fg);
      const to = new THREE.Color(design.gradientTo);
      const colour = new THREE.Color();
      const rad = (design.gradientAngle * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = -Math.sin(rad);
      const radius = this.span / 2;

      for (let i = 0; i < this.delays.length; i++) {
        const x = this.origins[i * 2];
        const y = this.origins[i * 2 + 1];
        let t = 0;
        if (design.colorMode === "gradient") {
          t =
            design.gradientType === "radial"
              ? Math.hypot(x, y) / radius
              : 0.5 + (x * dx + y * dy) / this.span;
        }
        colour.copy(from).lerp(to, THREE.MathUtils.clamp(t, 0, 1));
        this.moduleMesh.setColorAt(i, colour);
      }
      if (this.moduleMesh.instanceColor)
        this.moduleMesh.instanceColor.needsUpdate = true;
    }
    (this.frameMesh?.material as THREE.MeshStandardMaterial | undefined)?.color.set(
      eyeFrameColorOf(design),
    );
    (this.ballMesh?.material as THREE.MeshStandardMaterial | undefined)?.color.set(
      eyeBallColorOf(design),
    );
    (this.plate?.material as THREE.MeshStandardMaterial | undefined)?.color.set(
      design.bg,
    );
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
    // Finders sit at the corners, so they are the last thing to rise.
    const corner = this.heightAt(1);
    if (this.frameMesh) this.frameMesh.scale.z = corner;
    if (this.ballMesh) this.ballMesh.scale.z = corner;
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
    // Lofted modules carry no uv while ExtrudeGeometry does; mergeGeometries
    // rejects a mixed attribute set, and a mesh export has no use for uv.
    const strip = (g: THREE.BufferGeometry) => {
      g.deleteAttribute("uv");
      return g;
    };
    if (this.moduleMesh) {
      const base = this.moduleMesh.geometry;
      for (let i = 0; i < this.delays.length; i++) {
        const g = strip(base.clone());
        g.scale(1, 1, this.depth);
        g.translate(this.origins[i * 2], this.origins[i * 2 + 1], 0);
        parts.push(g);
      }
    }
    for (const mesh of [this.frameMesh, this.ballMesh]) {
      if (!mesh) continue;
      const g = strip(mesh.geometry.clone());
      g.scale(1, 1, this.depth);
      parts.push(g);
    }
    const box = new THREE.BoxGeometry(this.span, this.span, this.plateDepth);
    box.translate(0, 0, -this.plateDepth / 2);
    // ExtrudeGeometry is non-indexed; mergeGeometries refuses a mixed set.
    const plate = strip(box.toNonIndexed());
    box.dispose();
    parts.push(plate);

    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    return merged;
  }

  private disposeContent() {
    const children = [
      this.moduleMesh,
      this.frameMesh,
      this.ballMesh,
      this.plate,
      this.logoMesh,
    ];
    for (const child of children) {
      if (!child) continue;
      this.group.remove(child);
      child.geometry.dispose();
      const material = child.material as THREE.Material & {
        map?: THREE.Texture | null;
      };
      material.map?.dispose();
      material.dispose();
    }
    this.moduleMesh = null;
    this.frameMesh = null;
    this.ballMesh = null;
    this.plate = null;
    this.logoMesh = null;
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
