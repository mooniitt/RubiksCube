import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CameraManager } from './cameraData.js';
import { SolverManager } from './solver.js';

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

// State
let cubeState = {
    'front': Array(9).fill('red'),
    'back': Array(9).fill('orange'),
    'left': Array(9).fill('green'),
    'right': Array(9).fill('blue'),
    'top': Array(9).fill('white'),
    'bottom': Array(9).fill('yellow')
};

let isAnimating = false;
let solverManager;
let solutionMoves = [];
let currentMoveIndex = 0;

init();
new CameraManager(onFaceScanned); 
solverManager = new SolverManager();
setupTeachingControls();
animate();

function onFaceScanned(faceName, colors) {
    if (cubeState[faceName]) {
        cubeState[faceName] = colors;
        updateCubeColors();
    }
}

function setupTeachingControls() {
    const solveBtn = document.getElementById('solve-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playBtn = document.getElementById('play-btn');
    const controlsDiv = document.getElementById('teaching-controls'); // Initially hidden? No, css handles it.
    
    // Show controls when camera is toggled? Or always?
    // Let's make sure it's visible.
    document.getElementById('teaching-controls').classList.remove('hidden');

    solveBtn.addEventListener('click', () => {
        const solution = solverManager.solve(cubeState);
        const text = document.getElementById('solution-text');
        
        if (solution.includes("Error")) {
            text.textContent = "无法求解，请检查颜色录入是否正确";
            text.style.color = "red";
        } else {
            text.textContent = solution;
            text.style.color = "#4A90E2";
            solutionMoves = solution.split(' ').filter(m => m.length > 0);
            currentMoveIndex = 0;
            document.getElementById('step-controls').style.display = 'flex';
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentMoveIndex < solutionMoves.length && !isAnimating) {
            const move = solutionMoves[currentMoveIndex];
            rotateLayer(move, () => {
                currentMoveIndex++;
                highlightMove(currentMoveIndex);
            });
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentMoveIndex > 0 && !isAnimating) {
            currentMoveIndex--;
            const move = solutionMoves[currentMoveIndex];
            const inverseMove = getInverseMove(move);
            rotateLayer(inverseMove, () => {
                highlightMove(currentMoveIndex);
            });
        }
    });

    // Simple auto-play
    playBtn.addEventListener('click', () => {
        const playNext = () => {
            if (currentMoveIndex < solutionMoves.length) {
                const move = solutionMoves[currentMoveIndex];
                rotateLayer(move, () => {
                    currentMoveIndex++;
                    highlightMove(currentMoveIndex);
                    setTimeout(playNext, 500); 
                });
            }
        };
        playNext();
    });
}

function highlightMove(index) {
    // Optional: Highlight current move in UI text
}

function getInverseMove(move) {
    if (move.includes("'")) return move.replace("'", "");
    if (move.includes("2")) return move; // 180 is its own inverse
    return move + "'";
}

// Axis: 'x', 'y', 'z'
// Value: -1, 0, 1 (coordinate)
// Direction: 1 (clockwise), -1 (counter-clockwise)
function rotateLayer(move, callback) {
    if (isAnimating) return;
    isAnimating = true;

    // Parse move string "U", "U'", "U2", etc.
    // U (Top): y=1, axis y, dir -1 (Wait, standard notation check)
    // Standard: Right-handed rule. Thumb points axis positive. Fingers curl.
    // U: Up face clockwise. Axis Y. Positive Y is Up. 
    // D: Down face cw. Axis Y. Negative Y is Down.
    // R: Right face cw. Axis X.
    // L: Left face cw. Axis X.
    // F: Front face cw. Axis Z.
    // B: Back face cw. Axis Z.

    let char = move[0];
    let suffix = move.substring(1);
    let angle = Math.PI / 2; // 90 deg
    
    if (suffix === "'") angle = -Math.PI / 2;
    if (suffix === "2") angle = Math.PI;

    let axisVec = new THREE.Vector3();
    let filter = null;
    let groupToRotate = new THREE.Group();
    
    // We attach objects to a temporary group, rotate the group, then detach.
    // Detach preserves world transforms. Then we must update logical coords.
    
    // Select cubies based on move
    // Note: Our coordinates are x: -1..1, y: -1..1, z: -1..1
    
    let selection = [];

    switch(char) {
        case 'U': // Top y=1
            axisVec.set(0, 1, 0);
            selection = cubies.filter(c => Math.abs(c.position.y - (CUBE_SIZE + SPACING)) < 0.1);
            angle *= -1; // Three.js Y-up vs Standard notation? Let's test.
            // Standard U looks down from top, clockwise.
            // ThreeJS rotation around +Y is CCW? 
            break;
        case 'D': // Bottom y=-1
            axisVec.set(0, 1, 0);
            selection = cubies.filter(c => Math.abs(c.position.y - (-CUBE_SIZE - SPACING)) < 0.1);
            angle *= 1; // Looking from bottom?
            break;
        case 'R': // Right x=1
            axisVec.set(1, 0, 0);
            selection = cubies.filter(c => Math.abs(c.position.x - (CUBE_SIZE + SPACING)) < 0.1);
            angle *= -1; 
            break;
        case 'L': // Left x=-1
            axisVec.set(1, 0, 0);
            selection = cubies.filter(c => Math.abs(c.position.x - (-CUBE_SIZE - SPACING)) < 0.1);
            angle *= 1;
            break;
        case 'F': // Front z=1
            axisVec.set(0, 0, 1);
            selection = cubies.filter(c => Math.abs(c.position.z - (CUBE_SIZE + SPACING)) < 0.1);
            angle *= -1;
            break;
        case 'B': // Back z=-1
            axisVec.set(0, 0, 1);
            selection = cubies.filter(c => Math.abs(c.position.z - (-CUBE_SIZE - SPACING)) < 0.1);
            angle *= 1;
            break;
    }

    // Add to group
    scene.add(groupToRotate);
    // groupToRotate.position.set(0,0,0); // Default
    
    // Parent change dance
    selection.forEach(c => {
        groupToRotate.attach(c); // Attach preserves world transform
    });

    // Animate
    const startObj = { t: 0 };
    const endObj = { t: 1 };
    
    // Simple interpolation loop without TWEEN lib for deps
    const startTime = Date.now();
    const duration = 300; // ms

    const animateRotation = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        // Easing? Linear for now.
        
        groupToRotate.quaternion.setFromAxisAngle(axisVec, angle * progress);

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            // Done
            // Detach to bake transform back to world
            selection.forEach(c => {
                scene.attach(c);
                
                // Snap position and rotation to nearest safe values to prevent drift
                c.position.x = Math.round(c.position.x * 10) / 10;
                c.position.y = Math.round(c.position.y * 10) / 10;
                c.position.z = Math.round(c.position.z * 10) / 10;
                
                c.updateMatrixWorld();
            });
            scene.remove(groupToRotate);
            isAnimating = false;
            if (callback) callback();
        }
    };
    animateRotation();
}

