import { useRef, useEffect } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useLabStore } from '../../store/useLabStore';
import { formatTemperature } from '../../utils/dataExport';

export function Thermometer({ position = [0.5, 0.5, 0] }) {
    const groupRef = useRef();
    const { scene } = useGLTF('/Thermometer.glb');
    const temperature = useLabStore((state) => state.temperature);

    useEffect(() => {
        if (!scene) return;

        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    return (
        <group ref={groupRef} position={position} userData={{ type: 'thermometer', isDraggable: true }}>
            <primitive object={scene.clone()} scale={40} rotation={[0, 0, Math.PI / 6]} />

            {/* Temperature reading overlay */}
            <Html position={[0.2, 0.3, 0]} distanceFactor={8}>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(10px)',
                }}>
                    {formatTemperature(temperature)}
                </div>
            </Html>
        </group>
    );
}

// Preload the model
useGLTF.preload('/Thermometer.glb');
