import { useRef, useEffect, useMemo } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { createBurnerMaterial } from '../../utils/materialHelpers';
import * as THREE from 'three';

export function Burner({ position = [0, -0.8, 0] }) {
    const meshRef = useRef();
    const flameRef = useRef();
    const burnerOn = useLabStore((state) => state.burnerOn);

    // Create burner geometry (simple cylinder hotplate)
    const burnerGeometry = useMemo(() => new THREE.CylinderGeometry(2, 2, 0.1, 32), []);
    const coilGeometry = useMemo(() => new THREE.TorusGeometry(0.3, 0.02, 16, 32), []);

    // Burner material (changes based on ON/OFF state)
    const burnerMaterial = useMemo(() => createBurnerMaterial(burnerOn), [burnerOn]);

    // Flame particle effect (simple emissive sphere when ON)
    useEffect(() => {
        if (flameRef.current) {
            flameRef.current.visible = burnerOn;
        }
    }, [burnerOn]);

    return (
        <group position={position} userData={{ type: 'burner', isDraggable: true }}>
            {/* Base */}
            <mesh ref={meshRef} geometry={burnerGeometry} material={burnerMaterial} castShadow receiveShadow>
            </mesh>

            {/* Heating coil */}
            <mesh
                geometry={coilGeometry}
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0.06, 0]}
            >
                <meshStandardMaterial
                    color={burnerOn ? 0xff4400 : 0x666666}
                    emissive={burnerOn ? 0xff2200 : 0x000000}
                    emissiveIntensity={burnerOn ? 0.8 : 0}
                    metalness={0.8}
                    roughness={0.3}
                />
            </mesh>

            {/* Flame effect (when burner is ON) */}
            {burnerOn && (
                <group ref={flameRef} position={[0, 0.3, 0]}>
                    <pointLight color={0xff4400} intensity={2} distance={3} decay={2} />
                    <mesh position={[0, 0.1, 0]}>
                        <sphereGeometry args={[0.5, 16, 16]} />
                        <meshStandardMaterial
                            color={0xff6600}
                            emissive={0xff3300}
                            emissiveIntensity={1.5}
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                </group>
            )}
        </group>
    );
}
