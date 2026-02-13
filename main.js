import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CameraManager } from './cameraData.js';
import { SolverManager } from './solver.js';
import { initI18n, t, getLang } from './i18n.js';
import { ParticleSystem } from './particles.js';
import { algorithms } from './algorithms.js';

// Configuration
const CUBE_SIZE = 1;
const SPACING = 0.08;
const RADIUS = 0.1;
const SMOOTHNESS = 4;

// Global variables
let camera, scene, renderer, controls;
let cameraManager; // Global reference
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

// Camera Sync Configuration
const BASE_RADIUS = 8;
const CAM_Y = 5;
let targetRadius = BASE_RADIUS;

// Dynamic Face Angles getter
function getFaceTarget(face, radius = targetRadius) {
    // Defines relative direction vector * radius
    const dirs = {
        'red': { x: 0, z: 1 },       // Front
        'orange': { x: 0, z: -1 },   // Back
        'blue': { x: 1, z: 0 },      // Right
        'green': { x: -1, z: 0 },    // Left
        'white': { x: 0, z: 0, y: 1 }, // Top (Special)
        'yellow': { x: 0, z: 0, y: -1 } // Bottom (Special)
    };

    if (!dirs[face]) return null;
    const d = dirs[face];

    if (face === 'white' || face === 'yellow') {
        const offset = 0.1; // Avoid Gimbal lock
        return new THREE.Vector3(offset, d.y * radius, offset);
    }

    return new THREE.Vector3(d.x * radius, CAM_Y, d.z * radius);
}

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
let particleSystem;
let solutionMoves = [];
let currentMoveIndex = 0;

init();
initI18n(); // Init translation
// Initialize CameraManager with both callbacks: (onScan, onTrack)
cameraManager = new CameraManager(onFaceScanned, onFaceDetected);
solverManager = new SolverManager();
particleSystem = new ParticleSystem(scene);
setupTeachingControls();
setupOrientationSync(); // Ensure this is called
animate();

function onFaceScanned(faceName, colors) {
    if (cubeState[faceName]) {
        cubeState[faceName] = colors;
        updateCubeColors();
    }
}

// Move History
let moveHistory = [];

