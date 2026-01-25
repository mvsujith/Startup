import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "./store/useLabStore";
import { Beaker } from "./components/lab/Beaker";
import { Ice } from "./components/lab/Ice";
import { Water } from "./components/lab/Water";
import { Thermometer } from "./components/lab/Thermometer";
import { Burner } from "./components/lab/Burner";
import { Steam } from "./components/lab/Steam";
import { ComponentPalette } from "./components/ui/ComponentPalette";
import { ControlPanel } from "./components/ui/ControlPanel";
import "./App.css";

const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;

function Scene() {
    const {
        hasBeaker,
        hasThermometer,
        hasBurner,
        hasIce,
        burnerOn,
        updateThermalState,
        logData,
        addObservation,
        phase,
    } = useLabStore();

    const lastLogTime = useRef(0);
    const lastPhaseRef = useRef(phase);

    // Animation loop for thermal simulation
    useEffect(() => {
        let lastTime = performance.now();
        let animationId;

        const animate = () => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;

            // Update thermal physics (runs for both heating AND cooling)
            if (hasBeaker) {
                updateThermalState(deltaTime);

                // Log data every 100ms to keep the graph in real time
                if (currentTime - lastLogTime.current > 100) {
                    logData();
                    lastLogTime.current = currentTime;
                }
            }

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [hasBeaker, updateThermalState, logData]);

    // Phase change observations
    useEffect(() => {
        if (phase !== lastPhaseRef.current) {
            const phaseMessages = {
                melting: "Ice is melting - temperature plateau at 0°C (latent heat absorption)",
                liquid: "All ice has melted - temperature rising above 0°C",
                boiling: "Water is boiling - temperature plateau at 100°C (latent heat of vaporization)",
                vapor: "All water has evaporated into steam",
            };

            if (phaseMessages[phase]) {
                addObservation(phaseMessages[phase]);
            }

            lastPhaseRef.current = phase;
        }
    }, [phase, addObservation]);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[5, 5, 5]}
                intensity={0.8}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            {/* Grid */}
            <gridHelper args={[GRID_SIZE, GRID_DIVISIONS, 0x888888, 0x444444]} material-opacity={0.5} material-transparent />

            {/* Environment for reflections */}
            <Environment preset="apartment" />

            {/* Lab components */}
            {hasBeaker && (
                <Beaker position={[0, 0, 0]}>
                    {/* Water and Ice are children of Beaker - they move with it */}
                    {/* Water positioned at (0,0,0) relative to beaker */}
                    <Water />
                    {hasIce && <Ice position={[0, 0.3, 0]} />}
                    {/* Steam appears above beaker when water boils */}
                    <Steam position={[0, 3, 0]} />
                </Beaker>
            )}

            {hasThermometer && <Thermometer position={[0.5, 0.5, 0]} />}
            {hasBurner && <Burner position={[0, -0.8, 0]} />}

            {/* Camera controls */}
            <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={3}
                maxDistance={20}
                maxPolarAngle={Math.PI / 2}
                target={[0, 0, 0]}
            />
        </>
    );
}

function App() {
    const handleDrop = (e) => {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('componentType');

        const store = useLabStore.getState();
        const actions = {
            beaker: store.placeBeaker,
            ice: store.placeIce,
            thermometer: store.placeThermometer,
            burner: store.placeBurner,
        };

        if (componentType && actions[componentType]) {
            actions[componentType]();
            store.addObservation(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} added to workspace`);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    return (
        <div className="lab-app">
            <ComponentPalette />
            <ControlPanel />

            <div
                className="main-canvas"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <Canvas
                    camera={{ position: [0, 10, 15], fov: 75 }}
                    shadows
                    gl={{
                        antialias: true,
                        alpha: true,
                        logarithmicDepthBuffer: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.0,
                        outputColorSpace: THREE.SRGBColorSpace,
                    }}
                >
                    <color attach="background" args={['#0f162e']} />
                    <Scene />
                </Canvas>
            </div>
        </div>
    );
}

export default App;
