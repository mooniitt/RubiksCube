export class CameraManager {
    constructor(onColorDetected) {
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('camera-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.stream = null;
        this.isStreaming = false;
        this.onColorDetected = onColorDetected; // Callback when a face is scanned

        // Order of scanning: Front, Right, Back, Left, Top, Bottom
        this.scanOrder = ['front', 'right', 'back', 'left', 'top', 'bottom'];
        this.currentStage = 0;

        this.initUI();
    }

    initUI() {
        document.getElementById('toggle-camera-btn').addEventListener('click', () => this.toggleCamera());
        document.getElementById('scan-btn').addEventListener('click', () => this.scanCurrentFace());
    }

    async toggleCamera() {
        const container = document.getElementById('camera-container');
        if (this.isStreaming) {
            this.stopCamera();
            container.classList.add('hidden');
        } else {
            const success = await this.startCamera();
            if (success) {
                container.classList.remove('hidden');
                this.resetScan();
            }
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 640 },
                    height: { ideal: 640 }
                } 
            });
            this.video.srcObject = this.stream;
            this.isStreaming = true;
            return true;
        } catch (err) {
            console.error("Camera access error:", err);
            alert("无法访问摄像头。请确保允许权限并在 HTTPS 或 localhost 下运行。");
            return false;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isStreaming = false;
    }

    resetScan() {
        this.currentStage = 0;
        this.updateInstruction();
    }

    updateInstruction() {
        const faceMap = {
            'front': '前 (Front)',
            'right': '右 (Right)',
            'back': '后 (Back)',
            'left': '左 (Left)',
            'top': '上 (Top)',
            'bottom': '下 (Bottom)'
        };
        const faceName = this.scanOrder[this.currentStage];
        const btn = document.getElementById('scan-btn');
        const instruction = document.getElementById('instruction');

        if (this.currentStage >= this.scanOrder.length) {
            btn.textContent = "扫描完成";
            btn.disabled = true;
            instruction.textContent = "所有面已扫描完毕！";
        } else {
            btn.textContent = `扫描 ${faceMap[faceName]}`;
            btn.disabled = false;
            instruction.textContent = `请对准 ${faceMap[faceName]} 面，确保中心块颜色匹配。`;
        }
    }

    scanCurrentFace() {
        if (!this.isStreaming || this.currentStage >= this.scanOrder.length) return;

        // Draw video frame to canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Analyze colors
        const colors = this.analyzeFrame(this.canvas.width, this.canvas.height);
        
        // Return detected colors for this face
        const faceName = this.scanOrder[this.currentStage];
        this.onColorDetected(faceName, colors);

        // Move to next stage
        this.currentStage++;
        this.updateInstruction();
    }

    analyzeFrame(width, height) {
        // We assume the video is roughly centered directly on the 3x3 grid
        // The grid is a square. We take 9 sample points.
        
        // Calculate crop size (assuming user centers the cube effectively in the square container)
        // In CSS we display it as a square, object-fit cover. 
        // Logic simplification: take 9 evenly spaced points from the center square of the image.
        
        const size = Math.min(width, height) * 0.8; // Use 80% of the center
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;
        const cellSize = size / 3;

        const detectedColors = [];

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                // Sample center of each cell
                const cx = Math.floor(startX + col * cellSize + cellSize / 2);
                const cy = Math.floor(startY + row * cellSize + cellSize / 2);

                const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];

                const color = this.classifyColor(r, g, b);
                detectedColors.push(color);
            }
        }

        console.log(`Scanned ${this.scanOrder[this.currentStage]}:`, detectedColors);
        return detectedColors;
    }

    classifyColor(r, g, b) {
        // Convert RGB to HSV
        const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h /= 6;
        }

        // HSV thresholds (Adjust based on testing)
        // H: 0-1, S: 0-1, V: 0-1
        
        // White: Low Saturation, High Value
        if (s < 0.25 && v > 0.5) return 'white';

        // Orange vs Red vs Yellow (Hue based)
        // Red is around 0 or 1. Orange around 0.08. Yellow around 0.16. Green 0.33. Blue 0.66.
        
        if (h > 0.95 || h < 0.04) return 'red';
        if (h >= 0.04 && h < 0.12) return 'orange';
        if (h >= 0.12 && h < 0.25) return 'yellow';
        if (h >= 0.25 && h < 0.45) return 'green';
        if (h >= 0.55 && h < 0.75) return 'blue';

        // Fallback checks for hard cases
        if (v < 0.2) return 'white'; // Blackish/Shadow -> treat as default? Or error.
        
        return 'white'; // Default
    }
}
