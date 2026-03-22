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

    if (type === 'basketball_court') {
      loadAndPlaceGLB('/basketball_court.glb', 12.0, 'basketball_court',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.envMap = envMapRef.current;
              child.material.needsUpdate = true;
            }
          }
        },
        () => {
          const geometry = new THREE.BoxGeometry(3.0, 0.1, 5.0);
          const material = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isDraggable = true;
          mesh.userData.type = 'basketball_court_fallback';
          mesh.position.copy(point);
          mesh.position.y = Math.max(mesh.position.y, 0.05);
          scene.add(mesh);
          placedObjectsRef.current.push(mesh);
        }
      );
    } else if (type === 'scale') {
      loadAndPlaceGLB('/Ruler.glb', 3.5, 'scale',
        (child) => {
          if (child.isMesh) setupMaterial(child);
        },
        () => {
          const geometry = new THREE.BoxGeometry(3.0, 0.1, 0.5);
          const material = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 0.5 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isDraggable = true;
          mesh.userData.type = 'scale_fallback';
          mesh.position.copy(point);
          mesh.position.y = Math.max(mesh.position.y, 0.05);
          scene.add(mesh);
          placedObjectsRef.current.push(mesh);
        }
      );
    } else if (type === 'rope') {
      loadAndPlaceGLB('/rope.glb', 2.0, 'rope',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.envMap = envMapRef.current;
              child.material.needsUpdate = true;
              child.material.metalness = 0.0;
              child.material.roughness = 0.9;
            }
          }
        },
        () => {
          const geometry = new THREE.TorusGeometry(1.0, 0.1, 16, 100);
          const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.0, roughness: 0.9 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isDraggable = true;
          mesh.userData.type = 'rope_fallback';
          mesh.position.copy(point);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.y = Math.max(mesh.position.y, 0.1);
          scene.add(mesh);
          placedObjectsRef.current.push(mesh);
        }
      );
    } else if (type === 'basketball') {
      loadAndPlaceGLB('/basketball.glb', 0.6, 'basketball',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envMapRef.current;
              child.material.needsUpdate = true;
            }
          }
        },
        () => {
          const geometry = new THREE.SphereGeometry(0.3, 32, 32);
          const material = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isDraggable = true;
          mesh.userData.type = 'basketball_fallback';
          mesh.position.copy(point);
          mesh.position.y = Math.max(mesh.position.y, 0.3);
          scene.add(mesh);
          placedObjectsRef.current.push(mesh);
        }
      );
    } else if (type === 'euro_coin') {
      loadAndPlaceGLB('/1_euro_coin (1).glb', 0.3, 'euro_coin',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envMapRef.current;
              child.material.metalness = 1.0;
              child.material.roughness = 0.3;
              child.material.needsUpdate = true;
            }
          }
        }
      );
    } else if (type === 'whiskey_glass') {
      loadAndPlaceGLB('/whiskey_glass.glb', 0.5, 'whiskey_glass',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envMapRef.current;
              child.material.transparent = true;
              child.material.opacity = 0.6;
              child.material.transmission = 0.9;
              child.material.roughness = 0.1;
              child.material.needsUpdate = true;
            }
          }
        }
      );
    } else if (type === 'squid_game_card') {
      loadAndPlaceGLB('/squid_game_card.glb', 0.5, 'squid_game_card',
        (child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envMapRef.current;
              child.material.needsUpdate = true;
            }
          }
        },
        () => {
          const geometry = new THREE.BoxGeometry(0.3, 0.01, 0.45);
          const material = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isDraggable = true;
          mesh.userData.type = 'squid_game_card_fallback';
          mesh.position.copy(point);
          mesh.position.y = Math.max(mesh.position.y, 0.01);
          scene.add(mesh);
          placedObjectsRef.current.push(mesh);
        }
      );
    } else if (type === 'slinky') {
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
    } else {
      // Create fallback Mesh for unknown types
      let geometry, material;
      const matProps = materialSystemRef.current?.getMaterial(type);
      const color = matProps ? matProps.color : 0xffffff;

      geometry = new THREE.SphereGeometry(0.3);

      material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isDraggable = true;
      mesh.userData.type = type;
      setupMaterial(mesh);
      mesh.position.copy(point);
      // Adjust height
      mesh.position.y = Math.max(mesh.position.y, 0.05);
      scene.add(mesh);
      placedObjectsRef.current.push(mesh);
    }
  };

`;

if (startIndex !== -1 && endIndex !== -1) {
    fs.writeFileSync('src/App.jsx', code.substring(0, startIndex) + newCode + code.substring(endIndex));
    console.log("Success");
} else {
    console.log("Could not find start or end index", startIndex, endIndex);
}
