import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Configuration
const CUBE_SIZE = 1;
const SPACING = 0.05; // Gap between cubies
const TOTAL_SIZE = (CUBE_SIZE + SPACING) * 3;

// Global variables
let camera, scene, renderer;
let controls;
const cubies = []; // Store all 27 cubies

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222); // Dark grey background

  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(5, 5, 7);
  camera.lookAt(0, 0, 0);

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Back light to soften shadows
  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(-10, -10, -10);
  scene.add(backLight);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Smooth rotation
  controls.dampingFactor = 0.05;

  // Create Rubik's Cube
  createRubiksCube();

  // Window resize handling
  window.addEventListener("resize", onWindowResize);

  // Hide loading text
  const loading = document.getElementById("loading");
  if (loading) {
    loading.classList.add("fade-out");
    setTimeout(() => loading.remove(), 500);
  }
}

function createRubiksCube() {
  // Geometry for a single cubie (box with rounded edges looks better, but standard BoxGeometry for now)
  // To make it look like a real cube, we need a black core and colored faces.
  // A simple way is to use a BoxGeometry and map different colors to faces depending on position.

  const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

  // Base material (black plastic)
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.5,
    metalness: 0.1,
  });

  // Face colors
  const colors = {
    right: 0x0000ff, // Blue
    left: 0x00ff00, // Green
    top: 0xffffff, // White
    bottom: 0xffff00, // Yellow
    front: 0xff0000, // Red
    back: 0xffa500, // Orange
  };

  // Helper to create materials for a cubie based on its position (x, y, z)
  // Coordinates range from -1 to 1
  function getMaterials(x, y, z) {
    // Order: Right, Left, Top, Bottom, Front, Back
    const mats = [];

    // Right (+x)
    mats.push(
      x === 1
        ? new THREE.MeshStandardMaterial({ color: colors.right })
        : baseMaterial,
    );
    // Left (-x)
    mats.push(
      x === -1
        ? new THREE.MeshStandardMaterial({ color: colors.left })
        : baseMaterial,
    );
    // Top (+y)
    mats.push(
      y === 1
        ? new THREE.MeshStandardMaterial({ color: colors.top })
        : baseMaterial,
    );
    // Bottom (-y)
    mats.push(
      y === -1
        ? new THREE.MeshStandardMaterial({ color: colors.bottom })
        : baseMaterial,
    );
    // Front (+z)
    mats.push(
      z === 1
        ? new THREE.MeshStandardMaterial({ color: colors.front })
        : baseMaterial,
    );
    // Back (-z)
    mats.push(
      z === -1
        ? new THREE.MeshStandardMaterial({ color: colors.back })
        : baseMaterial,
    );

    return mats;
  }

  // Generate 3x3x3 grid
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const materials = getMaterials(x, y, z);
        const cubie = new THREE.Mesh(geometry, materials);

        // Position with spacing
        cubie.position.set(
          x * (CUBE_SIZE + SPACING),
          y * (CUBE_SIZE + SPACING),
          z * (CUBE_SIZE + SPACING),
        );

        // Add outlines for better visual definition
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
        );
        cubie.add(line);

        // Add to scene and array
        scene.add(cubie);
        cubies.push(cubie);
      }
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
