import * as THREE from "three";

export interface Section {
  a: number;
  b: number;
  rot?: number;
}

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const ramp = (s: number, a: number, b: number) =>
  THREE.MathUtils.clamp((s - a) / (b - a), 0, 1);

/**
 * Sweeps an elliptical cross-section along a polyline. `up` orients the
 * semi-axis `a`; `b` lies perpendicular to both the path and `a`.
 */
export function sweep(
  points: THREE.Vector3[],
  profile: (t: number) => Section,
  radial = 24,
  up = new THREE.Vector3(0, 1, 0),
) {
  const n = points.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const T = new THREE.Vector3();
  const U = new THREE.Vector3();
  const V = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    T.subVectors(points[Math.min(i + 1, n - 1)], points[Math.max(i - 1, 0)]).normalize();
    U.copy(up).addScaledVector(T, -up.dot(T));
    if (U.lengthSq() < 1e-4) U.set(1, 0, 0).addScaledVector(T, -T.x);
    U.normalize();
    V.crossVectors(T, U);
    const { a, b, rot = 0 } = profile(i / (n - 1));
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (let j = 0; j < radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const x = Math.cos(th) * a;
      const y = Math.sin(th) * b;
      const rx = x * c - y * s;
      const ry = x * s + y * c;
      pos.push(
        points[i].x + U.x * rx + V.x * ry,
        points[i].y + U.y * rx + V.y * ry,
        points[i].z + U.z * rx + V.z * ry,
      );
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.userData = { segs: n - 1, per: radial * 6 };
  return geo;
}

/** Shows only a fraction of a swept geometry — from the start, or from the end. */
export function setReveal(geo: THREE.BufferGeometry, frac: number, fromEnd = false) {
  const { segs, per } = geo.userData as { segs: number; per: number };
  const k = Math.floor(THREE.MathUtils.clamp(frac, 0, 1) * segs);
  geo.setDrawRange(fromEnd ? (segs - k) * per : 0, k * per);
}

/** Bowl-like lathe: super-elliptic wall with a rim, so the base stays flat-ish. */
export function bowlGeometry(R: number, H: number, wall = 0.05) {
  const curve = (r: number, y0: number, h: number, up: boolean) => {
    const out: THREE.Vector2[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const phi = up ? i / N : 1 - i / N;
      const rr = r * Math.pow(1 - Math.pow(1 - phi, 2.4), 1 / 2.4);
      out.push(new THREE.Vector2(Math.max(rr, 0.0001), y0 + h * phi));
    }
    return out;
  };
  const pts = [
    ...curve(R, 0, H, true),
    ...curve(R - wall, 0.06, H - 0.06, false),
  ];
  return new THREE.LatheGeometry(pts, 96);
}

export function coneGeometry(rimR: number, H: number) {
  const pts: THREE.Vector2[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(Math.max(rimR * t, 0.0001), H * t));
  }
  const inner = rimR - 0.045;
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    pts.push(new THREE.Vector2(Math.max(inner * t, 0.0001), H * t - 0.02 * (1 - t) - 0.0));
  }
  return new THREE.LatheGeometry(pts, 72);
}

/** Soft-serve spiral: coils tighten and rise toward a tip. */
export const SWIRL_BASE = 2.0;
export const SWIRL_H = 1.45;
export function swirlPoints(t0 = 0, t1 = 1, n = 420, grow = 0) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * (i / (n - 1));
    const ang = t * Math.PI * 2 * 4.2;
    const r = 0.46 * Math.pow(1 - t, 0.9) + grow * 0.5;
    const curl = t > 0.9 ? Math.pow((t - 0.9) / 0.1, 2) * 0.12 : 0;
    pts.push(new THREE.Vector3(Math.cos(ang) * r, SWIRL_BASE + t * SWIRL_H + curl, Math.sin(ang) * r));
  }
  return pts;
}
export const swirlRadius = (t: number) => 0.27 * (1 - 0.72 * t);
