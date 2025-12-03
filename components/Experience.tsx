import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, HandData } from '../types';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';

interface ExperienceProps {
  appState: AppState;
  handData: HandData;
}

export const Experience: React.FC<ExperienceProps> = ({ appState, handData }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current && handData.isDetected) {
        // Rotate tree slightly based on hand X position
        const targetRotY = handData.position.x * 0.5;
        const targetRotX = handData.position.y * 0.2;
        
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2);
    } else if (groupRef.current) {
        // Idle rotation
        groupRef.current.rotation.y += delta * 0.1;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 18]} fov={50} />
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.5}
        maxDistance={30}
        minDistance={10}
      />

      {/* Luxury Lighting */}
      <Environment preset="lobby" background={false} />
      <ambientLight intensity={0.5} color="#ffffff" />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffddaa" />
      <pointLight position={[-10, 5, 10]} intensity={1.0} color="#aaddff" />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        color="#fff0d0"
      />

      {/* Main Content Group */}
      <group ref={groupRef} position={[0, -2, 0]}>
         {/* The Tree Body (Needles) */}
         <Foliage count={3000} state={appState} />
         
         {/* Decorations */}
         <Ornaments state={appState} />

         {/* Tree Trunk Base */}
         <mesh position={[0, -3.5, 0]}>
            <cylinderGeometry args={[0.5, 1, 3, 16]} />
            <meshStandardMaterial color="#3e2723" roughness={0.9} />
         </mesh>
         
         {/* Floor Reflection Plane */}
         <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial 
                color="#001a0d" 
                roughness={0.1} 
                metalness={0.5} 
                transparent 
                opacity={0.8}
            />
         </mesh>
      </group>

      {/* Post Processing for Luxury Glow */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.8} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </>
  );
};