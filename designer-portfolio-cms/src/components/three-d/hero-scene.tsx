"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, Lightformer } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import type { HeroFlags } from "./hero-3d";

/* Mouse-driven parallax rig: rotates the whole group with the pointer
   and slowly with scroll. `strength` (0–1) scales every pointer-driven
   term — 0 makes the rig pointer-static (parallaxEnabled === false). */
function Rig({
  children,
  strength = 1,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame((state, delta) => {
    if (!group.current) return;
    const scrollBoost = Math.min(window.scrollY / 2400, 1);
    group.current.rotation.y += delta * 0.08 + scrollBoost * delta * 0.6 * strength;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      pointer.y * 0.18 * strength,
      0.05
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      pointer.x * 0.12 * strength,
      0.05
    );
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      pointer.x * 0.25 * strength,
      0.05
    );
  });

  return <group ref={group}>{children}</group>;
}

function ChromeSculpture() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.z = state.clock.elapsedTime * 0.15;
    }
  });
  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1.1}>
      <mesh ref={mesh} position={[0.55, 0, 0]} scale={1.0}>
        <torusKnotGeometry args={[1, 0.32, 180, 32]} />
        <meshStandardMaterial
          color="#d8d8d8"
          metalness={1}
          roughness={0.16}
          envMapIntensity={1.4}
        />
      </mesh>
    </Float>
  );
}

function GlassSatellite({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2.2} rotationIntensity={1.4} floatIntensity={2}>
      <mesh position={position}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshPhysicalMaterial
          transmission={0.92}
          thickness={1.2}
          roughness={0.12}
          ior={1.45}
          color="#ffffff"
          envMapIntensity={1.6}
        />
      </mesh>
    </Float>
  );
}

function RingOrbit() {
  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.6}>
      <mesh position={[0, 0, -1.2]} rotation={[Math.PI / 2.6, 0.4, 0]}>
        <torusGeometry args={[2.5, 0.015, 12, 120]} />
        <meshStandardMaterial color="#c6ff00" metalness={0.6} roughness={0.3} />
      </mesh>
    </Float>
  );
}

function Particles({ count = 420 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#c6ff00"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function HeroScene({
  mobile = false,
  flags,
}: {
  mobile?: boolean;
  flags?: HeroFlags;
}) {
  // animationIntensity (0–100) scales particle count and parallax strength.
  // Undefined/invalid → documented default of 70.
  const raw = flags?.animationIntensity;
  const factor =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.min(Math.max(raw, 0), 100) / 100
      : 0.7;

  const showParticles = flags?.particlesEnabled !== false;
  // Particle count: desktop base 420 / mobile base 180, scaled by intensity,
  // clamped to a floor of 40 so the scene never feels empty.
  const particleCount = Math.max(40, Math.round((mobile ? 180 : 420) * factor));
  // Parallax strength scales with intensity; fully static when disabled.
  const parallaxStrength = flags?.parallaxEnabled === false ? 0 : factor;

  return (
    <Canvas
      dpr={[1, mobile ? 1.2 : 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Rig strength={parallaxStrength}>
        <ChromeSculpture />
        <GlassSatellite position={[-1.6, 1.2, -0.4]} />
        <GlassSatellite position={[2.55, -1.0, -0.8]} />
        <RingOrbit />
        {showParticles && <Particles count={particleCount} />}
      </Rig>
      {/* Procedural environment — no external HDR fetch */}
      <Environment resolution={128}>
        <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 9, 1]} />
        <Lightformer intensity={1.1} color="#c6ff00" position={[-5, 0.6, -1]} scale={[5, 2.6, 1]} />
        <Lightformer intensity={0.9} color="#ffffff" position={[5, -1, 0]} scale={[4, 4, 1]} />
        <Lightformer intensity={0.5} position={[0, -5, 2]} rotation-x={-Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>
    </Canvas>
  );
}
