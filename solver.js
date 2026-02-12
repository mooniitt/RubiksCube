export class SolverManager {
    constructor() {
        // Initialize min2phase
        // min2phase.init() might be async or sync depending on implementation details, 
        // usually it initializes tables on first run or we can call init().
        if (typeof min2phase !== 'undefined') {
            min2phase.init(); 
        } else {
            console.error("min2phase library not loaded!");
        }
    }

    // Convert internal color state to facelets string URFDLB
    getFacelets(cubeState) {
        // Map Colors to standard orientation Face Letters
        // Our Config: 
        // Top: White -> U
        // Right: Blue -> R
        // Front: Red -> F
        // Bottom: Yellow -> D
        // Left: Green -> L
        // Back: Orange -> B
        
        const colorToFace = {
            'white': 'U',
            'blue': 'R',
            'red': 'F',
            'yellow': 'D',
            'green': 'L',
            'orange': 'B'
        };

        // Order required by Kociemba: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
        // cubeState stores arrays of 9 colors for 'top', 'right', 'front', 'bottom', 'left', 'back'
        // The indices in our arrays are 0-8. 
        // We need to ensure our scanning/storage order matches U1-U9 (Row by row, left to right)
        // Camera logic scans: Top-Left -> Top-Right -> ... -> Bottom-Right.
        // Assuming cubeState arrays are already in correct row-major order (0,1,2, 3,4,5, 6,7,8).
        
        const faces = ['top', 'right', 'front', 'bottom', 'left', 'back'];
        let facelets = "";

        for (const face of faces) {
            const stickers = cubeState[face];
            if (!stickers || stickers.length !== 9) {
                console.error(`Missing data for face: ${face}`);
                return null;
            }
            for (const color of stickers) {
                const letter = colorToFace[color];
                if (!letter) {
                    console.error(`Invalid color: ${color} on face ${face}`);
                    return null; // or handle incomplete scan
                }
                facelets += letter;
            }
        }
        return facelets;
    }

    solve(cubeState) {
        if (typeof min2phase === 'undefined') {
            console.warn("Solver missing. Returning demo.");
            return "U R F D L B"; 
        }

        const facelets = this.getFacelets(cubeState);
        console.log("Solver input facelets:", facelets);
        
        if (!facelets || facelets.length !== 54) {
            console.error("Invalid facelets string length");
            return "Error: Scan Incomplete";
        }

        // Verify validity? min2phase check
        const status = min2phase.verify(facelets);
        if (status !== 0) {
            console.error("Invalid cube state error code:", status);
            // Error codes:
            // -1: There is not exactly one facelet of each color
            // ...
            return `Error: Invalid State (${status})`;
        }

        // Generate solution
        // solve(facelets) returns a string like "U R2 F' ..."
        const solution = min2phase.solve(facelets);
        
        console.log("Solution found:", solution);
        return solution;
    }
}
