import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function LabScene() {
  const mountRef = useRef(null);
  const objectsRef = useRef([]);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 10, 50);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Floor / Grid
    const grid = new THREE.GridHelper(20, 20, 0x38bdf8, 0x1e293b);
    scene.add(grid);

    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "floor";
    scene.add(floor);

    const loader = new GLTFLoader();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleDrop = (e) => {
      e.preventDefault();
      const assetPath = e.dataTransfer.getData("assetPath");
      if (!assetPath) return;

      // Calculate intersection with floor
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(floor);

      if (intersects.length > 0) {
        const dropPoint = intersects[0].point;
        
        loader.load(assetPath, (gltf) => {
          const model = gltf.scene;
          
          // Normalize scale
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.2 / maxDim; // Reduced target size for better visibility
          model.scale.set(scale, scale, scale);
          
          model.position.copy(dropPoint);
          model.position.y -= box.min.y * scale; // Align bottom with floor
          
          if (assetPath.includes('bow')) {
            model.rotation.y = Math.PI / 2;
          }
          
          scene.add(model);
          objectsRef.current.push(model);
        });
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
    };

    const container = mountRef.current;
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragenter', handleDragEnter);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      container.removeEventListener('drop', handleDrop);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragenter', handleDragEnter);
      cancelAnimationFrame(raf);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="lab-canvas-container" />;
}
