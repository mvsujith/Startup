/**
 * MaterialSystem defines properties for different materials
 * and manages their behavior in water
 */
export class MaterialSystem {
    constructor() {
        this.materials = {
            toy_car: {
                name: 'Toy Car',
                dissolves: false,
                particleSize: 0.15, // Larger size for single object
                particleCount: 1,   // Single object
                color: 0x888888,    // Grey
                opacity: 1.0,
                volumeDisplacement: 2, // Slight rise
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
