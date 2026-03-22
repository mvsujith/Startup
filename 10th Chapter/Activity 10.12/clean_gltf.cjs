const fs = require('fs');

function cleanGltf(filename, outFilename) {
    if (!fs.existsSync(filename)) return;
    const gltf = JSON.parse(fs.readFileSync(filename, 'utf8'));

    if (gltf.extensionsUsed) {
        gltf.extensionsUsed = gltf.extensionsUsed.filter(ext => ext !== 'KHR_materials_pbrSpecularGlossiness');
    }
    if (gltf.extensionsRequired) {
        gltf.extensionsRequired = gltf.extensionsRequired.filter(ext => ext !== 'KHR_materials_pbrSpecularGlossiness');
    }

    if (gltf.materials) {
        gltf.materials.forEach(mat => {
            if (mat.extensions && mat.extensions.KHR_materials_pbrSpecularGlossiness) {
                // Try to copy some properties to metallicRoughness if it's empty
                if (!mat.pbrMetallicRoughness) mat.pbrMetallicRoughness = {};
                const spec = mat.extensions.KHR_materials_pbrSpecularGlossiness;
                
                if (spec.diffuseFactor) mat.pbrMetallicRoughness.baseColorFactor = spec.diffuseFactor;
                if (spec.diffuseTexture) mat.pbrMetallicRoughness.baseColorTexture = spec.diffuseTexture;
                
                delete mat.extensions.KHR_materials_pbrSpecularGlossiness;
            }
            if (mat.extensions && Object.keys(mat.extensions).length === 0) {
                delete mat.extensions;
            }
        });
    }

    fs.writeFileSync(outFilename, JSON.stringify(gltf, null, 2));
    console.log(`Cleaned ${filename} -> ${outFilename}`);
}

cleanGltf('c:\\Activity 7.3\\public\\arrow.gltf', 'c:\\Activity 7.3\\public\\arrow_clean.gltf');
cleanGltf('c:\\Activity 7.3\\public\\simple_bow.gltf', 'c:\\Activity 7.3\\public\\simple_bow_clean.gltf');
