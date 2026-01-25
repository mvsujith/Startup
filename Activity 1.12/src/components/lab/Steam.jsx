import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLabStore } from '../../store/useLabStore';
import * as THREE from 'three';

// Steam particle system for boiling water
export function Steam({ position = [0, 0, 0] }) {
    const pointsRef = useRef();
    const temperature = useLabStore((state) => state.temperature);
    const phase = useLabStore((state) => state.phase);

    // Number of particles
    const PARTICLE_COUNT = 150;

    // Steam intensity based on temperature
    // Starts faintly at 80°C, full intensity at 100°C
    // This allows gradual fade when cooling
    const steamStartTemp = 80;  // Start showing steam
    const steamFullTemp = 100;  // Full steam intensity
    const steamIntensity = temperature >= steamStartTemp
        ? Math.min(1, (temperature - steamStartTemp) / (steamFullTemp - steamStartTemp))
        : 0;
    const isActive = steamIntensity > 0.01;

    // Create particle positions and velocities
    const { positions, velocities, lifetimes, initialPositions } = useMemo(() => {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const velocities = new Float32Array(PARTICLE_COUNT * 3);
        const lifetimes = new Float32Array(PARTICLE_COUNT);
        const initialPositions = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Random starting position within beaker opening
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.3; // Spread within beaker

            positions[i * 3] = Math.cos(angle) * radius;     // X
            positions[i * 3 + 1] = Math.random() * 2;        // Y (start at different heights)
            positions[i * 3 + 2] = Math.sin(angle) * radius; // Z

            // Store initial positions for reset
            initialPositions[i * 3] = positions[i * 3];
            initialPositions[i * 3 + 1] = 0;
            initialPositions[i * 3 + 2] = positions[i * 3 + 2];

            // Random upward velocity with slight drift
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;     // X drift
            velocities[i * 3 + 1] = 0.03 + Math.random() * 0.05;  // Y upward (stronger for higher rise)
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // Z drift

            // Random lifetime for staggered animation
            lifetimes[i] = Math.random();
        }

        return { positions, velocities, lifetimes, initialPositions };
    }, []);

    // Create geometry
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [positions]);

    // Animate particles
    useFrame((state, delta) => {
        if (!pointsRef.current || !isActive) return;

        const positionAttr = pointsRef.current.geometry.attributes.position;
        const posArray = positionAttr.array;
        const maxHeight = 6;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Update lifetime
            lifetimes[i] += delta * 0.5;

            if (lifetimes[i] > 1 || posArray[i * 3 + 1] > maxHeight) {
                // Reset particle
                lifetimes[i] = 0;
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.3;
                posArray[i * 3] = Math.cos(angle) * radius;
                posArray[i * 3 + 1] = 0;
                posArray[i * 3 + 2] = Math.sin(angle) * radius;
            } else {
                // Move particle upward with drift
                posArray[i * 3] += velocities[i * 3] + (Math.random() - 0.5) * 0.005;
                posArray[i * 3 + 1] += velocities[i * 3 + 1] * steamIntensity;
                posArray[i * 3 + 2] += velocities[i * 3 + 2] + (Math.random() - 0.5) * 0.005;

                // Add slight horizontal expansion as steam rises
                const height = posArray[i * 3 + 1];
                posArray[i * 3] *= 1 + height * 0.01;
                posArray[i * 3 + 2] *= 1 + height * 0.01;
            }
        }

        positionAttr.needsUpdate = true;
    });

    if (!isActive) return null;

    return (
        <group position={position}>
            <points ref={pointsRef} geometry={geometry}>
                <pointsMaterial
                    color={0xffffff}
                    size={0.08}
                    transparent
                    opacity={0.4 * steamIntensity}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    sizeAttenuation
                />
            </points>

            {/* Add subtle fog/glow effect */}
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshBasicMaterial
                    color={0xffffff}
                    transparent
                    opacity={0.1 * steamIntensity}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}
