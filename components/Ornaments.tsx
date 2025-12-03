import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';

interface OrnamentGroupProps {
  count: number;
  state: AppState;
  type: 'ball' | 'gift';
  color: string;
  metalness: number;
  roughness: number;
  scaleBase: number;
}

const OrnamentGroup: React.FC<OrnamentGroupProps> = ({ 
  count, state, type, color, metalness, roughness, scaleBase 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Data generation
  const { targets, randoms, scales } = useMemo(() => {
    const t = new Float32Array(count * 3);
    const r = new Float32Array(count * 3);
    const s = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Tree position (Target)
      // Spiral Phyllotaxis for ornaments
      const iNorm = i / count;
      const height = -3 + (iNorm * 9); // -3 to 6
      const normHeight = (height + 4) / 10;
      const maxR = 4.0 * (1.0 - normHeight);
      
      const angle = i * 2.4; // Golden angle approx
      const radius = maxR; // On the surface

      t[i * 3] = Math.cos(angle) * radius;
      t[i * 3 + 1] = height;
      t[i * 3 + 2] = Math.sin(angle) * radius;

      // Random position (Chaos)
      const rTheta = Math.random() * Math.PI * 2;
      const rPhi = Math.acos(Math.random() * 2 - 1);
      const rDist = 8 + Math.random() * 12;

      r[i * 3] = rDist * Math.sin(rPhi) * Math.cos(rTheta);
      r[i * 3 + 1] = rDist * Math.sin(rPhi) * Math.sin(rTheta);
      r[i * 3 + 2] = rDist * Math.cos(rPhi);

      s[i] = (Math.random() * 0.5 + 0.8) * scaleBase;
    }
    return { targets: t, randoms: r, scales: s };
  }, [count, scaleBase]);

  const geometry = useMemo(() => {
    return type === 'ball' ? new THREE.SphereGeometry(1, 16, 16) : new THREE.BoxGeometry(1, 1, 1);
  }, [type]);

  // Temp variables
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentProgress = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const targetProgress = state === AppState.FORMED ? 1 : 0;
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 2);

    const prog = currentProgress.current;
    
    // Smooth step for nicer ease
    const ease = 1 - Math.pow(1 - prog, 3);

    for (let i = 0; i < count; i++) {
      const tx = targets[i * 3];
      const ty = targets[i * 3 + 1];
      const tz = targets[i * 3 + 2];

      const rx = randoms[i * 3];
      const ry = randoms[i * 3 + 1];
      const rz = randoms[i * 3 + 2];

      dummy.position.set(
        THREE.MathUtils.lerp(rx, tx, ease),
        THREE.MathUtils.lerp(ry, ty, ease),
        THREE.MathUtils.lerp(rz, tz, ease)
      );

      // Rotate ornaments slightly in chaos, stable in tree
      dummy.rotation.set(
        prog * 0 + (1-prog) * (i + Date.now() * 0.001),
        prog * 0 + (1-prog) * (i + Date.now() * 0.001),
        prog * 0
      );

      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial 
        color={color} 
        metalness={metalness} 
        roughness={roughness} 
        emissive={color}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

// Photos Component
export const PhotoOrnaments: React.FC<{ count: number; state: AppState }> = ({ count, state }) => {
  // We render actual meshes inside a group instead of instanced mesh to support unique textures easily (simulated here)
  // For high performance with many textures, a texture atlas is better, but complexity is high. 
  // We will generate a limited set of textures.
  
  const groupRef = useRef<THREE.Group>(null);
  const currentProgress = useRef(0);
  
  const photos = useMemo(() => {
    const arr = [];
    for(let i=0; i<count; i++) {
      const iNorm = i / count;
      const height = -2 + (iNorm * 7); 
      const normHeight = (height + 4) / 10;
      const maxR = 4.2 * (1.0 - normHeight);
      const angle = i * 1.8 + 0.5;
      
      arr.push({
        targetPos: new THREE.Vector3(Math.cos(angle) * maxR, height, Math.sin(angle) * maxR),
        randomPos: new THREE.Vector3(
           (Math.random() - 0.5) * 20,
           (Math.random() - 0.5) * 20,
           (Math.random() - 0.5) * 20
        ),
        id: i
      });
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if(!groupRef.current) return;
    const targetProgress = state === AppState.FORMED ? 1 : 0;
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 1.5);
    const ease = 1 - Math.pow(1 - currentProgress.current, 3);

    groupRef.current.children.forEach((child, i) => {
        const p = photos[i];
        child.position.lerpVectors(p.randomPos, p.targetPos, ease);
        
        // Face outwards in tree mode, random spin in chaos
        if (ease > 0.8) {
           child.lookAt(0, child.position.y, 0); 
           child.rotateY(Math.PI); // Flip to face out
        } else {
           child.rotation.x += 0.01;
           child.rotation.y += 0.01;
        }
    });
  });

  return (
    <group ref={groupRef}>
      {photos.map((p, i) => (
         <Polaroid key={i} index={i} />
      ))}
    </group>
  );
};

const Polaroid: React.FC<{index: number}> = ({index}) => {
    // Random picsum image
    const url = `https://picsum.photos/seed/${index + 100}/200/200`;
    const texture = useLoader(THREE.TextureLoader, url);

    return (
        <group>
            {/* Frame */}
            <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[0.8, 1.0, 0.05]} />
                <meshStandardMaterial color="#fffff0" roughness={0.8} />
            </mesh>
            {/* Photo */}
            <mesh position={[0, 0.1, 0.02]}>
                <planeGeometry args={[0.7, 0.7]} />
                <meshBasicMaterial map={texture} />
            </mesh>
        </group>
    )
}

export const Ornaments: React.FC<{ state: AppState }> = ({ state }) => {
  return (
    <>
      {/* Gold Balls */}
      <OrnamentGroup 
        count={100} 
        state={state} 
        type="ball" 
        color="#FFD700" 
        metalness={1} 
        roughness={0.1}
        scaleBase={0.3}
      />
      {/* Red/Green Metallic Balls */}
      <OrnamentGroup 
        count={60} 
        state={state} 
        type="ball" 
        color="#8B0000" 
        metalness={0.8} 
        roughness={0.2} 
        scaleBase={0.25}
      />
      {/* Gifts */}
      <OrnamentGroup 
        count={30} 
        state={state} 
        type="gift" 
        color="#C0C0C0" 
        metalness={0.9} 
        roughness={0.3} 
        scaleBase={0.4}
      />
      {/* Photos */}
      <React.Suspense fallback={null}>
         <PhotoOrnaments count={24} state={state} />
      </React.Suspense>
    </>
  );
};