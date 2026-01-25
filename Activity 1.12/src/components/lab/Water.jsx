import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useLabStore } from '../../store/useLabStore';
import { temperatureToColor } from '../../utils/materialHelpers';
import * as THREE from 'three';

// This component should be rendered as a CHILD of the Beaker group
// The parent Beaker handles positioning - Water just fills inside
export function Water() {
    const meshRef = useRef();
    const { scene } = useGLTF('/Water.glb');
    const waterMass = useLabStore((state) => state.waterMass);
    const temperature = useLabStore((state) => state.temperature);
    const hasIce = useLabStore((state) => state.hasIce); // Check if ice was placed
    const originalScale = useRef(null);

    // Clone the scene once and store original scale
    const waterScene = useMemo(() => {
        if (!scene) return null;
        const cloned = scene.clone();
        // Store original scale from the GLB model
        if (!originalScale.current) {
            originalScale.current = cloned.scale.clone();
        }
        return cloned;
    }, [scene]);

    // Calculate Y scale based on water mass
    // Keep X and Z at original scale to fit beaker (like reference)
    const initialMass = 0.05; // 50g when all ice melts
    const massRatio = Math.max(0.01, waterMass / initialMass);
    // Scale Y based on fill level (matching reference: targetHeight / beakerHeight)
    const scaleY = massRatio;

    useEffect(() => {
        if (!waterScene) return;

        // Apply water material - matching Activity 1.1 reference EXACTLY
        waterScene.traverse((child) => {
            if (child.isMesh) {
                // Apply material from reference (lines 44-56 of WaterSystem.js)
                if (!child.material.isLiquidMaterial) {
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0x2299ff,           // Blue water color from reference
                        transparent: true,
                        opacity: 0.6,              // From reference
                        metalness: 0.1,            // From reference
                        roughness: 0.1,            // From reference
                        transmission: 0.9,         // From reference
                        thickness: 0.5,            // From reference
                        envMapIntensity: 1.5,      // From reference
                        clearcoat: 0.3,            // From reference
                        clearcoatRoughness: 0.2,   // From reference
                        side: THREE.DoubleSide,    // From reference
                    });
                    child.material.isLiquidMaterial = true;
                }
                // Water stays blue at all temperatures - no color change

                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [waterScene, temperature]);

    // Only show water if ice was placed AND there's water from melting
    if (!hasIce || waterMass <= 0.001 || !waterScene) return null;

    // ============================================
    // MANUAL WATER SIZE CONTROL - CHANGE THESE VALUES
    // ============================================
    const WATER_SCALE_X = 0.5;   // Width  - make smaller to shrink
    const WATER_SCALE_Y = 0.5;   // Height - make smaller to shrink  
    const WATER_SCALE_Z = 0.5;   // Depth  - make smaller to shrink
    // Examples: 0.1 = very small, 0.5 = half, 1.0 = original, 2.0 = double
    // ============================================

    return (
        <group
            ref={meshRef}
            position={[0, 0, 0]}  // Position relative to beaker
            scale={[WATER_SCALE_X, scaleY * WATER_SCALE_Y, WATER_SCALE_Z]}
        >
            <primitive object={waterScene} />
        </group>
    );
}

// Preload the model
useGLTF.preload('/Water.glb');
