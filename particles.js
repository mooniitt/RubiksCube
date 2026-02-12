import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    explode(position, color, count = 100) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions.push(position.x, position.y, position.z);
            
            // Random direction sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = 2 + Math.random() * 2;
            
            const vx = speed * Math.sin(phi) * Math.cos(theta);
            const vy = speed * Math.sin(phi) * Math.sin(theta);
            const vz = speed * Math.cos(phi);
            
            velocities.push(vx, vy, vz);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.2,
            transparent: true,
            opacity: 1
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.particles.push({
            mesh: points,
            velocities: velocities,
            life: 1.0 // 1 sec? or decay factor
        });
    }

    update(dt) {
        // dt in seconds
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update positions
            const positions = p.mesh.geometry.attributes.position.array;
            for (let j = 0; j < p.velocities.length / 3; j++) {
                const idx = j * 3;
                positions[idx] += p.velocities[idx] * dt;
                positions[idx+1] += p.velocities[idx+1] * dt;
                positions[idx+2] += p.velocities[idx+2] * dt;
                
                // Gravity
                p.velocities[idx+1] -= 5.0 * dt; 
            }
            p.mesh.geometry.attributes.position.needsUpdate = true;
            p.mesh.material.opacity = p.life;
        }
    }
}
