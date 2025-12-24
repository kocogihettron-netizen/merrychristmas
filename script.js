const canvas = document.getElementById('christmasCanvas');
const ctx = canvas.getContext('2d');
const music = document.getElementById('bgMusic');
const startButtonContainer = document.getElementById('startButton');

let particles = [];
let animationFrameId;

// --- Config 3D ---
const focalLength = 300; 
let rotationY = 0; 
const ROTATION_SPEED = 0.005; 

// --- Tương tác ---
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let dragVelocity = { x: 0, y: 0 };
const DRAG_DAMPING = 0.95; 
const DRAG_FORCE_HORIZONTAL = 0.005; 
const DRAG_PUSH_FORCE = 0.5; 

let stage = 0; 
const TREE_VERTICAL_OFFSET_RATIO = 0.15; 
const STAR_SIZE = 50; 

// --- Quản lý 8 tấm ảnh ---
const imageSources = [
    'images/image1.jpg', 'images/image2.jpg', 'images/image3.jpg', 'images/image4.jpg',
    'images/image5.jpg', 'images/image6.jpg', 'images/image7.jpg', 'images/image8.jpg'
]; 
const floatingImages = [];

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', setCanvasSize);
setCanvasSize();

// --- Mouse Events ---
canvas.addEventListener('mousedown', (e) => {
    if (stage >= 1) { isDragging = true; lastMouse.x = e.clientX; lastMouse.y = e.clientY; }
});
canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y; 
        dragVelocity.x = dx * DRAG_FORCE_HORIZONTAL; 
        dragVelocity.y = dy * DRAG_FORCE_HORIZONTAL; 
        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;
    }
});

class Particle {
    constructor(x, y, z, radius, color, velocity, isTreeParticle = false, isPermanent = false) { 
        this.x = x; this.y = y; this.z = z; 
        this.radius = radius; this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.friction = 0.99;
        this.isTreeParticle = isTreeParticle; 
        this.isPermanent = isPermanent; 
        this.originalX = x; this.originalY = y; this.originalZ = z;
    }

    rotate() {
        if (this.isTreeParticle && stage === 1) {
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);
            this.x = this.originalX * cosY - this.originalZ * sinY;
            this.z = this.originalX * sinY + this.originalZ * cosY;
        }
    }

    project() {
        const scale = focalLength / (focalLength + this.z);
        const baseSize = Math.min(canvas.width, canvas.height);
        const treeHeight = baseSize * 0.7; 
        const targetTipY = canvas.height * TREE_VERTICAL_OFFSET_RATIO; 
        const baseYProjected = targetTipY + (treeHeight * scale); 
        
        this.projectedX = this.x * scale + canvas.width / 2;
        this.projectedY = baseYProjected - (this.y * scale);
        this.projectedRadius = this.radius * scale;
        this.alpha = Math.max(0.1, scale * 1.5); 
    }

    draw() {
        if (this.projectedRadius > 0.1) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.projectedX, this.projectedY, this.projectedRadius, 0, Math.PI * 2);
            
            // Giữ nguyên màu sắc rực rỡ và hiệu ứng phát sáng
            ctx.fillStyle = this.color;
            ctx.shadowBlur = this.projectedRadius * 5; 
            ctx.shadowColor = this.color;
            
            ctx.fill();
            ctx.restore();
        }
    }

    update() {
        if (stage === 1 && this.isTreeParticle) {
            this.rotate();
            this.x += this.velocity.x; this.y += this.velocity.y; this.z += this.velocity.z;
            if (Math.abs(this.x - this.originalX) > 1) this.velocity.x *= -1;
        } else {
            if (isDragging) {
                this.velocity.x += dragVelocity.x * DRAG_PUSH_FORCE;
                this.velocity.y += dragVelocity.y * DRAG_PUSH_FORCE;
            }
            this.velocity.x *= this.friction; this.velocity.y *= this.friction;
            this.x += this.velocity.x; this.y += this.velocity.y; this.z += this.velocity.z; 
            if (!this.isPermanent) this.alpha -= 0.005;
        }
        this.project();
        this.draw();
    }
}

class FloatingImage {
    constructor(imageSrc) {
        this.img = new Image();
        this.img.src = imageSrc;
        // Kích thước cân đối cho 8 ảnh
        this.size = 100 + Math.random() * 50; 
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        this.velocity = { x: (Math.random() - 0.5) * 1.5, y: (Math.random() - 0.5) * 1.5 };
        this.angle = 0;
        this.rotation = (Math.random() - 0.5) * 0.01;
        this.frameColor = '#FFD700'; // Màu vàng kim đặc trưng
    }