function setupTeachingControls() {
    const solveBtn = document.getElementById('solve-btn');
    const scrambleBtn = document.getElementById('scramble-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playBtn = document.getElementById('play-btn');
    const controlsDiv = document.getElementById('teaching-controls');

    document.getElementById('teaching-controls').classList.remove('hidden');

    scrambleBtn.addEventListener('click', () => {
        if (isAnimating) return;
        scrambleCube();

        // Reset solution UI
        document.getElementById('solution-text').textContent = "";
        document.getElementById('step-controls').style.display = 'none';
        solutionMoves = [];
    });

    solveBtn.addEventListener('click', () => {
        // Strategy: Use min2phase for everything to ensure state is correct.
        // If we have history, we can reconstruction the state from it.

        let solutionStr = "";

        if (moveHistory.length > 0) {
            console.log("Reconstructing state from history:", moveHistory);
            const scrambleStr = moveHistory.join(" ");
            // Use fromScramble to get facelets, then solve
            const facelets = solverManager.fromScramble(scrambleStr);
            if (facelets) {
                solutionStr = min2phase.solve(facelets);
            } else {
                console.error("Failed to reconstruction state from history");
                solutionStr = "Error: State Reconstruction Failed";
            }
        } else {
            solutionStr = solverManager.solve(cubeState);
        }

        const text = document.getElementById('solution-text');
        const solutionDisplay = document.getElementById('solution-display');

        if (solutionStr.includes("Error")) {
            text.textContent = t('solve_error');
            text.style.color = "red";
            solutionDisplay.classList.remove('hidden');
        } else {
            text.textContent = t('solve_steps') + solutionStr;
            text.style.color = "#4A90E2";
            solutionMoves = solutionStr.split(' ').filter(m => m.length > 0);
            currentMoveIndex = 0;

            // Clear history so we don't re-solve old state next time
            // But wait, if user wants to re-play? 
            // We should clear history ONLY when solve is FULLY PLAYED out?
            // Or just clear it now because we have the solution. 
            // The issue is if they hit "Solve" again, it uses old history.
            moveHistory = [];

            // Show the solution UI
            solutionDisplay.classList.remove('hidden');
            document.getElementById('step-controls').style.display = 'flex';
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentMoveIndex < solutionMoves.length && !isAnimating) {
            const move = solutionMoves[currentMoveIndex];
            rotateLayer(move, 500, () => {
                currentMoveIndex++;
                highlightMove(currentMoveIndex);

                // Check completion
                if (currentMoveIndex >= solutionMoves.length) {
                    particleSystem.explode(new THREE.Vector3(0, 0, 0), 0xFFD700, 200);
                    particleSystem.explode(new THREE.Vector3(2, 2, 2), 0xFF0000, 150);
                    particleSystem.explode(new THREE.Vector3(-2, -2, -2), 0x0000FF, 150);
                }
            });
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentMoveIndex > 0 && !isAnimating) {
            currentMoveIndex--;
            const move = solutionMoves[currentMoveIndex];
            const inverseMove = getInverseMove(move);
            rotateLayer(inverseMove, 500, () => { // Reverse move visually, but don't add to history?
                highlightMove(currentMoveIndex);
            });
        }
    });

    // Simple auto-play
    playBtn.addEventListener('click', () => {
        const playNext = () => {
            if (currentMoveIndex < solutionMoves.length) {
                const move = solutionMoves[currentMoveIndex];
                rotateLayer(move, 500, () => {
                    currentMoveIndex++;
                    highlightMove(currentMoveIndex);

                    if (currentMoveIndex >= solutionMoves.length) {
                        particleSystem.explode(new THREE.Vector3(0, 0, 0), 0xFFD700, 200);
                        particleSystem.explode(new THREE.Vector3(2, 2, 0), 0x00FF00, 150);
                    } else {
                        setTimeout(playNext, 200);
                    }
                });
            }
        };
        playNext();
    });

    setupAlgorithmControls();
}

function setupAlgorithmControls() {
    const list = document.getElementById('formula-list');
    const panel = document.getElementById('formula-panel');
    const openBtn = document.getElementById('formula-btn');
    const closeBtn = document.getElementById('close-formula');

    // Populate List
    algorithms.forEach(alg => {
        const div = document.createElement('div');
        div.className = 'formula-item';
        
        // Determine name based on lang
        const lang = getLang();
        const name = lang === 'zh' ? (alg.name_zh || alg.name_en) : alg.name_en;

        div.innerHTML = `
            <div class="formula-name">${name}</div>
            <div class="formula-moves">${alg.moves}</div>
        `;
        
        div.addEventListener('click', () => {
             loadAlgorithm(alg);
             panel.classList.add('hidden'); // Close on select
        });
        
        list.appendChild(div);
    });

    openBtn.addEventListener('click', () => {
        // Re-render to ensure language is correct
        list.innerHTML = '';
        algorithms.forEach(alg => {
            const div = document.createElement('div');
            div.className = 'formula-item';
            const lang = getLang();
            const name = lang === 'zh' ? (alg.name_zh || alg.name_en) : alg.name_en;
            div.innerHTML = `
                <div class="formula-name">${name}</div>
                <div class="formula-moves">${alg.moves}</div>
            `;
            div.addEventListener('click', () => {
                 loadAlgorithm(alg);
                 panel.classList.add('hidden');
            });
            list.appendChild(div);
        });

        panel.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
    });
}

function loadAlgorithm(alg) {
    const solutionDisplay = document.getElementById('solution-display');
    const text = document.getElementById('solution-text');
    const controls = document.getElementById('step-controls');

    // Reset state
    // moveHistory = []; // Optional: Clear history
    solutionMoves = alg.moves.split(' ').filter(m => m.length > 0);
    currentMoveIndex = 0;

    // Determine name based on lang
    const lang = getLang();
    const name = lang === 'zh' ? (alg.name_zh || alg.name_en) : alg.name_en;

    text.textContent = `${name}: ${alg.moves}`;
    text.style.color = "#4A90E2";
    
    solutionDisplay.classList.remove('hidden');
    controls.style.display = 'flex';
}

function scrambleCube() {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
    const count = 20;
    const scrambleSeq = [];

    for (let i = 0; i < count; i++) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        const suffix = Math.random() < 0.5 ? "'" : (Math.random() < 0.2 ? "2" : "");
        scrambleSeq.push(m + suffix);
    }

    console.log("Scramble:", scrambleSeq.join(" "));

    let i = 0;
    const nextMove = () => {
        if (i >= scrambleSeq.length) return;
        // Fast scramble: 150ms
        rotateLayer(scrambleSeq[i], 150, () => {
            i++;
            nextMove();
        }, true); // isScramble = true
    };
    nextMove();
}

function highlightMove(index) {
    // Optional
}

function getInverseMove(move) {
    if (move.includes("'")) return move.replace("'", "");
    if (move.includes("2")) return move; // 180 is its own inverse
    return move + "'";
}

