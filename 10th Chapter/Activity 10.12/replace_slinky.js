import fs from 'fs';

let code = fs.readFileSync('src/App.jsx', 'utf8');

const startIndex = code.indexOf('  const placeObject = (type, point) => {');
const endIndex = code.indexOf('  const handleDrop = (e) => {');

const newCode = `  const placeObject = (type, point) => {
    const scene = sceneRef.current;
    if (!scene || !point) {
      console.warn("\u26A0\uFE0F Scene or point missing in placeObject");
      return;
    }

    const loadAndPlaceGLB = (modelUrl, targetSize, typeName, setupMaterialsFn, fallbackFn) => {
      if (!gltfLoaderRef.current) return;
      gltfLoaderRef.current.load(modelUrl, (gltf) => {
        const model = gltf.scene;

        // Calculate scale factor using original size
        const originalBox = new THREE.Box3().setFromObject(model);
        const originalSize = new THREE.Vector3();
        originalBox.getSize(originalSize);

        const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);
        const scaleFactor = targetSize / maxDim;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Recompute bounding box after scale
        model.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        // Create a wrapper group
        const group = new THREE.Group();
        group.userData.isDraggable = true;
        group.userData.type = typeName;

        // Shift model so its bottom center aligns with group origin
        model.position.x = -scaledCenter.x;
        model.position.y = -scaledBox.min.y;
        model.position.z = -scaledCenter.z;
        group.add(model);

        if (setupMaterialsFn) {
          model.traverse(setupMaterialsFn);
        }

        // Place group at the drop point
        group.position.copy(point);
        // Ensure it doesn't sink into floor (z-fighting)
        group.position.y = Math.max(group.position.y, 0.01);

        scene.add(group);
        placedObjectsRef.current.push(group);
        console.log(\`\u2705 \${typeName} loaded.\`);
      }, undefined, (error) => {
        console.error(\`\u274C Error loading \${modelUrl}:\`, error);
        if (fallbackFn) fallbackFn();
      });
    };

    // Replace all drops with slinky
    loadAndPlaceGLB('/slinky.glb', 2.0, 'slinky',
      (child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.envMap = envMapRef.current;
            child.material.needsUpdate = true;
          }
        }
      }
    );
  };

`;

if (startIndex !== -1 && endIndex !== -1) {
    fs.writeFileSync('src/App.jsx', code.substring(0, startIndex) + newCode + code.substring(endIndex));
    console.log("Success replacing placeObject for slinky");
} else {
    console.log("Could not find start or end index", startIndex, endIndex);
}
