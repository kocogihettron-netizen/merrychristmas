const canvas = document.getElementById('christmasCanvas');
const ctx = canvas.getContext('2d');
const music = document.getElementById('bgMusic');
const startButtonContainer = document.getElementById('startButton');

let particles = [];
let animationFrameId;

// --- Cấu hình 3D ---
const focalLength = 300; 
let rotationY = 0; 
const ROTATION_SPEED = 0.005; 

// --- Cấu hình Tương tác Chuột ---
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let dragVelocity = { x: 0, y: 0 };
const DRAG_DAMPING = 0.95; 
const DRAG_FORCE_HORIZONTAL = 0.005; 
const DRAG_PUSH_FORCE = 0.5; 

// Các Stage: 1: Cây thông 3D, 2: Ảnh trôi nổi, 3: Trái tim
let stage = 0; 
let isNewStage = false; 

// --- Cấu hình Kích thước chung ---
// Tỷ lệ offset để căn chỉnh đỉnh ngôi sao và chữ MERRY CHRISTMAS
const TREE_VERTICAL_OFFSET_RATIO = 0.15; 
const STAR_SIZE = 50; 

// --- Thiết lập Media ---
const treeImage = new Image();
treeImage.src = 'images/image4.jpg'; 

const floatingImages = [];
const imageSources = ['images/image1.jpg', 'images/image2.jpg', 'images/image3.jpg']; 

// --- Cấu hình Canvas ---
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', setCanvasSize);
setCanvasSize();

// --- Xử lý Tương tác Chuột ---
function handleMouseDown(event) {
    if (stage === 1 || stage === 2 || stage === 3) {
        isDragging = true;
        lastMouse.x = event.clientX;
        lastMouse.y = event.clientY;
    }
}

function handleMouseUp() {
    isDragging = false;
}

function handleMouseMove(event) {
    if (isDragging) {
        const dx = event.clientX - lastMouse.x;
        const dy = event.clientY - lastMouse.y; 

        dragVelocity.x = dx * DRAG_FORCE_HORIZONTAL; 
        dragVelocity.y = dy * DRAG_FORCE_HORIZONTAL; 

        lastMouse.x = event.clientX;
        lastMouse.y = event.clientY;
    }
}

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp); 
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseleave', handleMouseUp); 


// --- Lớp Particle (Hạt) ---
class Particle {
    constructor(x, y, z, radius, color, velocity, isTreeParticle = false, isPermanent = false) { 
        this.x = x;
        this.y = y;
        this.z = z; 
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.friction = 0.99;
        this.isTreeParticle = isTreeParticle; 
        this.isPermanent = isPermanent; 
        this.originalX = x; 
        this.originalY = y;
        this.originalZ = z;
        
        this.projectedX = 0;
        this.projectedY = 0;
        this.projectedRadius = 0;
    }

    // Hàm xoay 3D
    rotate() {
        if (this.isTreeParticle && stage === 1) {
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            const tempX = this.originalX;
            const tempZ = this.originalZ;

            this.x = tempX * cosY - tempZ * sinY;
            this.z = tempX * sinY + tempZ * cosY;
            this.y = this.originalY; 
        }
    }

    // HÀM PROJECT: PHÉP CHIẾU 3D -> 2D 
    project() {
        const scale = focalLength / (focalLength + this.z);
        
        // --- TÍNH TOÁN VỊ TRÍ CHIẾU (DÙNG KÍCH THƯỚC CƠ SỞ ĐÃ KHẮC PHỤC MÉO) ---
        const baseSize = Math.min(canvas.width, canvas.height);
        const treeHeight = baseSize * 0.7; // Chiều cao mới (từ hàm tạo cây)
        const targetTipY = canvas.height * TREE_VERTICAL_OFFSET_RATIO; 
        
        const scaledTreeHeight = treeHeight * scale;

        const baseYProjected = targetTipY + scaledTreeHeight; 
        this.projectedY = baseYProjected - (this.y * scale); 
        
        this.projectedX = this.x * scale + canvas.width / 2;
        this.projectedRadius = this.radius * scale;
        this.alpha = Math.max(0.1, scale * 1.5); 
    }

