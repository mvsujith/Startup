/**
 * MaterialSystem defines properties for different materials
 * and manages their behavior in water
 */
export class MaterialSystem {
    constructor() {
        this.materials = {
            building: {
                name: 'Building',
                dissolves: false,
                particleSize: 0.5, // Larger size for single object
                particleCount: 1,   // Single object
                color: 0x888888,    // Grey
                opacity: 1.0,
                volumeDisplacement: 2, // Slight rise
                settlingTime: 1000,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            glass_jar: {
                name: 'Glass Jar',
                dissolves: false,
                particleSize: 0.2,
                particleCount: 1,
                color: 0x88ccff,    // Light Blue/Glassy
                opacity: 0.5,
                volumeDisplacement: 3,
                settlingTime: 1500,
                cloudiness: 0.0,
                waterColorChange: 0xeeeeee,
            },
            paper: {
                name: 'Paper',
                dissolves: false,
                particleSize: 0.3,
                particleCount: 1,
                color: 0xFFFFFF,    // White
                opacity: 1.0,
                volumeDisplacement: 2,
                settlingTime: 2000,
                cloudiness: 0.0,
                waterColorChange: 0xffffff,
            },
            stone: {
                name: 'Stone',
                dissolves: false,
                particleSize: 0.25,
                particleCount: 1,
                color: 0x888888,    // Grey
                opacity: 1.0,
                volumeDisplacement: 2.5,
                settlingTime: 1200,
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
