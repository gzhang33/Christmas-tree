/**
 * Sprite Generator Script
 * 
 * Run this script to generate placeholder sprite images.
 * Usage: node scripts/generateSprites.js
 * 
 * These are temporary placeholders - replace with real sprites from:
 * - OpenGameArt.org
 * - Kenney.nl
 * - Flaticon.com
 */

const fs = require('fs');
const path = require('path');

// 检查 canvas 包是否已安装
try {
    require.resolve('canvas');
} catch (e) {
    console.error('❌ 错误：缺少 canvas 包');
    console.error('💡 请先运行：npm install canvas');
    process.exit(1);
}

const { createCanvas } = require('canvas');
const OUTPUT_DIR = path.join(__dirname, '../public/sprites');
const SIZE = 128;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate gift box sprite
 */
function generateGiftBox() {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, SIZE, SIZE);

    const boxSize = SIZE * 0.7;
    const x = (SIZE - boxSize) / 2;
    const y = (SIZE - boxSize) / 2;

    // Shadow for depth (drawn first so it appears behind the gift)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + boxSize * 0.05, y + boxSize * 0.05, boxSize, boxSize);

    // Box body (red)
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(x, y, boxSize, boxSize);

    // Ribbon horizontal (gold)
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(x, y + boxSize * 0.4, boxSize, boxSize * 0.2);

    // Ribbon vertical
    ctx.fillRect(x + boxSize * 0.4, y, boxSize * 0.2, boxSize);

    // Bow
    ctx.beginPath();
    ctx.arc(x + boxSize / 2, y, boxSize * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#F39C12';
    ctx.fill();

    return canvas;
}

/**
 * Generate ornament ball sprite
 */
function generateOrnamentBall(color = '#E74C3C') {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, SIZE, SIZE);

    const radius = SIZE * 0.35;
    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    // Ball shadow
    ctx.beginPath();
    ctx.arc(centerX + 2, centerY + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Ball gradient
    const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -30));

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Top cap
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(centerX - radius * 0.2, centerY - radius * 1.3, radius * 0.4, radius * 0.4);

    // Cap ring
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#D4AF37';
    ctx.fill();

    return canvas;
}

/**
 * Generate UK flag ornament
 */
function generateUKFlagOrnament() {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, SIZE, SIZE);

    const radius = SIZE * 0.35;
    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    // Ball base
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#012169';  // UK Blue
    ctx.fill();

    // Simplified UK flag pattern
    // White cross
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = radius * 0.3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Red cross
    ctx.strokeStyle = '#C8102E';  // UK Red
    ctx.lineWidth = radius * 0.15;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Top cap
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(centerX - radius * 0.2, centerY - radius * 1.3, radius * 0.4, radius * 0.4);

    return canvas;
}

/**
 * Utility: Shade a hex color
 */
function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
        '#' +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)
    );
}

// Generate sprites
console.log('Generating placeholder sprites...');

const sprites = [
    { name: 'gift-box.png', generator: generateGiftBox },
    { name: 'ornament-ball.png', generator: () => generateOrnamentBall('#E74C3C') },
    { name: 'ornament-uk-flag.png', generator: generateUKFlagOrnament },
    { name: 'ornament-bus.png', generator: () => generateOrnamentBall('#CC0000') },
    { name: 'ornament-corgi.png', generator: () => generateOrnamentBall('#D4A574') },
];

sprites.forEach(({ name, generator }) => {
    const canvas = generator();
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Generated: ${name}`);
});

console.log('\n✅ All placeholder sprites generated!');
console.log('📁 Location: public/sprites/');
console.log('\n💡 Replace these with real sprites from:');
console.log('   - OpenGameArt.org');
console.log('   - Kenney.nl');
console.log('   - Flaticon.com');