    // Hàm draw để vẽ hình tròn
    draw() {
        if (this.projectedRadius > 0.1) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            
            ctx.beginPath();
            ctx.arc(this.projectedX, this.projectedY, this.projectedRadius, 0, Math.PI * 2, false);
            
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.projectedRadius * 5; 
            
            ctx.fill();
            ctx.restore();
        }
    }

    update() {
        if (stage === 1 && this.isTreeParticle) {
            this.rotate(); 
            
            // Giữ lại hiệu ứng rung nhẹ (wobble)
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.z += this.velocity.z;
            if (Math.abs(this.x - this.originalX) > 1) this.velocity.x *= -1;
            if (Math.abs(this.y - this.originalY) > 1) this.velocity.y *= -1;
            if (Math.abs(this.z - this.originalZ) > 1) this.velocity.z *= -1;
            
        } else {
            // Logic cho các Stage khác
            
            // --- ÁP DỤNG LỰC KÉO CỦA CHUỘT (Stage 2/3) ---
            if (isDragging) {
                this.velocity.x += dragVelocity.x * DRAG_PUSH_FORCE;
                this.velocity.y += dragVelocity.y * DRAG_PUSH_FORCE;
            }

            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.velocity.z *= this.friction; 
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.z += this.velocity.z; 
            
            if (!this.isPermanent) {
                this.alpha -= 0.005; 
            } else {
                 this.velocity.x *= 0.99;
                 this.velocity.y *= 0.99;
                 this.velocity.z *= 0.99;
                 if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
                 if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
                 if (Math.abs(this.velocity.z) < 0.1) this.velocity.z = 0;
            }
        }
        
        this.project(); 
        this.draw();
    }
}


// --- Lớp Floating Image (Giữ nguyên) ---
class FloatingImage {
    constructor(imageSrc) {
        this.img = new Image();
        this.img.src = imageSrc;
        this.size = 100 + Math.random() * 50; 
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        this.velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5
        };
        this.rotation = (Math.random() - 0.5) * 0.005;
        this.angle = 0;
        this.frameColor = '#FFD700'; 
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = this.frameColor;
        ctx.fillRect(-this.size / 2 - 5, -this.size / 2 - 5, this.size + 10, this.size + 10);

        if (this.img.complete) {
            ctx.drawImage(this.img, -this.size / 2, -this.size / 2, this.size, this.size);
        }
        
        ctx.restore();
    }

    update() {
        // Áp dụng lực kéo lên ảnh nổi (vào vận tốc)
        if (isDragging) {
            this.velocity.x += dragVelocity.x * DRAG_PUSH_FORCE * 5; 
            this.velocity.y += dragVelocity.y * DRAG_PUSH_FORCE * 5;
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.angle += this.rotation;

        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;

        if (this.x + this.size > canvas.width || this.x < 0) this.velocity.x *= -1;
        if (this.y + this.size > canvas.height || this.y < 0) this.velocity.y *= -1;

        this.draw();
    }
}

function createFloatingImages() {
    imageSources.forEach(src => {
        floatingImages.push(new FloatingImage(src));
    });
}


// --- Hàm tạo hạt nền (Giữ nguyên) ---
function createBackgroundParticles(count, x, y) {
    for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2 + 0.5;
        const colors = ['#FF4500', '#FFD700', '#F0E68C']; 
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const velocity = {
            x: Math.cos(angle) * Math.random() * 0.5,
            y: Math.sin(angle) * Math.random() * 0.5
        };
        particles.push(new Particle(x - canvas.width / 2, y - canvas.height / 2, 0, radius, color, velocity, false, false)); 
    }
}

// --- HÀM TẠO CÂY THÔNG 3D (ĐÃ KHẮC PHỤC BÓP MÉO) ---
function createChristmasTreeParticles(count) {
    // SỬ DỤNG KÍCH THƯỚC CƠ SỞ DỰA TRÊN MIN(WIDTH, HEIGHT) ĐỂ TRÁNH BÓP MÉO
    const baseSize = Math.min(canvas.width, canvas.height);
    
    // Tỉ lệ hình nón (Chiều cao gấp đôi bán kính)
    const treeHeight = baseSize * 0.7; // Chiều cao ~70% của kích thước nhỏ nhất
    const maxRadius = baseSize * 0.3; // Bán kính ~30% của kích thước nhỏ nhất

    for (let i = 0; i < count; i++) {
        const relativeY = Math.random(); 
        const currentRadius = maxRadius * (1 - relativeY); 
        
        const randomRadius = currentRadius * Math.sqrt(Math.random()); 
        const angle = Math.random() * Math.PI * 2; 

        const x = Math.cos(angle) * randomRadius; 
        const y = relativeY * treeHeight; 
        const z = Math.sin(angle) * randomRadius; 

        const radius = Math.random() * 1.5 + 0.5;
        const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF0000', '#F0E68C'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const velocity = { x: (Math.random() - 0.5) * 0.05, y: (Math.random() - 0.5) * 0.05, z: (Math.random() - 0.5) * 0.05 }; 

        const particle = new Particle(x, y, z, radius, color, velocity, true, false); 
        
        particles.push(particle);
    }
}

