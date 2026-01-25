import { create } from 'zustand';

export const useLabStore = create((set, get) => ({
    // Placed components
    hasBeaker: false,
    hasThermometer: false,
    hasBurner: false,
    hasIce: false,

    // Thermal state
    temperature: 20, // °C
    iceMass: 0, // kg (starts at 0, set when ice is placed)
    waterMass: 0, // kg
    phase: 'solid', // 'solid', 'melting', 'liquid', 'boiling', 'vapor'

    // Burner state
    burnerOn: false,
    burnerPower: 1000, // Watts (adjustable)

    // Data logging
    dataLog: [],
    observations: [],

    // UI state
    guidedModeActive: false,
    selectedComponent: null,

    // Actions
    placeBeaker: () => set({ hasBeaker: true }),
    placeThermometer: () => set({ hasThermometer: true }),
    placeBurner: () => set({ hasBurner: true }),
    placeIce: () => set({ hasIce: true, iceMass: 0.05, phase: 'solid' }),

    toggleBurner: () => set((state) => ({ burnerOn: !state.burnerOn })),
    setBurnerPower: (power) => set({ burnerPower: power }),

    updateThermalState: (deltaTime) => {
        const state = get();
        if (!state.hasBeaker) return;

        const { temperature, iceMass, waterMass, burnerPower, phase, burnerOn, hasBurner } = state;

        // Constants (SI units)
        const specificHeatIce = 2100; // J/(kg·K)
        const specificHeatWater = 4186; // J/(kg·K)
        const latentHeatFusion = 334000; // J/kg
        const latentHeatVaporization = 2260000; // J/kg
        const heatLossCoefficient = 15; // W/K (environmental heat loss - increased for faster cooling)
        const ambientTemp = 20; // °C

        let newTemp = temperature;
        let newIceMass = iceMass;
        let newWaterMass = waterMass;
        let newPhase = phase;

        if (burnerOn && hasBurner) {
            // HEATING MODE - Burner is ON
            // Heat input from burner (reduced by heat loss)
            const heatLoss = heatLossCoefficient * (temperature - ambientTemp);
            const effectiveHeat = Math.max(0, burnerPower - heatLoss);
            const energyInput = effectiveHeat * deltaTime; // Joules

            // Phase: Solid (heating ice towards 0°C)
            if (iceMass > 0) {
                if (temperature < 0 && phase === 'solid') {
                    // Warm solid ice up to 0°C
                    const dT = energyInput / (specificHeatIce * iceMass);
                    newTemp = Math.min(0, temperature + dT);

                    if (newTemp >= 0) {
                        newPhase = 'melting';
                    }
                } else {
                    // Any ice present while heating -> temperature stays at 0°C during melting
                    newPhase = 'melting';
                    const meltedMass = Math.min(iceMass, energyInput / latentHeatFusion);
                    newIceMass = iceMass - meltedMass;
                    newWaterMass = waterMass + meltedMass;
                    newTemp = 0;

                    if (newIceMass <= 0.0001) {
                        newIceMass = 0;
                        newPhase = 'liquid';
                    }
                }
            }

            // Phase: Liquid (heating water towards 100°C)
            if (phase === 'liquid' && waterMass > 0 && iceMass === 0) {
                if (temperature < 100) {
                    const dT = energyInput / (specificHeatWater * waterMass);
                    newTemp = Math.min(100, temperature + dT);
                } else {
                    newPhase = 'boiling';
                }
            }

            // Phase: Boiling (water → vapor at 100°C)
            if (phase === 'boiling' && waterMass > 0) {
                const vaporizedMass = Math.min(waterMass, energyInput / latentHeatVaporization);
                newWaterMass = waterMass - vaporizedMass;
                newTemp = 100; // Temperature stays at 100°C during boiling

                if (newWaterMass <= 0.001) {
                    newWaterMass = 0;
                    newPhase = 'vapor';
                }
            }
        } else {
            // Burner is OFF or not placed: no melting allowed.
            // Keep temperature stable unless it is above ambient (cool down only).
            if (temperature > ambientTemp && (waterMass > 0 || iceMass > 0)) {
                const totalMass = waterMass + iceMass;
                const specificHeat = waterMass > iceMass ? specificHeatWater : specificHeatIce;

                const heatLoss = heatLossCoefficient * (temperature - ambientTemp) * deltaTime;
                const dT = heatLoss / (specificHeat * Math.max(0.001, totalMass));
                newTemp = Math.max(ambientTemp, temperature - dT);

                if (newTemp < 100 && phase === 'boiling') {
                    newPhase = 'liquid';
                }
            }

            // If any ice remains without burner, clamp mixture to 0°C
            if (iceMass > 0 && temperature > 0) {
                newTemp = 0;
                newPhase = 'melting';
            }
        }

        set({
            temperature: newTemp,
            iceMass: newIceMass,
            waterMass: newWaterMass,
            phase: newPhase,
        });
    },

    logData: () => {
        const state = get();
        const timestamp = Date.now();
        const dataPoint = {
            time: timestamp,
            temperature: state.temperature,
            iceMass: state.iceMass,
            waterMass: state.waterMass,
            phase: state.phase,
        };
        set((state) => ({ dataLog: [...state.dataLog, dataPoint] }));
    },

    addObservation: (text) => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        set((state) => ({
            observations: [...state.observations, { time, text }],
        }));
    },

    reset: () =>
        set({
            temperature: 20,
            iceMass: 0,
            waterMass: 0,
            phase: 'solid',
            burnerOn: false,
            dataLog: [],
            observations: [],
        }),

    toggleGuidedMode: () => set((state) => ({ guidedModeActive: !state.guidedModeActive })),
    selectComponent: (name) => set({ selectedComponent: name }),
}));
