import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CameraManager } from './cameraData.js';

// Configuration
const CUBE_SIZE = 1;
const SPACING = 0.08; 
const RADIUS = 0.1;   
const SMOOTHNESS = 4; 

// Global variables
let camera, scene, renderer, controls;
const cubies = []; 
const group = new THREE.Group(); 
// Map logical colors (string) to Hex
const COLOR_MAP = {
    'blue': 0x0045AD,
    'green': 0x009E60,
    'white': 0xFFFFFF,
    'yellow': 0xFFD500,
    'red': 0xB90000,
    'orange': 0xFF5900
};

// Default stickers state (Standard solved state)
// Each face has 9 stickers. Order: Top-left to Bottom-right reading.
let cubeState = {
    'front': Array(9).fill('red'),
    'back': Array(9).fill('orange'),
    'left': Array(9).fill('green'),
    'right': Array(9).fill('blue'),
    'top': Array(9).fill('white'),
    'bottom': Array(9).fill('yellow')
};

init();
new CameraManager(onFaceScanned); // Initialize Camera Logic
animate();

function onFaceScanned(faceName, colors) {
    if (cubeState[faceName]) {
        cubeState[faceName] = colors;
        updateCubeColors();
    }
}

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); 

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(6, 4, 6);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 0.5;

    // Create Rubik's Cube
    createRubiksCube();
    scene.add(group);

    window.addEventListener('resize', onWindowResize);

    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 500);
    }
}

function createRubiksCube() {
    const geometry = new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, SMOOTHNESS, RADIUS);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

    // Generate 3x3x3 grid
    // x: -1 (left), 0, 1 (right)
    // y: -1 (bottom), 0, 1 (top)
    // z: -1 (back), 0, 1 (front)
    
    for (let y = 1; y >= -1; y--) {
        for (let z = 1; z >= -1; z--) { // Start from Front
            for (let x = -1; x <= 1; x++) {
                const cubie = new THREE.Mesh(geometry, [
                    baseMaterial, baseMaterial, baseMaterial, 
                    baseMaterial, baseMaterial, baseMaterial
                ]); // Init with base (will be colored by updateCubeColors)

                cubie.position.set(
                    x * (CUBE_SIZE + SPACING),
                    y * (CUBE_SIZE + SPACING),
                    z * (CUBE_SIZE + SPACING)
                );
                
                cubie.castShadow = true;
                cubie.receiveShadow = true;
                cubie.userData = { x, y, z }; // logical position
                
                group.add(cubie);
                cubies.push(cubie);
            }
        }
    }
    
    updateCubeColors();
}

function updateCubeColors() {
    // Generate materials based on current cubeState
    
    // Helper to get color hex
    const getMat = (colorName) => new THREE.MeshStandardMaterial({
        color: COLOR_MAP[colorName] || 0x333333,
        roughness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -1
    });

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

    cubies.forEach(cubie => {
        const { x, y, z } = cubie.userData;
        
        // Material Indexes:
        // 0: Right (+x), 1: Left (-x), 2: Top (+y), 3: Bottom (-y), 4: Front (+z), 5: Back (-z)
        
        const materials = [baseMat, baseMat, baseMat, baseMat, baseMat, baseMat];

        // Mapping logical 3x3 grid to linear index 0-8
        // Face grid: 
        // 0 1 2
        // 3 4 5
        // 6 7 8
        // Top-left is (0,0) in 2D coords. 

        // Update Right Face (+x = 1)
        if (x === 1) {
            // y goes 1, 0, -1 (Row 0, 1, 2)
            // z goes 1, 0, -1 (Col 0, 1, 2) -> But for Right face?
            // Right face view: z is Left-Right axis? No.
            // When looking at Right face:
            // Top row (y=1): Front(z=1) -> Back(z=-1). Index 0,1,2
            const row = 1 - y; 
            const col = 1 - z; 
            const idx = row * 3 + col;
            materials[0] = getMat(cubeState.right[idx]);
        }

        // Update Left Face (-x = -1)
        if (x === -1) {
            // Looking at Left face:
            // Top row (y=1): Back(z=-1) -> Front(z=1). 
            const row = 1 - y;
            const col = z + 1; // z=-1->0, z=1->2
            const idx = row * 3 + col;
            materials[1] = getMat(cubeState.left[idx]);
        }

        // Update Top Face (+y = 1)
        if (y === 1) {
            // Looking at Top face:
            // Back(z=-1) is Top? No standard Rubik orientation.
            // Usually: Back is Top row. Front is Bottom row.
            // Left(x=-1) is Left col. Right(x=1) is Right col.
            const row = z + 1; // z=-1->0 (Back), z=1->2 (Front)
            const col = x + 1; // x=-1->0, x=1->2
            const idx = row * 3 + col;
            materials[2] = getMat(cubeState.top[idx]);
        }

        // Update Bottom Face (-y = -1)
        if (y === -1) {
            // Looking at Bottom face:
            // Front(z=1) is Top row? Standard: Front is Top. Back is Bottom.
            const row = 1 - z; // z=1->0, z=-1->2
            const col = x + 1;
            const idx = row * 3 + col;
            materials[3] = getMat(cubeState.bottom[idx]);
        }

        // Update Front Face (+z = 1)
        if (z === 1) {
            // Standard grid
            const row = 1 - y;
            const col = x + 1;
            const idx = row * 3 + col;
            materials[4] = getMat(cubeState.front[idx]);
        }

        // Update Back Face (-z = -1)
        if (z === -1) {
            // Looking at Back face
            // Top is Top. Right is Left (x=1 is Left in Back view).
            const row = 1 - y;
            const col = 1 - x; // x=1->0, x=-1->2
            const idx = row * 3 + col;
            materials[5] = getMat(cubeState.back[idx]);
        }

        cubie.material = materials;
    });
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
