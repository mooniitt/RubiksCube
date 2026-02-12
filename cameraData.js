import { t } from './i18n.js';

export class CameraManager {
    constructor(onColorDetected, onFaceDetected) {
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('camera-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.stream = null;
        this.isStreaming = false;
        this.isTracking = false;
        this.onColorDetected = onColorDetected; // Callback when a face is scanned
        this.onFaceDetected = onFaceDetected;   // Callback for orientation sync

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
            'front': t('face_front'),
            'right': t('face_right'),
            'back': t('face_back'),
            'left': t('face_left'),
            'top': t('face_top'),
            'bottom': t('face_bottom')
        };
        const faceName = this.scanOrder[this.currentStage];
        const btn = document.getElementById('scan-btn');
        const instruction = document.getElementById('instruction');

        if (this.currentStage >= this.scanOrder.length) {
            btn.textContent = t('scan_done');
            btn.disabled = true;
            instruction.textContent = t('scan_done');
        } else {
            btn.textContent = `${t('scan_btn_prefix')} ${faceMap[faceName]}`;
            btn.disabled = false;
            instruction.textContent = t('instruction_scan', { face: faceMap[faceName] });
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

    async startTracking() {
        if (!this.stream) await this.startCamera();
        
        this.isTracking = true;
        
        const trackLoop = () => {
            if (!this.isTracking || !this.isStreaming) return;

            // Draw current frame to canvas (small is fine for center only)
            // Use existing canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);

            // Analysis
            const centerColor = this.getCenterColor(this.canvas.width, this.canvas.height);
            
            // Debounce or smooth detection? 
            // We'll emit every reliable detection
            if (this.onFaceDetected && centerColor) {
               this.onFaceDetected(centerColor);
            }

            requestAnimationFrame(trackLoop);
        };
        trackLoop();
    }

    stopTracking() {
        this.isTracking = false;
    }

    getCenterColor(width, height) {
        // Sample center area (averaging a small box for stability)
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        const sampleSize = 10;
        
        let r = 0, g = 0, b = 0;
        const data = this.ctx.getImageData(cx - 5, cy - 5, 10, 10).data;
        
        for(let i=0; i<data.length; i+=4) {
            r += data[i];
            g += data[i+1];
            b += data[i+2];
        }
        
        const count = data.length / 4;
        return this.classifyColor(r / count, g / count, b / count);
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
