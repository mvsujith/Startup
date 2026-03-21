/**
 * MaterialSystem defines properties for different materials
 * and manages their behavior in water
 */
export class MaterialSystem {
    constructor() {
        this.materials = {
            table: {
                name: 'Table',
                dissolves: false,
                particleSize: 0.15, // Larger size for single object
                particleCount: 1,   // Single object
                color: 0x8B4513,    // SaddleBrown
                opacity: 1.0,
                volumeDisplacement: 5, // Larger displacement
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            trolly: {
                name: 'Trolly',
                dissolves: false,
                particleSize: 0.2,
                particleCount: 1,
                color: 0x8B4513,    // Wood color
                opacity: 1.0,
                volumeDisplacement: 8, // Larger displacement for trolly
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            string: {
                name: 'String',
                dissolves: false,
                particleSize: 0.1,
                particleCount: 1,
                color: 0xFFFFFF,    // White
                opacity: 1.0,
                volumeDisplacement: 1, // Minimal displacement
                settlingTime: 2000,
                cloudiness: 0.0,
                waterColorChange: 0xffffff,
            },
            pulley: {
                name: 'Pulley',
                dissolves: false,
                particleSize: 0.2,
                particleCount: 1,
                color: 0x555555,    // Dark Grey
                opacity: 1.0,
                volumeDisplacement: 3,
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            slotted_weights: {
                name: 'Slotted Weights',
                dissolves: false,
                particleSize: 0.2,
                particleCount: 1,
                color: 0xCCAC00,    // Brass/Gold color
                opacity: 1.0,
                volumeDisplacement: 4,
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            wooden_block: {
                name: 'Wooden Block',
                dissolves: false,
                particleSize: 0.3,
                particleCount: 1,
                color: 0x8B4513,    // Wood
                opacity: 1.0,
                volumeDisplacement: 5,
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            scale: {
                name: 'Scale',
                dissolves: false,
                particleSize: 0.2,
                particleCount: 1,
                color: 0xAAAAAA,    // Light Grey/Metallic
                opacity: 1.0,
                volumeDisplacement: 4,
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
        };
    }

    /**
     * Get material properties
     */
    getMaterial(type) {
        return this.materials[type] || null;
    }

    /**
     * Check if material dissolves
     */
    doesDissolve(type) {
        const material = this.getMaterial(type);
        return material ? material.dissolves : false;
    }

    /**
     * Get volume displacement for material
     */
    getVolumeDisplacement(type) {
        const material = this.getMaterial(type);
        return material ? material.volumeDisplacement : 0;
    }

    /**
     * Get all available materials
     */
    getAllMaterials() {
        return Object.keys(this.materials);
    }
}