    update() {
        if (isDragging) {
            this.velocity.x += dragVelocity.x * DRAG_PUSH_FORCE * 5;
            this.velocity.y += dragVelocity.y * DRAG_PUSH_FORCE * 5;
        }
        this.x += this.velocity.x; this.y += this.velocity.y;
        this.angle += this.rotation;
        this.velocity.x *= 0.98; this.velocity.y *= 0.98;

        if (this.x <= 0 || this.x + this.size >= canvas.width) this.velocity.x *= -1;
        if (this.y <= 0 || this.y + this.size >= canvas.height) this.velocity.y *= -1;

        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.angle);
        
        // Vẽ khung ảnh màu vàng
        ctx.fillStyle = this.frameColor;
        ctx.fillRect(-this.size/2 - 5, -this.size/2 - 5, this.size + 10, this.size + 10);
        
        if (this.img.complete) ctx.drawImage(this.img, -this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

function createBackgroundParticles(count, x, y) {
    for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2 + 0.5;
        const color = ['#FF4500', '#FFD700', '#F0E68C'][Math.floor(Math.random() * 3)];
        const angle = Math.random() * Math.PI * 2;
        const vel = { x: Math.cos(angle) * Math.random() * 0.5, y: Math.sin(angle) * Math.random() * 0.5 };
        particles.push(new Particle(x - canvas.width/2, y - canvas.height/2, 0, radius, color, vel));
    }
}

function createChristmasTreeParticles(count) {
    const baseSize = Math.min(canvas.width, canvas.height);
    const treeHeight = baseSize * 0.7; 
    const maxRadius = baseSize * 0.3; 
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF0000', '#F0E68C']; // Giữ nguyên bảng màu cây thông
    
    for (let i = 0; i < count; i++) {
        const relY = Math.random(); 
        const r = maxRadius * (1 - relY) * Math.sqrt(Math.random()); 
        const angle = Math.random() * Math.PI * 2; 
        const color = colors[Math.floor(Math.random() * colors.length)];
        const vel = { x: (Math.random()-0.5)*0.05, y: (Math.random()-0.5)*0.05, z: (Math.random()-0.5)*0.05 };
        particles.push(new Particle(Math.cos(angle)*r, relY*treeHeight, Math.sin(angle)*r, 1.5, color, vel, true));
    }
}

function createHeartParticles(count) {
    const scale = 12; 
    const colors = ['#FF69B4', '#FF1493', '#FF00FF', '#FF0000']; // Giữ nguyên bảng màu trái tim
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const x = scale * (16 * Math.pow(Math.sin(t), 3));
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y - 20, (Math.random()-0.5)*50, 1.5, color, {x:0,y:0,z:0}));
    }
}

function transitionStage() {
    if (isDragging) return; 
    if (stage === 1) {
        particles.forEach(p => {
            if (p.isTreeParticle) {
                p.isTreeParticle = false; 
                const speed = Math.random() * 15 + 10;
                p.velocity = { x: (Math.random()-0.5)*speed, y: (Math.random()-0.5)*speed, z: (Math.random()-0.5)*speed };
            }
        });
        setTimeout(() => {
            stage = 2;
            imageSources.forEach(src => floatingImages.push(new FloatingImage(src)));
        }, 500);
    } else if (stage === 2) {
        stage = 3;
        floatingImages.length = 0;
        particles = [];
    }
}

canvas.addEventListener('click', transitionStage);

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    createBackgroundParticles(3, canvas.width/2, canvas.height/2);

    if (stage === 1) {
        rotationY += isDragging ? dragVelocity.x : ROTATION_SPEED;
        particles.sort((a, b) => b.z - a.z);
        
        // Ngôi sao vàng trên đỉnh
        ctx.fillStyle = '#FFFF00'; 
        ctx.font = `${STAR_SIZE}px serif`; 
        ctx.textAlign = 'center';
        ctx.fillText('★', canvas.width/2, canvas.height * TREE_VERTICAL_OFFSET_RATIO);
        
        // Text vàng kim
        ctx.font = 'bold 36px Tahoma';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('MERRY CHRISTMAS', canvas.width/2, (canvas.height * TREE_VERTICAL_OFFSET_RATIO) - 40);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0.1) particles.splice(i, 1);
    }

    if (stage === 2) floatingImages.forEach(img => img.update());
    
    if (stage === 3) {
        createHeartParticles(10);
        ctx.fillStyle = '#FF69B4'; // Màu hồng chữ I LOVE YOU
        ctx.font = 'bold 50px Tahoma'; 
        ctx.textAlign = 'center';
        ctx.fillText('I LOVE YOU', canvas.width/2, canvas.height/2 + 10);
    }
    dragVelocity.x *= DRAG_DAMPING; dragVelocity.y *= DRAG_DAMPING;
}

function startGame() {
    startButtonContainer.classList.add('hidden');
    music.volume = 0.5; music.play();
    stage = 1;
    createChristmasTreeParticles(1500);
    animate();
}