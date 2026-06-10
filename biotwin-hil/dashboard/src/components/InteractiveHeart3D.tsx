"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useSensor } from "@/context/SensorContext";

function HeartMesh({ stress }: { stress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  // Speed up pulsing based on stress: 
  // 0-30: slow beat
  // 31-70: moderate beat
  // 71-100: fast beat
  const pulseFreq = stress <= 30 ? 3.5 : stress <= 70 ? 7.0 : 12.0;
  
  // Decide color based on stress
  const color = stress <= 30 ? "#10b981" : stress <= 70 ? "#fbbf24" : "#ef4444";

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (meshRef.current) {
      // Slow rotation on Y axis
      meshRef.current.rotation.y = time * 0.4;
      meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.1; // Gentle rock

      // Heartbeat pulse calculation using sine wave
      const pulse = 1.0 + Math.max(0, Math.sin(time * pulseFreq)) * 0.08 * (stress > 70 ? 1.5 : 1.0);
      meshRef.current.scale.set(pulse, pulse, pulse);
    }

    if (shellRef.current) {
      shellRef.current.rotation.y = time * 0.4;
      shellRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
      const pulse = 1.15 + Math.max(0, Math.sin(time * pulseFreq)) * 0.08 * (stress > 70 ? 1.5 : 1.0);
      shellRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const heartShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.45);
    s.bezierCurveTo(0.25, 0.75, 0.75, 0.65, 0.75, 0.25);
    s.bezierCurveTo(0.75, -0.3, 0.15, -0.6, 0, -0.9);
    s.bezierCurveTo(-0.15, -0.6, -0.75, -0.3, -0.75, 0.25);
    s.bezierCurveTo(-0.75, 0.65, -0.25, 0.75, 0, 0.45);
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  }), []);

  return (
    <group position={[0, 0.25, 0]}>
      {/* Outer pulsing outline shell if stress > 80 */}
      {stress > 80 && (
        <mesh ref={shellRef}>
          <extrudeGeometry args={[heartShape, extrudeSettings]} />
          <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.25} />
        </mesh>
      )}
      <mesh ref={meshRef}>
        <extrudeGeometry args={[heartShape, extrudeSettings]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2} 
          metalness={0.8}
          emissive={color}
          emissiveIntensity={stress > 70 ? 0.35 : stress <= 30 ? 0.1 : 0.2}
        />
      </mesh>
    </group>
  );
}

export default function InteractiveHeart3D() {
  const { sensorData } = useSensor();
  const stress = sensorData.stress;

  return (
    <div className="relative w-full h-full bg-[#020406] rounded-2xl overflow-hidden border border-white/5 shadow-2xl flex flex-col items-center justify-center">


      {/* Canvas */}
      <div className="w-full h-full">
        <Canvas camera={{ position: [0, 0, 2.2], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.8} />
          <directionalLight position={[-5, 5, 5]} intensity={1.2} />
          <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={1} castShadow />
          
          <HeartMesh stress={stress} />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false}
            minDistance={1.2}
            maxDistance={3.5}
          />
        </Canvas>
      </div>

      {/* Outermost border color based on stress status */}
      <div className={`absolute inset-0 border rounded-2xl pointer-events-none transition-colors duration-700 ${stress <= 30 ? "border-emerald-500/20" : stress <= 70 ? "border-amber-500/20" : "border-red-500/30"}`} />
    </div>
  );
}
