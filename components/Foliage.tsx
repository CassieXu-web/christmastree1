import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';

// Shader for the golden/emerald glow
const vertexShader = `
  uniform float uTime;
  uniform float uSize;
  attribute float aScale;
  attribute vec3 aRandomPos;
  attribute vec3 aTargetPos;
  uniform float uProgress; // 0 = Chaos, 1 = Formed
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simple easing function
  float easeOutCubic(float x) {
    return 1.0 - pow(1.0 - x, 3.0);
  }

  void main() {
    // Interpolate positions
    vec3 pos = mix(aRandomPos, aTargetPos, easeOutCubic(uProgress));
    
    // Add some noise/wind movement
    float noise = sin(uTime * 2.0 + pos.y) * 0.05 * (1.0 - uProgress); 
    pos.x += noise;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Scale particles based on distance
    gl_PointSize = uSize * aScale * (30.0 / -mvPosition.z);
    
    // Color mixing: Chaos = Gold/White, Formed = Emerald/Gold
    vec3 emerald = vec3(0.0, 0.4, 0.15);
    vec3 gold = vec3(1.0, 0.84, 0.0);
    vec3 chaosColor = vec3(1.0, 0.9, 0.5); // Pale Gold
    
    // Mix based on height for gradient in tree form
    float heightMix = clamp((pos.y + 5.0) / 10.0, 0.0, 1.0);
    vec3 treeColor = mix(emerald, gold * 0.5, heightMix * 0.3);
    
    vColor = mix(chaosColor, treeColor, uProgress);
    vAlpha = 0.8 + 0.2 * sin(uTime * 3.0 + pos.x);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft edge glow
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

interface FoliageProps {
  count: number;
  state: AppState;
}

export const Foliage: React.FC<FoliageProps> = ({ count, state }) => {
  const meshRef = useRef<THREE.Points>(null);
  const uniforms = useRef({
    uTime: { value: 0 },
    uSize: { value: 12.0 },
    uProgress: { value: 0 },
  });

  const { targetPositions, randomPositions, scales } = useMemo(() => {
    const tPos = new Float32Array(count * 3);
    const rPos = new Float32Array(count * 3);
    const s = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Target: Cone Shape
      // Height from -4 to 6
      const h = Math.random() * 10 - 4;
      // Radius decreases as height increases
      const normHeight = (h + 4) / 10; // 0 to 1
      const maxRadius = 4.5 * (1.0 - normHeight);
      
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * maxRadius;

      const tx = Math.cos(angle) * radius;
      const ty = h;
      const tz = Math.sin(angle) * radius;

      tPos[i * 3] = tx;
      tPos[i * 3 + 1] = ty;
      tPos[i * 3 + 2] = tz;

      // Chaos: Sphere/Cloud Shape
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 10 + Math.random() * 10; // Wide dispersion

      rPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      rPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      rPos[i * 3 + 2] = r * Math.cos(phi);

      // Scale variation
      s[i] = Math.random() * 0.5 + 0.5;
    }
    return { targetPositions: tPos, randomPositions: rPos, scales: s };
  }, [count]);

  useFrame((stateThree, delta) => {
    if (meshRef.current) {
      uniforms.current.uTime.value += delta;
      
      // Interpolate progress
      const target = state === AppState.FORMED ? 1.0 : 0.0;
      uniforms.current.uProgress.value = THREE.MathUtils.lerp(
        uniforms.current.uProgress.value,
        target,
        delta * 2.5 // Animation speed
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={targetPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPos" count={count} array={targetPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandomPos" count={count} array={randomPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};