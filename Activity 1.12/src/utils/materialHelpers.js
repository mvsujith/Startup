import * as THREE from 'three';

/**
 * Map temperature to color (blue → orange → red)
 * @param {number} temperature - Temperature in °C
 * @returns {THREE.Color} - Color object
 */
export function temperatureToColor(temperature) {
    // Clamp temperature range for color mapping
    const t = THREE.MathUtils.clamp(temperature, -10, 110);

    // Normalize to 0-1 range
    const normalized = (t + 10) / 120;

    // Color interpolation:
    // Cold (-10°C to 0°C): Deep blue → Light blue
    // Melting (0°C to 25°C): Light blue → Cyan
    // Warm (25°C to 75°C): Cyan → Yellow → Orange
    // Hot (75°C to 100°C): Orange → Red
    // Boiling (100°C+): Red → Bright red

    const color = new THREE.Color();

    if (t < 0) {
        // Deep blue to light blue
        const ratio = (t + 10) / 10;
        color.setRGB(0.1 + ratio * 0.2, 0.2 + ratio * 0.4, 0.8 + ratio * 0.2);
    } else if (t < 25) {
        // Light blue to cyan
        const ratio = t / 25;
        color.setRGB(0.3 * ratio, 0.6 + 0.2 * ratio, 1 - 0.2 * ratio);
    } else if (t < 75) {
        // Cyan to yellow to orange
        const ratio = (t - 25) / 50;
        color.setHSL(0.5 - ratio * 0.45, 0.8, 0.5);
    } else if (t < 100) {
        // Orange to red
        const ratio = (t - 75) / 25;
        color.setRGB(1, 0.5 - ratio * 0.3, 0.1 - ratio * 0.1);
    } else {
        // Boiling - bright red
        color.setRGB(1, 0.2, 0);
    }

    return color;
}

/**
 * Create glass material for beaker
 */
export function createGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        envMapIntensity: 1.5,
        transparent: true,
        opacity: 0.3,
    });
}

/**
 * Create liquid material with temperature-based color
 */
export function createLiquidMaterial(temperature = 20) {
    const color = temperatureToColor(temperature);
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.6,
        thickness: 0.3,
        envMapIntensity: 1.2,
        transparent: true,
        opacity: 0.7,
    });
}

/**
 * Create ice material
 */
export function createIceMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0x87ceeb,
        metalness: 0,
        roughness: 0.15,
        transmission: 0.8,
        thickness: 0.4,
        envMapIntensity: 1.3,
        transparent: true,
        opacity: 0.85,
    });
}

/**
 * Create burner material
 */
export function createBurnerMaterial(isOn = false) {
    return new THREE.MeshStandardMaterial({
        color: isOn ? 0xff4400 : 0x333333,
        metalness: 0.8,
        roughness: 0.3,
        emissive: isOn ? 0xff2200 : 0x000000,
        emissiveIntensity: isOn ? 0.5 : 0,
    });
}
