import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useLabStore } from '../../store/useLabStore';
import * as THREE from 'three';

export function Beaker({ position = [0, 0, 0], children }) {
    const groupRef = useRef();
    const { scene } = useGLTF('/beaker.glb');
    const temperature = useLabStore((state) => state.temperature);

    useEffect(() => {
        if (!scene) return;

        // Apply environment map and material enhancements
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Enhance glass material
                if (child.material) {
                    child.material.envMapIntensity = 1.5;
                    child.material.needsUpdate = true;
                }
            }
        });
    }, [scene]);

    return (
        <group ref={groupRef} position={position} userData={{ type: 'beaker', isDraggable: true }}>
            <primitive object={scene.clone()} scale={0.6} />
            {/* Children (Water, Ice) are rendered inside the beaker group */}
            {/* They inherit beaker's position and move with it */}
            {children}
        </group>
    );
}

// Preload the model
useGLTF.preload('/beaker.glb');
