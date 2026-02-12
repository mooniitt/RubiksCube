// Simple Kociemba solver wrapper or mock for now
// Ideally we would import 'cube-solver' from npm but for a single file drop-in
// we might need a UMD build. 
// For this demo, let's assume we can fetch a solution from an API or use a simplified heuristic.

// Since a full JS implementation of Kociemba is huge (~200KB minified), 
// we will try to use a public API or a lightweight library if available.
// For the sake of this "Teaching Mode" task without external deps, 
// I will implement a basic "Random Scramble" reverser for testing, 
// or if the user wants real solving, we can try to load `cube-solver` from CDN.

import Cube from 'https://unpkg.com/cubejs@1.0.0/lib/cube.js';

// We need to initialize the solver tables which might take time
Cube.initSolver();

export class SolverManager {
    constructor() {
        this.cube = new Cube();
    }

    // Convert our internal color state to facelets string
    // Order: U, R, F, D, L, B
    // Our Colors: White, Blue, Red, Yellow, Green, Orange
    // Map: Top->U, Right->R, Front->F, Bottom->D, Left->L, Back->B
    getFacelets(cubeState) {
        const mapColorToChar = (color) => {
            switch(color) {
                case 'white': return 'U';
                case 'blue': return 'R';
                case 'red': return 'F';
                case 'yellow': return 'D';
                case 'green': return 'L';
                case 'orange': return 'B';
                default: return 'U'; // Error case
            }
        };

        // We need to map our 9-element arrays to the string
        // CubeJS expects: U1...U9 R1...R9 F1...F9 D1...D9 L1...L9 B1...B9
        
        let str = '';
        const faces = ['top', 'right', 'front', 'bottom', 'left', 'back'];
        
        faces.forEach(face => {
            const stickers = cubeState[face];
            stickers.forEach(c => {
                str += mapColorToChar(c);
            });
        });

        return str;
    }

    solve(cubeState) {
        try {
            const facelets = this.getFacelets(cubeState);
            console.log("Solving for state:", facelets);
            
            // Create a new cube instance from facelets
            const c = Cube.fromString(facelets);
            const solution = c.solve(); // Returns string like "U2 F' R ..."
            
            return solution;
        } catch (e) {
            console.error("Solver error:", e);
            return "Error: Invalid State";
        }
    }
}
