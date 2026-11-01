"use client";

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  SWIRL_BASE,
  SWIRL_H,
  bowlGeometry,
  coneGeometry,
  ramp,
  setReveal,
  smooth,
  sweep,
  swirlPoints,
  swirlRadius,
} from "@/lib/geometry";

const CREAM = "#eee2c8";
const CHOC = "#3a1b10";
const COAT_FROM = 0.04;

function useWaffleTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e3ac62";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#b5782f";
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(0, 64); g.lineTo(64, 0); g.lineTo(128, 64); g.lineTo(64, 128); g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(-64, 64); g.lineTo(0, 0); g.moveTo(128, 0); g.lineTo(192, 64);
    g.moveTo(-64, 64); g.lineTo(0, 128); g.moveTo(128, 128); g.lineTo(192, 64);
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

function World({ progress }: { progress: RefObject<number> }) {
  const { viewport, size } = useThree();
  const desktop = size.width > 900;

  const root = useRef<THREE.Group>(null!);
  const ribbon = useRef<THREE.Group>(null!);
  const bowl = useRef<THREE.Group>(null!);
  const mound = useRef<THREE.Mesh>(null!);
  const stream = useRef<THREE.Mesh>(null!);
  const pool = useRef<THREE.Group>(null!);
  const ripple = useRef<THREE.Mesh>(null!);
  const coneRig = useRef<THREE.Group>(null!);
  const coneSpin = useRef<THREE.Group>(null!);
  const swirl = useRef<THREE.Mesh>(null!);
  const coat = useRef<THREE.Mesh>(null!);
  const drips = useRef<THREE.Group>(null!);
  const drop = useRef<THREE.Mesh>(null!);
  const sm = useRef(0);

  const waffle = useWaffleTexture();

  const geo = useMemo(() => {
    const ribbonPts: THREE.Vector3[] = [];
    for (let i = 0; i < 260; i++) {
      const t = i / 259;
      const ang = t * Math.PI * 2 * 1.35;
      const r = 0.4 + 0.55 * Math.sin(Math.PI * t);
      ribbonPts.push(new THREE.Vector3(Math.cos(ang) * r, (t - 0.5) * 3.9, Math.sin(ang) * r));
    }
    const streamPts: THREE.Vector3[] = [];
    for (let i = 0; i < 80; i++) {
      const t = i / 79;
      streamPts.push(new THREE.Vector3(Math.sin(t * 9) * 0.015, -t, Math.cos(t * 7) * 0.015));
    }
    const swirlGeo = sweep(
      swirlPoints(),
      (u) => ({ a: swirlRadius(u) * 0.92, b: swirlRadius(u) }),
      22,
    );
    const coatGeo = sweep(
      swirlPoints(COAT_FROM, 1, 420, 0.012),
      (u) => {
        const t = COAT_FROM + (1 - COAT_FROM) * u;
        return { a: swirlRadius(t) * 0.92 + 0.055, b: swirlRadius(t) + 0.055 };
      },
      22,
    );
    return {
      ribbon: sweep(
        ribbonPts,
        (t) => {
          const k = Math.pow(Math.sin(Math.PI * t), 0.55);
          return { a: 0.46 * k + 0.02, b: 0.12 * k + 0.015, rot: t * Math.PI * 1.7 };
        },
        32,
      ),
      stream: sweep(
        streamPts,
        (t) => {
          const r = 0.15 + 0.05 * t + 0.015 * Math.sin(t * 34);
          return { a: r, b: r };
        },
        20,
        new THREE.Vector3(1, 0, 0),
      ),
      swirl: swirlGeo,
      coat: coatGeo,
      bowl: bowlGeometry(1.25, 1.3),
      pool: bowlGeometry(1.55, 0.95),
      cone: coneGeometry(0.68, 2.1),
      drip: new THREE.CapsuleGeometry(0.07, 1, 6, 14).translate(0, -0.5, 0),
    };
  }, []);

  const dripSpec = useMemo(() => {
    const y = SWIRL_BASE + COAT_FROM * SWIRL_H + 0.03;
    return Array.from({ length: 7 }, (_, k) => {
      const ang = (k / 7) * Math.PI * 2 + 0.4;
      const r = 0.46 * Math.pow(1 - COAT_FROM, 0.9) + swirlRadius(COAT_FROM) * 0.7;
      return {
        x: Math.cos(ang) * (r * 0.97),
        z: Math.sin(ang) * (r * 0.97),
        y,
        len: 0.14 + ((k * 37) % 10) / 10 * 0.28,
        delay: (k % 4) * 0.02,
      };
    });
  }, []);

  useFrame((state, dt) => {
    sm.current = THREE.MathUtils.damp(sm.current, progress.current * 4, 5, dt);
    const s = sm.current;
    const t = state.clock.elapsedTime;

    // layout: desktop keeps the 3D on the right half, mobile sits above the copy
    root.current.position.set(desktop ? viewport.width * 0.2 : 0, desktop ? 0 : viewport.height * 0.12, 0);
    root.current.scale.setScalar(desktop ? 1 : 0.72);
    root.current.position.y += Math.sin(t * 0.9) * 0.04;

    // 0 — cream ribbon
    const rY = 6.2 * smooth(ramp(s, 0.4, 1.05));
    ribbon.current.visible = s < 1.1;
    ribbon.current.position.y = rY + Math.sin(t * 0.8) * 0.08;
    ribbon.current.rotation.set(0, t * 0.35 + s * 1.6, -0.22);

    // 1 — steel bowl, filled with cream
    const g1 = ramp(s, 0.95, 2.0);
    const by =
      -5.8 + 5.0 * smooth(ramp(s, 0.45, 1.05)) + 6.8 * smooth(ramp(s, 2.0, 2.75));
    bowl.current.visible = s > 0.4 && s < 2.85;
    bowl.current.position.y = by;
    bowl.current.rotation.set(0.28, t * 0.15, 0);
    mound.current.visible = g1 > 0.01;
    mound.current.position.y = 0.1 + 0.5 * g1;
    mound.current.scale.set(0.7 + 0.25 * g1, 0.04 + 0.45 * g1, 0.7 + 0.25 * g1);
    const moundTop = by + 0.14 + 0.95 * g1;

    // 2 — waffle cone + soft serve
    const gs = ramp(s, 2.0, 2.85);
    const cy =
      -6.6 * (1 - smooth(ramp(s, 1.6, 2.3))) +
      1.2 * smooth(ramp(s, 2.95, 3.3)) -
      1.0 * smooth(ramp(s, 3.3, 3.6)) +
      0.9 * smooth(ramp(s, 3.6, 3.85)) -
      1.1 * smooth(ramp(s, 3.85, 4.0));
    coneRig.current.visible = s > 1.55;
    coneRig.current.position.y = cy;
    coneRig.current.rotation.z =
      Math.PI * smooth(ramp(s, 2.95, 3.35)) - Math.PI * smooth(ramp(s, 3.65, 3.95));
    coneSpin.current.rotation.y = t * 0.28;
    swirl.current.visible = gs > 0;
    setReveal(geo.swirl, gs);

    // pour stream: top -> bowl/screen top, bottom -> cream surface or swirl top
    const sTop = THREE.MathUtils.lerp(5.4, by + 0.05, ramp(s, 1.7, 2.0));
    const coneTarget = cy + SWIRL_BASE - 1.75 + SWIRL_H * gs * 0.9;
    let target = THREE.MathUtils.lerp(moundTop, coneTarget, ramp(s, 1.7, 2.0));
    target = THREE.MathUtils.lerp(target, sTop, ramp(s, 2.8, 3.1));
    const L = Math.max(sTop - (target - 0.1), 0.0001);
    stream.current.visible = s > 0.72 && s < 3.15 && L > 0.01;
    stream.current.position.set(0, sTop, 0);
    stream.current.scale.set(1 + Math.sin(t * 3) * 0.05, L, 1 + Math.sin(t * 3) * 0.05);
    setReveal(geo.stream, ramp(s, 0.72, 1.1));

    // 3 — chocolate pool
    const py =
      -6.2 + 4.6 * smooth(ramp(s, 2.8, 3.3)) - 4.6 * smooth(ramp(s, 3.85, 4.0));
    pool.current.visible = s > 2.75 && s < 4.02;
    pool.current.position.y = py;
    pool.current.rotation.set(0.28, 0, 0);
    const dipping = ramp(s, 3.3, 3.6) * (1 - ramp(s, 3.6, 3.9));
    ripple.current.visible = dipping > 0.02;
    const rp = (t * 0.7) % 1;
    ripple.current.scale.setScalar(0.25 + rp * 0.9);
    (ripple.current.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.35 * dipping;

    // chocolate shell climbs from the tip, then drips settle
    const f = ramp(s, 3.4, 3.78);
    coat.current.visible = f > 0;
    setReveal(geo.coat, f, true);
    const dp = ramp(s, 3.85, 4.0);
    drips.current.visible = dp > 0;
    drips.current.children.forEach((c, i) => {
      const sp = dripSpec[i];
      const k = smooth(ramp(dp, sp.delay, 1));
      c.scale.set(1, Math.max(0.0001, sp.len * k), 1);
    });
    const dd = ramp(s, 3.97, 4.0);
    drop.current.visible = dd > 0;
    const dph = (t * 0.55) % 1;
    drop.current.position.set(0, SWIRL_BASE - 1.75 - 0.2 - dph * dph * 1.6 - 0.0, 0.02);
    drop.current.position.y = -1.95 - dph * dph * 1.4;
    drop.current.scale.set(1, 1 + dph * 0.8, 1);
  });

  return (
    <group ref={root}>
      <group ref={ribbon}>
        <mesh geometry={geo.ribbon}>
          <meshPhysicalMaterial
            color={CREAM}
            roughness={0.3}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
            sheen={0.6}
            sheenColor={new THREE.Color("#fff3da")}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <group ref={bowl}>
        <mesh geometry={geo.bowl}>
          <meshStandardMaterial color="#e6e9ee" metalness={0.95} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={mound}>
          <sphereGeometry args={[1, 48, 24]} />
          <meshPhysicalMaterial color={CREAM} roughness={0.35} clearcoat={0.4} sheen={0.6} />
        </mesh>
      </group>

      <mesh ref={stream} geometry={geo.stream}>
        <meshPhysicalMaterial
          color={CREAM}
          roughness={0.25}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={pool}>
        <mesh geometry={geo.pool}>
          <meshStandardMaterial color="#e6e9ee" metalness={0.95} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 64]} />
          <meshPhysicalMaterial color="#1d0c05" roughness={0.25} clearcoat={0.3} clearcoatRoughness={0.15} envMapIntensity={0.22} />
        </mesh>
        <mesh ref={ripple} position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial color="#8a5a3c" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <group ref={coneRig}>
        <group position={[0, -1.75, 0]}>
          <group ref={coneSpin}>
            <mesh geometry={geo.cone}>
              <meshStandardMaterial
                map={waffle}
                bumpMap={waffle}
                bumpScale={2.5}
                roughness={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh ref={swirl} geometry={geo.swirl}>
              <meshPhysicalMaterial
                color={CREAM}
                roughness={0.36}
                clearcoat={0.25}
                sheen={0.7}
                sheenColor={new THREE.Color("#fff3da")}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh ref={coat} geometry={geo.coat}>
              <meshPhysicalMaterial
                color={CHOC}
                roughness={0.16}
                clearcoat={1}
                clearcoatRoughness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
            <group ref={drips}>
              {dripSpec.map((d, i) => (
                <mesh key={i} geometry={geo.drip} position={[d.x, d.y, d.z]}>
                  <meshPhysicalMaterial color={CHOC} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>

      <mesh ref={drop}>
        <sphereGeometry args={[0.065, 20, 20]} />
        <meshPhysicalMaterial color={CHOC} roughness={0.1} clearcoat={1} />
      </mesh>
    </group>
  );
}

export default function Scene({ progress }: { progress: RefObject<number> }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.2, 9.6], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, 2, 3]} intensity={0.7} color="#ffe9cf" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3.2} position={[3, 4, 5]} scale={[7, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 1, 4]} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, -3, 3]} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 5, -4]} scale={5} />
        <Lightformer form="rect" intensity={1.4} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[16, 16, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[9, 0, 0]} rotation-y={-Math.PI / 2} scale={[16, 8, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-9, 0, 0]} rotation-y={Math.PI / 2} scale={[16, 8, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[0, 0, -9]} scale={[16, 8, 1]} />
      </Environment>
      <World progress={progress} />
    </Canvas>
  );
}