// --- Hàm tạo trái tim (ĐÃ CHỈNH KÍCH THƯỚC VÀ HÌNH DÁNG) ---
function createHeartParticles(count) {
    const scale = 10; // Giảm từ 15 xuống 10 (Nhỏ hơn)
    
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        
        const x_formula = scale * (16 * Math.pow(Math.sin(t), 3));
        // Hệ số 14 giúp trái tim tròn trịa, bớt nhọn
        const y_formula = scale * (14 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); 
        
        let x = x_formula + (Math.random() - 0.5) * 5; 
        // Dịch chuyển Y lên -15 (thay vì -20) để căn giữa tốt hơn
        let y = y_formula + (Math.random() - 0.5) * 5 - 15; 
        let z = (Math.random() - 0.5) * 50; 

        const radius = Math.random() * 1.5 + 0.5;
        const colors = ['#FF69B4', '#FF1493', '#FF00FF', '#FF0000']; 
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5,
            z: (Math.random() - 0.5) * 0.5
        };

        particles.push(new Particle(x, y, z, radius, color, velocity, false, false)); 
    }
}


// --- Hàm chuyển Stage khi click (Giữ nguyên) ---
function transitionStage() {
    if (isDragging) return; 

    if (stage === 1) {
        
        particles.forEach(p => {
            if (p.isTreeParticle) {
                p.isTreeParticle = false; 
                
                const angleH = Math.random() * Math.PI * 2; 
                const angleV = Math.random() * Math.PI;    
                const speed = Math.random() * 15 + 10; 

                p.velocity = {
                    x: Math.sin(angleV) * Math.cos(angleH) * speed,
                    y: Math.cos(angleV) * speed,
                    z: Math.sin(angleV) * Math.sin(angleH) * speed
                };
            }
        });
        
        setTimeout(() => {
            particles.forEach(p => {
                if (!p.isTreeParticle) { 
                    p.isPermanent = true; 
                    p.alpha = 1; 
                    p.friction = 0.95; 
                }
            });
            
            stage = 2;
            floatingImages.length = 0; 
            createFloatingImages(); 
        }, 500); 
        
    } else if (stage === 2) {
        stage = 3;
        floatingImages.length = 0; 
        particles = []; 
    }
}

canvas.addEventListener('click', transitionStage);


// --- Hàm chính để vẽ (Loop) ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    createBackgroundParticles(3, canvas.width / 2, canvas.height / 2);

    if (stage === 1) {
        // --- XỬ LÝ XOAY BẰNG CHUỘT (Stage 1) ---
        if (isDragging) {
            rotationY += dragVelocity.x; 
        } else {
             rotationY += ROTATION_SPEED; 
        }
        
        particles.sort((a, b) => (a.z + a.velocity.z) - (b.z + b.velocity.z));
    }
    
    // --- GIẢM DẦN VẬN TỐC KÉO CHUỘT ---
    dragVelocity.x *= DRAG_DAMPING;
    dragVelocity.y *= DRAG_DAMPING;

    // Cập nhật và vẽ tất cả các hạt
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (!particles[i].isPermanent && particles[i].alpha <= 0.1) {
            particles.splice(i, 1);
        }
    }

    // --- Vẽ nội dung Stage ---

    // Stage 1: Cây thông Noel
    if (stage === 1) {
        const treePeakYProjected = canvas.height * TREE_VERTICAL_OFFSET_RATIO; 
        
        // --- VẼ NGÔI SAO TRÊN ĐỈNH CÂY ---
        ctx.save();
        ctx.fillStyle = '#FFFF00'; 
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20; 
        ctx.font = `${STAR_SIZE}px serif`; 
        ctx.textAlign = 'center';
        ctx.fillText('★', canvas.width / 2, treePeakYProjected); 
        ctx.restore();

        // --- VẼ CHỮ MERRY CHRISTMAS ---
        ctx.font = 'bold 36px Tahoma, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 10;
        
        ctx.fillText('MERRY CHRISTMAS', canvas.width / 2, treePeakYProjected - 40); 
        ctx.shadowBlur = 0;
    }

    // Stage 2: Ảnh trôi nổi
    if (stage === 2) {
        floatingImages.forEach(image => image.update());
    }

    // Stage 3: Trái tim "I LOVE YOU"
    if (stage === 3) {
        createHeartParticles(10); 
        
        ctx.font = 'bold 50px Tahoma, sans-serif';
        ctx.fillStyle = '#FF69B4'; 
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FF00FF'; 
        ctx.shadowBlur = 15;
        // Chữ "I LOVE YOU" đặt tại trung tâm màn hình 
        ctx.fillText('I LOVE YOU', canvas.width / 2, canvas.height / 2 + 10);
        ctx.shadowBlur = 0;
    }
}

// --- Hàm bắt đầu Game khi click nút ---
function startGame() {
    startButtonContainer.classList.add('hidden');
    music.volume = 0.5; 
    music.play();
    
    stage = 1; 
    createChristmasTreeParticles(1500); 
    animate();
}