// Face Orientation Sync
let lastDetectedColor = null;
let syncEnabled = false;

function setupOrientationSync() {
    const parent = document.getElementById('teaching-controls');
    
    // Check if toggle already exists (in case of re-run)
    if (document.getElementById('sync-toggle')) return;

    const row = document.createElement('div');
    row.className = 'control-row';
    row.innerHTML = `
        <label style="color:white; font-size:14px; display:flex; align-items:center; gap:5px; cursor:pointer;">
            <input type="checkbox" id="sync-toggle"> 🔄 视角跟随 (实验性)
        </label>
    `;
    parent.appendChild(row);

    document.getElementById('sync-toggle').addEventListener('change', (e) => {
        syncEnabled = e.target.checked;
        if (syncEnabled) {
            cameraManager.startTracking();
        } else {
            cameraManager.stopTracking();
        }
    });
}

// Camera Position Targets for each face color
const FACE_POSITIONS = {
    'red': { pos: [6, 4, 6], lookAt: [0, 0, 0] },     // Front (Typical start pos)
    'orange': { pos: [-6, 4, -6], lookAt: [0, 0, 0] },// Back
    'blue': { pos: [6, 4, -6], lookAt: [0, 0, 0] },   // Right ?? Wait, Right is +x. 
    // Let's debug positions:
    // Front(Red) is +z. Camera at (x,y,z) looking at 0.
    // Right(Blue) is +x. Camera should be at (+x, +y, 0).
    // Left(Green) is -x. Camera at (-x, +y, 0).
    // Back(Orange) is -z. Camera at (0, +y, -z).
    // Top(White) is +y. Camera at (0, +y, 0).
    // Bottom(Yellow) is -y.
};

// Refined positions
// Assuming Camera orbits around 0,0,0 at radius ~8
const RADIUS_CAM = 8;
const CAM_Y = 5;

const FACE_ANGLES = {
    'red': { x: 0, z: RADIUS_CAM },       // Front
    'orange': { x: 0, z: -RADIUS_CAM },   // Back
    'blue': { x: RADIUS_CAM, z: 0 },      // Right
    'green': { x: -RADIUS_CAM, z: 0 },    // Left
    'white': { x: 0, z: 0, y: RADIUS_CAM }, // Top (Special handling)
    'yellow': { x: 0, z: 0, y: -RADIUS_CAM } // Bottom
};

let currentFace = 'red';

function onFaceDetected(color) {
    if (!syncEnabled || color === currentFace) return;
    
    // Debounce: verify color stability if needed, but for now direct switch
    // Only switch if it's a valid face color
    if (!FACE_ANGLES[color]) return;
    
    console.log("Syncing to face:", color);
    currentFace = color;
    
    const target = FACE_ANGLES[color];
    
    // Smoothly animate camera position
    // We can use a simple generic interpolation variable
    const startPos = camera.position.clone();
    
    let endPos;
    if (color === 'white') endPos = new THREE.Vector3(0.1, RADIUS_CAM, 0); // Slight offset to avoid Gimbal lock
    else if (color === 'yellow') endPos = new THREE.Vector3(0.1, -RADIUS_CAM, 0);
    else endPos = new THREE.Vector3(target.x, CAM_Y, target.z);

    // Simple tween
    let t = 0;
    const duration = 500;
    const startTime = Date.now();

    const animateCam = () => {
        if (currentFace !== color) return; // Interrupted
        
        const now = Date.now();
        t = Math.min((now - startTime) / duration, 1);
        
        // Spherical lerp (slerp) is better for orbit, but lerp is okay for small adjustments
        camera.position.lerpVectors(startPos, endPos, t);
        camera.lookAt(0, 0, 0);
        
        if (t < 1) requestAnimationFrame(animateCam);
    };
    animateCam();
}

let cameraManager; // Move scope out

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); 

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(FACE_ANGLES.red.x, CAM_Y, FACE_ANGLES.red.z); // Start at Front
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
