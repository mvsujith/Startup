/**
 * MaterialSystem defines properties for different materials
 * and manages their behavior in water
 */
export class MaterialSystem {
    constructor() {
        this.materials = {
            salt: {
                name: 'Salt',
                dissolves: true,
                particleSize: 0.02,
                particleCount: 800,
                color: 0xffffff,
                opacity: 0.9,
                volumeDisplacement: 0, // No water level change when dissolved
                dissolutionTime: 4000, // 4 seconds
                cloudiness: 0.05,
                waterColorChange: 0xddddff, // Very slight color change
            },
            sugar: {
                name: 'Sugar',
                dissolves: true,
                particleSize: 0.025,
                particleCount: 700,
                color: 0xfff8dc,
                opacity: 0.85,
                volumeDisplacement: 0,
                dissolutionTime: 4500,
                cloudiness: 0.03,
                waterColorChange: 0xeeeeff,
            },
            sand: {
                name: 'Sand',
                dissolves: false,
                particleSize: 0.04,
                particleCount: 1200,
                color: 0xd2b48c, // Tan color
                opacity: 1.0,
                volumeDisplacement: 8, // 8 mL of water level rise
                settlingTime: 2500,
                cloudiness: 0.15,
                waterColorChange: 0xccaa88,
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
