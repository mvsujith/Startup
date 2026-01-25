import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useEnvironment } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { useLabStore } from '../../store/useLabStore';
import * as THREE from 'three';
import { createIceMaterial } from '../../utils/materialHelpers';

// FIRST STAGE - Fresh ice cubes (when mass > 60%)
const ICE_CUBE_POSITIONS_STAGE1 = [
    [0, 2, 0],              // Center
    [-0.15, 3.5, -0.1],     // Left-back
    [0.08, 0.4, 0.12],      // Right-front
];

// SECOND STAGE - Melting ice cubes (when mass < 60%)
// CHANGE THESE POSITIONS BELOW to move the 2nd state ice cubes
const ICE_CUBE_POSITIONS_STAGE2 = [
    [0, 2, 0],              // Center
    [-0.15, 3.5, -0.1],     // Left-back
    [0.08, 0.4, 0.12],      // Right-front
];

export function Ice({ position = [0, 0.3, 0] }) {
    const groupRef = useRef();
    const iceMass = useLabStore((state) => state.iceMass);
    const phase = useLabStore((state) => state.phase);
    const burnerOn = useLabStore((state) => state.burnerOn);
    const { scene: gl } = useThree();
    const materialInitialized = useRef(false);
    const cubeRefs = useRef([]);
    const basePositionsRef = useRef([]);
    const burnerDropRef = useRef(0);

    // Load both ice states
    const { scene: iceStarting } = useGLTF('/Icecube starting state.glb');
    const { scene: iceMelting } = useGLTF('/Ice cude 2nd state.glb');

    // Calculate opacity and scale based on ice mass
    const initialMass = 0.05; // 50g total
    const massRatio = iceMass / initialMass;
    const opacity = Math.max(0, massRatio);
    const scale = Math.max(0.1, Math.pow(massRatio, 1 / 3)); // Cubic root for volume scaling

    // Choose which model to show based on melting state
    const currentScene = useMemo(() => {
        materialInitialized.current = false; // Reset when scene changes
        if (massRatio > 0.6) {
            return iceStarting?.clone();
        } else if (massRatio > 0.1) {
            return iceMelting?.clone();
        }
        return iceMelting?.clone();
    }, [massRatio, iceStarting, iceMelting]);

    // Use useFrame to ensure materials are applied after environment is ready
    useFrame(() => {
        if (!currentScene || materialInitialized.current) return;
        const isMeltingModel = massRatio <= 0.6;

        currentScene.traverse((child) => {
            if (child.isMesh) {
                // PRESERVE the original material from the GLB file
                // Just enhance it with environment map and other properties
                if (child.material) {
                    // Keep the original material but enhance it
                    if (child.material.color) {
                        child.material.color.set(0x87ceeb);
                    }
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                    child.material.envMapIntensity = 1.3;
                    child.material.needsUpdate = true;
                } else {
                    // Fallback: create material only if none exists
                    const iceMat = createIceMaterial();
                    iceMat.opacity = opacity;
                    iceMat.needsUpdate = true;
                    child.material = iceMat;
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        materialInitialized.current = true;
    });

    // Update opacity when it changes
    useEffect(() => {
        if (!currentScene || !materialInitialized.current) return;

        currentScene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = opacity;
                child.material.needsUpdate = true;
            }
        });
    }, [currentScene, opacity]);

    // Store stable rotations per cube (so they don't flicker)
    // Must be BEFORE any early returns (Rules of Hooks)
    const rotations = useMemo(() => [
        [Math.random() * 0.3 - 0.15, Math.random() * Math.PI * 2, Math.random() * 0.3 - 0.15],
        [Math.random() * 0.3 - 0.15, Math.random() * Math.PI * 2, Math.random() * 0.3 - 0.15],
        [Math.random() * 0.3 - 0.15, Math.random() * Math.PI * 2, Math.random() * 0.3 - 0.15],
    ], []); // Empty deps = only calculate once

    const shouldRender = iceMass > 0.001 && currentScene;

    // Always show all cubes (not decreasing number like before)
    // Just swap the model and reduce overall opacity as it melts
    const cubeOpacity = opacity * (massRatio > 0.5 ? 1 : 0.6); // Slightly more transparent when melting

    // Adjust scale based on which model to keep consistent size
    // Second state model might be larger, so reduce its scale
    const modelScale = 4; // Keep melting model size consistent with starting model

    // Check if we're in stage 2 (melting)
    const isStage2 = massRatio <= 0.6;

    // For stage 2, calculate dynamic Y positions - cubes sink as they melt
    // The top 2 cubes (index 0 and 1) will sink toward water level
    const getAnimatedPosition = (basePos, index) => {
        if (!isStage2) {
            // Stage 1: use original positions
            return basePos;
        }

        // Stage 2: animate top 2 cubes sinking
        // Calculate how much the cube has melted (0.6 to 0.1 range)
        // Normalize: 0.6 = just started melting, 0.1 = almost gone
        const meltProgress = 1 - ((massRatio - 0.1) / 0.5); // 0 at start, 1 at end

        // Water level Y position (where cubes should sink to)
        const waterLevelY = 0.5;

        // Only animate the top 2 cubes (index 0 and 1)
        if (index === 0 || index === 1) {
            const startY = basePos[1];  // Original Y position
            const targetY = waterLevelY; // Sink to water level
            // Lerp from start to target based on melt progress
            const animatedY = startY - (startY - targetY) * meltProgress;
            return [basePos[0], animatedY, basePos[2]];
        }

        // Bottom cube stays in place
        return basePos;
    };

    // Choose which position array to use based on stage
    const positions = massRatio > 0.6 ? ICE_CUBE_POSITIONS_STAGE1 : ICE_CUBE_POSITIONS_STAGE2;

    // rotations are already calculated above (before early return)

    const basePositions = positions.map((pos, index) => getAnimatedPosition(pos, index));

    useEffect(() => {
        basePositionsRef.current = basePositions;
    }, [basePositions]);

    useFrame((_, delta) => {
        const maxDrop = 0.6;
        const dropSpeed = 0.5;

        if (burnerOn) {
            burnerDropRef.current = Math.min(maxDrop, burnerDropRef.current + dropSpeed * delta);
        } else {
            burnerDropRef.current = Math.max(0, burnerDropRef.current - dropSpeed * delta);
        }

        const currentBases = basePositionsRef.current;
        const minY = currentBases.length
            ? Math.min(...currentBases.map((pos) => pos[1]))
            : null;

        cubeRefs.current.forEach((cube, index) => {
            if (!cube) return;

            const basePos = currentBases[index];
            if (basePos) {
                const isBottomCube = minY !== null && basePos[1] === minY;
                const drop = isBottomCube ? 0 : burnerDropRef.current;
                cube.position.set(basePos[0], basePos[1] - drop, basePos[2]);
            }

            if (burnerOn) {
                const isBottomCube = minY !== null && basePos && basePos[1] === minY;
                if (isBottomCube) {
                    cube.rotation.y += delta * 1.1;
                } else {
                    cube.rotation.x += delta * 0.8;
                    cube.rotation.y += delta * 1.1;
                    cube.rotation.z += delta * 0.6;
                }
            } else {
                cube.rotation.x = THREE.MathUtils.lerp(cube.rotation.x, rotations[index][0], 0.08);
                cube.rotation.y = THREE.MathUtils.lerp(cube.rotation.y, rotations[index][1], 0.08);
                cube.rotation.z = THREE.MathUtils.lerp(cube.rotation.z, rotations[index][2], 0.08);
            }
        });
    });

    if (!shouldRender) return null;

    return (
        <group ref={groupRef}>
            {positions.map((pos, index) => (
                <group
                    key={index}
                    ref={(el) => {
                        cubeRefs.current[index] = el;
                    }}
                    position={getAnimatedPosition(pos, index)}
                    scale={scale * modelScale}
                    rotation={rotations[index]}
                >
                    <primitive object={currentScene.clone()} />
                </group>
            ))}
        </group>
    );
}

// Preload both models
useGLTF.preload('/Icecube starting state.glb');
useGLTF.preload('/Ice cude 2nd state.glb');