// rotateLayer updated to support duration and history
function rotateLayer(move, duration = 300, callback, isScramble = false) {
    if (isAnimating) return;
    isAnimating = true;

    // ... (parsing char, angle logic is same)
    let char = move[0];
    let suffix = move.substring(1);
    let angle = Math.PI / 2;

    if (suffix === "'") angle = -Math.PI / 2;
    if (suffix === "2") angle = Math.PI;

    let axisVec = new THREE.Vector3();
    let groupToRotate = new THREE.Group();
    let selection = [];

    switch (char) {
        case 'U': axisVec.set(0, 1, 0); selection = cubies.filter(c => Math.abs(c.position.y - (CUBE_SIZE + SPACING)) < 0.1); angle *= -1; break;
        case 'D': axisVec.set(0, 1, 0); selection = cubies.filter(c => Math.abs(c.position.y - (-CUBE_SIZE - SPACING)) < 0.1); angle *= 1; break;
        case 'R': axisVec.set(1, 0, 0); selection = cubies.filter(c => Math.abs(c.position.x - (CUBE_SIZE + SPACING)) < 0.1); angle *= -1; break;
        case 'L': axisVec.set(1, 0, 0); selection = cubies.filter(c => Math.abs(c.position.x - (-CUBE_SIZE - SPACING)) < 0.1); angle *= 1; break;
        case 'F': axisVec.set(0, 0, 1); selection = cubies.filter(c => Math.abs(c.position.z - (CUBE_SIZE + SPACING)) < 0.1); angle *= -1; break;
        case 'B': axisVec.set(0, 0, 1); selection = cubies.filter(c => Math.abs(c.position.z - (-CUBE_SIZE - SPACING)) < 0.1); angle *= 1; break;
    }

    scene.add(groupToRotate);
    selection.forEach(c => groupToRotate.attach(c));

    const startTime = Date.now();

    // Easing function: easeInOutCubic
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateRotation = () => {
        const now = Date.now();
        let progress = Math.min((now - startTime) / duration, 1);

        // Apply easing
        const easedProgress = ease(progress);

        groupToRotate.quaternion.setFromAxisAngle(axisVec, angle * easedProgress);

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            selection.forEach(c => {
                scene.attach(c);
                c.position.x = Math.round(c.position.x * 10) / 10;
                c.position.y = Math.round(c.position.y * 10) / 10;
                c.position.z = Math.round(c.position.z * 10) / 10;
                c.updateMatrixWorld();
            });
            scene.remove(groupToRotate);
            isAnimating = false;

            // Track history if it's a scramble or manual move (not part of solution playback)
            // Ideally we track EVERYTHING that changes state.
            // But if we are Playing the Solution, we are "Undoing" the history technically?
            // Let's simplified: 
            // - If Scramble: Add to history.
            // - If User click (TODO): Add to history.
            // - If Solve Playback: Do NOT add to history (or treat as consuming history).

            if (isScramble) {
                moveHistory.push(move);
            } else {
                // If it's a manual rotation (not implemented yet) we would push.
                // For now, solve playback shouldn't push to history to avoid infinite loops if we used it.
                // But wait, if we scramble, then solve, the solve moves effectively cancel the history.
                // We'll just leave history as comes from Scramble.
            }

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
            <input type="checkbox" id="sync-toggle"> <span data-i18n="sync_toggle">${t('sync_toggle')}</span>
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
// Camera constants moved to top

let currentFace = 'red';

function onFaceDetected(color) {
    if (!syncEnabled || color === currentFace) return;

    // Debounce: verify color stability if needed, but for now direct switch
    // Only switch if it's a valid face color
    // Only switch if it's a valid face color
    const targetVec = getFaceTarget(color);
    if (!targetVec) return;

    console.log("Syncing to face:", color);
    currentFace = color;

    // Smoothly animate camera position
    // We can use a simple generic interpolation variable
    const startPos = camera.position.clone();
    const endPos = targetVec;

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

// cameraManager moved to top scope

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    updateCameraAdaptive(); // Calc initial radius
    const startPos = getFaceTarget('red', targetRadius);
    camera.position.set(startPos.x, startPos.y, startPos.z);
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

    updateCameraAdaptive();
}

function updateCameraAdaptive() {
    // Adjust radius based on aspect ratio
    // If aspect < 1 (portrait), we need to distance the camera to fit horizontal width
    const aspect = camera.aspect;
    if (aspect < 1) {
        targetRadius = BASE_RADIUS / aspect;
    } else {
        targetRadius = BASE_RADIUS;
    }

    // Smoothly move camera if needed? Or just jump.
    // For specific views (Face Sync), we should respect current face.
    // But if user is orbit controlling, we shouldn't force jump.
    // We only update the sync target variables.

    // If NOT interacting and aligned to a face, maybe update?
    // Let's just update the targetRadius state. The next sync or frame will use it.

    // Force update visual if we are in a "nice" view?
    // Let's just update controls.minDistance/max if needed.
    // controls.maxDistance = targetRadius * 2;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (particleSystem) particleSystem.update(0.016);
    renderer.render(scene, camera);
}
