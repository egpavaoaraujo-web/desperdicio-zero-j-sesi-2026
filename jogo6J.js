"use strict";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
    setTimeout(resize, 100);
});
resize();

/* ---------- Audio ---------- */
let actx = null;
function audio() {
    try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        return actx;
    } catch (e) {
        return null;
    }
}
function beep(f, dur, type, vol) {
    try {
        const a = audio();
        if (!a) return;
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine';
        o.frequency.value = f;
        g.gain.value = vol || 0.14;
        o.connect(g);
        g.connect(a.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
        o.stop(a.currentTime + dur);
    } catch (e) { }
}
const sSlice = () => { beep(700, .07, 'triangle'); beep(1000, .06, 'triangle'); };
const sGood = () => { beep(520, .09, 'sine', .16); setTimeout(() => beep(680, .09, 'sine', .16), 70); setTimeout(() => beep(820, .12, 'sine', .16), 140); };
const sBad = () => { beep(200, .2, 'sawtooth', .15); setTimeout(() => beep(150, .22, 'sawtooth', .15), 90); };
const sLose = () => { beep(220, .4, 'sawtooth', .18); setTimeout(() => beep(160, .5, 'sawtooth', .18), 180); };
const sMon = () => { beep(300, .12, 'square', .1); setTimeout(() => beep(380, .12, 'square', .1), 110); };

/* ---------- State ---------- */
let state = 'menu', mode = 'classic', score = 0, lives = 4, spawnT = 0, time = 0;
let high = parseInt(localStorage.getItem('lixoninja_high') || '0', 10);
let foods = [], particles = [], floats = [], trail = [];
let monster = null, monsterT = 6, tipT = 0;

const GOOD_TYPES = ['apple', 'banana', 'orange', 'watermelon', 'strawberry', 'grapes', 'peach', 'pear', 'pineapple', 'lemon'];
const ROTTEN_TYPES = ['tomato', 'bread', 'apple', 'banana', 'cheese', 'potato', 'carrot', 'orange', 'egg', 'meat'];

const MOUTH_Y = () => H - 150;
const MOUTH_W = 150;
const CX = () => W / 2;

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

/* ---------- DOM helpers ---------- */
const $ = id => document.getElementById(id);
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

/* ---------- Flow ---------- */
function startGame(m) {
    mode = m;
    $('modeTag').textContent = m === 'classic' ? '🗑️ Modo Clássico' : '🧟 Modo Estragado';
    if (m === 'classic') {
        $('tutTitle').textContent = '🗑️ MODO CLÁSSICO';
        $('tutText').innerHTML =
            '<b>Como jogar:</b><br>' +
            '✅ <span class="good">Corte as comidas boas</span> que voam (+10).<br>' +
            '🗑️ <span class="bad">Comidas estragadas</span>: deixe cair na <b>lixeira</b> no fundo (+15).<br>' +
            '😱 Não corte a comida <b>podre</b> e não deixe comida boa cair no lixo → perde ❤️.<br>' +
            '👹 De vez em quando aparece o monstrinho gritando <i>"Jogue a comida fora!"</i> — clique nele para +5!<br>' +
            '<br><b>Você tem 4 vidas.</b>';
    } else {
        $('tutTitle').textContent = '🧟 MODO ESTRAGADO';
        $('tutText').innerHTML =
            '<b>Como jogar:</b><br>' +
            '✅ <span class="bad">Corte as comidas estragadas</span> para descartá-las (+10).<br>' +
            '😋 Deixe as <span class="good">comidas boas</span> caírem para a <b>pessoa de boca aberta</b> comer (+5).<br>' +
            '😷 Não deixe a pessoa comer comida <b>podre</b> e não corte comida <b>boa</b> → perde ❤️.<br>' +
            '👹 De vez em quando aparece o monstrinho gritando <i>"Me dê comida estragada!"</i> — clique nele para +5!<br>' +
            '<br><b>Você tem 4 vidas.</b>';
    }
    hide($('menu'));
    show($('tutorial'));
    show($('hud'));
    $('hint').innerHTML = m === 'classic'
        ? '✂️ Passe o dedo nas <b>frutas boas</b> 🍎🍌<br>🗑️ Deixe a comida <b>podre</b> cair na lixeira'
        : '✂️ Passe o dedo na comida <b>podre</b> 🦠<br>😋 Deixe a <b>fruta boa</b> cair para a pessoa comer';
}

function beginRound() {
    hide($('tutorial'));
    foods = []; particles = []; floats = []; trail = [];
    score = 0; lives = 4; spawnT = 0; time = 0; monster = null; monsterT = 6; tipT = 0;
    $('score').textContent = '0';
    $('lives').textContent = '❤️❤️❤️❤️';
    $('high').textContent = '🏆 Recorde: ' + high;
    state = 'play';
}

function restartSame() {
    hide($('gameover'));
    beginRound();
}

function goMenu() {
    state = 'menu';
    show($('menu'));
    hide($('gameover'));
}

function gameOver() {
    state = 'over';
    sLose();
    const rec = score > high;
    if (rec) {
        high = score;
        localStorage.setItem('lixoninja_high', high);
    }
    $('finalScore').textContent = 'Pontuação: ' + score;
    $('newRecord').textContent = rec ? '🏆 NOVO RECORDE! 🎉' : '';
    setTimeout(() => show($('gameover')), 600);
}

/* ---------- Food ---------- */
function spawnFood() {
    const x = rand(70, W - 70);
    const r = rand(36, 48);
    const good = Math.random() < (mode === 'classic' ? 0.6 : 0.45);
    const food = {
        x: x, y: H + 30, r: r,
        vx: rand(-70, 70),
        // sobe desde a base (H+30) até o terço superior (~H*0.30), nunca passa do topo
        vy: -Math.sqrt(2 * G * ((H - H * 0.30) + rand(-0.03, 0.05))),
        kind: good ? 'good' : 'rotten',
        type: good ? pick(GOOD_TYPES) : pick(ROTTEN_TYPES),
        sliced: false, rot: rand(0, 6.28), spin: rand(-1.3, 1.3), wob: rand(0, 6.28)
    };
    foods.push(food);
}

function launchFood(food) {
    food.vy = -rand(820, 1180);
    food.vx = rand(-180, 180);
    food.y = H + 30;
    food.x = rand(60, W - 60);
    food.sliced = false;
}

/* ---------- Scoring ---------- */
function addScore(n, x, y, label, color) {
    score += n;
    $('score').textContent = score;
    if (score > high) {
        high = score;
        $('high').textContent = '🏆 Recorde: ' + high;
    }
    floats.push({ x: x || W / 2, y: y || H / 2, vy: -70, alpha: 1, text: label || '+' + n, color: color || '#fff' });
}

function loseLife(x, y, label) {
    lives--;
    $('lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 4 - lives));
    floats.push({ x: x, y: y, vy: -70, alpha: 1, text: label || '-1 ❤️', color: '#ff5252' });
    sBad();
    if (lives <= 0) gameOver();
}

function onSlice(food) {
    if (food.sliced) return;
    food.sliced = true;
    burst(food.x, food.y, food.kind === 'rotten' ? '#6b8f3a' : '#ffd54f', 14);
    const correct = (mode === 'classic' && food.kind === 'good') || (mode === 'rotten' && food.kind === 'rotten');
    if (correct) {
        addScore(10, food.x, food.y, '+10', '#7dff8a');
        sSlice();
    } else {
        loseLife(food.x, food.y, mode === 'classic' ? 'Eca! comida podre! 💢' : 'Não corte comida boa! 💢');
    }
}

function onCollect(food) {
    food.sliced = true; // consumed
    burst(food.x, MOUTH_Y(), food.kind === 'good' ? '#7dff8a' : '#8bc34a', 8);
    if (mode === 'classic') {
        // lixeira
        if (food.kind === 'rotten') {
            addScore(15, food.x, MOUTH_Y() - 20, '+15 no lixo!', '#8ef0ff');
            sGood();
        } else {
            loseLife(food.x, MOUTH_Y() - 20, 'Desperdiçou comida boa! 💢');
        }
    } else {
        // pessoa come
        if (food.kind === 'good') {
            addScore(5, food.x, MOUTH_Y() - 20, '+5 😋', '#ffd54f');
            sGood();
        } else {
            loseLife(food.x, MOUTH_Y() - 20, 'Comida podre! 😵');
        }
    }
}

/* ---------- Particles / floats / trail ---------- */
function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(120, 320);
        particles.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - 120,
            life: rand(.4, .8),
            max: .8,
            color,
            size: rand(3, 8)
        });
    }
}

function addTrail(x, y) {
    trail.push({ x, y, t: performance.now() });
    if (trail.length > 24) trail.shift();
}

function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ---------- Monster ---------- */
function spawnMonster() {
    const side = Math.random() < 0.5 ? -1 : 1;
    monster = {
        x: side === -1 ? -120 : W + 120,
        y: rand(H * 0.15, H * 0.4),
        side: side,
        msg: mode === 'classic' ? 'Jogue a comida fora! 🗑️' : 'Me dê comida estragada! 👹',
        life: 4.2,
        happy: false,
        happyT: 0
    };
    sMon();
}

function clickMonster() {
    if (!monster) return;
    monster.happy = true;
    monster.happyT = 0.5;
    addScore(5, monster.x, monster.y - 60, '+5 😋', '#ffd54f');
    sGood();
}

/* ---------- Pointer ---------- */
const ptr = { x: 0, y: 0, down: false, lx: 0, ly: 0, hasLast: false, lt: 0 };

function onPointerDown(e) {
    audio();
    const p = canvasPoint(e);
    ptr.x = ptr.lx = p.x;
    ptr.y = ptr.ly = p.y;
    ptr.down = true;
    ptr.hasLast = true;
    ptr.lt = performance.now();
    if (state === 'play' && monster) {
        const d = Math.hypot(p.x - monster.x, p.y - monster.y);
        if (d < 70) clickMonster();
    }
}

function onPointerMove(e) {
    if (state !== 'play' && !ptr.down) return;
    const p = canvasPoint(e);
    const now = performance.now();
    const dt = Math.max(0.001, (now - ptr.lt) / 1000);
    addTrail(p.x, p.y);
    if (state === 'play') {
        for (const f of foods) {
            if (!f.sliced && segDist(f.x, f.y, ptr.lx, ptr.ly, p.x, p.y) < f.r * 1.15) {
                onSlice(f);
            }
        }
    }
    ptr.x = p.x;
    ptr.y = p.y;
    ptr.lx = p.x;
    ptr.ly = p.y;
    ptr.lt = now;
}

function onPointerUp() {
    ptr.down = false;
    ptr.hasLast = false;
}

function canvasPoint(e) {
    const t = (e.touches && e.touches[0]) || e;
    return { x: t.clientX || t.pageX, y: t.clientY || t.pageY };
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
window.addEventListener('touchend', onPointerUp);
window.addEventListener('touchcancel', onPointerUp);

/* ---------- Update ---------- */
const G = 480;

function update(dt) {
    time += dt;
    // spawn
    if (state === 'play') {
        spawnT -= dt;
        if (spawnT <= 0) {
            spawnFood();
            const rate = Math.max(1.4, 2.4 - score * 0.001);
            spawnT = rand(rate * 0.8, rate * 1.2);
            if (Math.random() < 0.15 && foods.length < 6) spawnFood();
        }
        // monster
        monsterT -= dt;
        if (monsterT <= 0) {
            spawnMonster();
            monsterT = rand(8, 12);
        }
    }
    if (monster) {
        monster.life -= dt;
        if (monster.happy) {
            monster.happyT -= dt;
            if (monster.happyT <= 0) monster.happy = false;
        }
        const spd = 60;
        monster.x += monster.side * spd * dt;
        monster.y += Math.sin(time * 2) * 18 * dt;
        if (monster.life <= 0 || monster.x < -160 || monster.x > W + 160) monster = null;
    }

    // foods
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        if (f.sliced) {
            foods.splice(i, 1);
            continue;
        }
        f.vy += G * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.spin * dt;
        f.wob += dt * 4;
        f.x = Math.min(W - 20, Math.max(20, f.x));
        // collector: only when the food is falling back down
        if (f.vy > 0 && f.y > MOUTH_Y() - 4 && Math.abs(f.x - CX()) < MOUTH_W / 2) {
            onCollect(f);
            foods.splice(i, 1);
            continue;
        }
        // fell off
        if (f.y > H + 80) {
            foods.splice(i, 1);
            continue;
        }
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 600 * dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
    // floats
    for (let i = floats.length - 1; i >= 0; i--) {
        const t = floats[i];
        t.vy -= 40 * dt;
        t.y += t.vy * dt;
        t.alpha -= dt * 1.2;
        if (t.alpha <= 0) floats.splice(i, 1);
    }
    // trail
    const now = performance.now();
    trail = trail.filter(p => now - p.t < 220);
}

/* ---------- Draw helpers ---------- */
function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawFruit(f) {
    const bob = Math.sin(f.wob) * 3;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.rotate(f.rot * 0.2);
    drawFoodBody(f);
    if (f.kind === 'rotten') drawMold(f);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(f.x, f.y + bob, f.r, 0, Math.PI * 2);
    ctx.strokeStyle = f.kind === 'rotten' ? 'rgba(150,190,80,.7)' : 'rgba(255,255,255,.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawFoodBody(f) {
    ctx.save();
    ctx.scale(f.r / 40, f.r / 40);
    const t = f.type;
    if (t === 'apple') drawApple();
    else if (t === 'banana') drawBanana();
    else if (t === 'orange') drawOrange();
    else if (t === 'watermelon') drawWatermelon();
    else if (t === 'strawberry') drawStrawberry();
    else if (t === 'grapes') drawGrapes();
    else if (t === 'peach') drawPeach();
    else if (t === 'pear') drawPear();
    else if (t === 'pineapple') drawPineapple();
    else if (t === 'lemon') drawLemon();
    else if (t === 'tomato') drawTomato();
    else if (t === 'bread') drawBread();
    else if (t === 'cheese') drawCheese();
    else if (t === 'potato') drawPotato();
    else if (t === 'carrot') drawCarrot();
    else if (t === 'egg') drawEgg();
    else if (t === 'meat') drawMeat();
    else {
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawApple() {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(-9, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a3c1a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, -24);
    ctx.quadraticCurveTo(6, -34, 14, -38);
    ctx.stroke();
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(16, -30, 9, 5, -0.6, 0, Math.PI * 2);
    ctx.fill();
}

function drawBanana() {
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, 16);
    ctx.quadraticCurveTo(0, 20, 22, -14);
    ctx.stroke();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-14, 12);
    ctx.quadraticCurveTo(2, 14, 16, -8);
    ctx.stroke();
}

function drawOrange() {
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(0, 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(-8, 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 16, 2 + Math.sin(a) * 16, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(2, -28, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawWatermelon() {
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(0, 0, 26, Math.PI * 0.05, Math.PI * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f1f1f1';
    ctx.beginPath();
    ctx.arc(0, 0, 26, Math.PI * 0.15, Math.PI * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 0, 20, Math.PI * 0.22, Math.PI * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    for (let a = 0.3; a < Math.PI - 0.3; a += 0.3) {
        const rr = 14 + Math.random() * 4;
        ctx.save();
        ctx.translate(Math.cos(a) * rr, -Math.sin(a) * rr);
        ctx.rotate(a);
        ctx.fillRect(-1.5, -3, 3, 6);
        ctx.restore();
    }
}

function drawStrawberry() {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(24, -14, 20, 6);
    ctx.quadraticCurveTo(16, 26, 0, 30);
    ctx.quadraticCurveTo(-16, 26, -20, 6);
    ctx.quadraticCurveTo(-24, -14, 0, -22);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(10, 6, 8, 16);
    ctx.quadraticCurveTo(6, 26, 0, 28);
    ctx.quadraticCurveTo(-6, 26, -8, 16);
    ctx.quadraticCurveTo(-10, 6, 0, -2);
    ctx.fill();
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-14, -28);
    ctx.lineTo(-6, -16);
    ctx.lineTo(0, -22);
    ctx.lineTo(6, -16);
    ctx.lineTo(14, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    for (let i = 0; i < 6; i++) {
        const x = (i % 3 - 1) * 7;
        const y = 8 + i * 4;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.6, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGrapes() {
    const cols = ['#8e44ad', '#9b59b6', '#7d3c98'];
    let i = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c <= r; c++) {
            const x = c * 14 - (r * 7);
            const y = 6 + r * 14;
            ctx.fillStyle = cols[i % 3];
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fill();
            i++;
        }
    }
    ctx.strokeStyle = '#7a5c1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(4, -22, 14, -26);
    ctx.stroke();
}

function drawPeach() {
    ctx.fillStyle = '#f9a825';
    ctx.beginPath();
    ctx.arc(0, 4, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef7d3b';
    ctx.beginPath();
    ctx.arc(0, 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,60,30,.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(4, 6, -2, 22);
    ctx.stroke();
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(12, -22, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
}

function drawPear() {
    ctx.fillStyle = '#7ed321';
    ctx.beginPath();
    ctx.arc(0, -12, 18, 0, Math.PI * 2);
    ctx.arc(0, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6ab04c';
    ctx.beginPath();
    ctx.arc(-6, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4e1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.quadraticCurveTo(2, -38, 10, -42);
    ctx.stroke();
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(14, -34, 8, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawPineapple() {
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 6;
    for (let row = -1; row <= 1; row++) {
        for (let i = 0; i < 4; i++) {
            const x = (i - 1.5) * 12;
            const y = row * 14;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x + 5, y);
            ctx.stroke();
        }
    }
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-8, -32);
    ctx.moveTo(0, -18);
    ctx.lineTo(8, -32);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -34);
    ctx.moveTo(0, -18);
    ctx.lineTo(-12, -24);
    ctx.moveTo(0, -18);
    ctx.lineTo(12, -24);
    ctx.stroke();
}

function drawLemon() {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath();
    ctx.ellipse(-6, 4, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c1a';
    ctx.beginPath();
    ctx.arc(-26, 0, 3, 0, Math.PI * 2);
    ctx.arc(26, 0, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawTomato() {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 4, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(-8, 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-12, -24);
    ctx.lineTo(-5, -14);
    ctx.lineTo(0, -18);
    ctx.lineTo(5, -14);
    ctx.lineTo(12, -24);
    ctx.closePath();
    ctx.fill();
}

function drawBread() {
    ctx.fillStyle = '#d68910';
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.quadraticCurveTo(-18, -26, 0, -24);
    ctx.quadraticCurveTo(18, -26, 24, -6);
    ctx.quadraticCurveTo(18, 22, 0, 22);
    ctx.quadraticCurveTo(-18, 22, -24, -6);
    ctx.fill();
    ctx.fillStyle = '#b9770e';
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.quadraticCurveTo(0, -12, 14, -4);
    ctx.quadraticCurveTo(12, 10, 0, 10);
    ctx.quadraticCurveTo(-12, 10, -14, -4);
    ctx.fill();
}

function drawCheese() {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-26, 18);
    ctx.lineTo(-10, -18);
    ctx.lineTo(26, -14);
    ctx.lineTo(24, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.lineTo(16, -16);
    ctx.lineTo(15, 2);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e67e22';
    [[8, -6], [16, 6], [-2, 8], [22, -2]].forEach(c => {
        ctx.beginPath();
        ctx.arc(c[0], c[1], 3.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPotato() {
    ctx.fillStyle = '#a5692f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d5424';
    ctx.beginPath();
    ctx.ellipse(-6, 4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d3a14';
    ctx.beginPath();
    ctx.arc(-8, -4, 2, 0, Math.PI * 2);
    ctx.arc(9, 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawCarrot() {
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(-10, -26);
    ctx.quadraticCurveTo(18, -6, 8, 26);
    ctx.quadraticCurveTo(-16, 10, -10, -26);
    ctx.fill();
    ctx.fillStyle = '#ca6f1e';
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.quadraticCurveTo(4, -2, 2, 10);
    ctx.quadraticCurveTo(-8, 2, -8, -10);
    ctx.fill();
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(-16, -34);
    ctx.moveTo(-8, -20);
    ctx.lineTo(-2, -36);
    ctx.moveTo(-8, -20);
    ctx.lineTo(4, -30);
    ctx.stroke();
}

function drawEgg() {
    ctx.fillStyle = '#fdfefe';
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1f1f1';
    ctx.beginPath();
    ctx.ellipse(-4, 6, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawMeat() {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(-22, -8);
    ctx.quadraticCurveTo(-10, -24, 12, -18);
    ctx.quadraticCurveTo(24, -10, 22, 8);
    ctx.quadraticCurveTo(10, 22, -8, 18);
    ctx.quadraticCurveTo(-24, 12, -22, -8);
    ctx.fill();
    ctx.fillStyle = '#922b21';
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(2, -12, 14, -6);
    ctx.quadraticCurveTo(10, 8, -2, 8);
    ctx.quadraticCurveTo(-8, 4, -8, -4);
    ctx.fill();
    ctx.fillStyle = '#fdfefe';
    ctx.beginPath();
    ctx.arc(-16, -14, 5, 0, Math.PI * 2);
    ctx.arc(18, -16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fdfefe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.quadraticCurveTo(4, -20, 16, -16);
    ctx.stroke();
}

function drawMold(f) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#7daf3a';
    const angs = [0.3, 1.4, 2.6, 3.8, 5.0, 0.9];
    const rads = [8, 16, 12, 18, 14, 10];
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(angs[i]) * rads[i], Math.sin(angs[i]) * rads[i], 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = performance.now() / 500;
    for (let i = 0; i < 3; i++) {
        const fx = Math.sin(t + i * 2.4) * f.r * 0.8;
        const fy = Math.cos(t + i * 1.7) * f.r * 0.7 - f.r * 1.1;
        ctx.fillText('🪰', fx, fy);
    }
    ctx.restore();
}

function drawBackground() {
    ctx.fillStyle = '#caa05a';
    ctx.fillRect(0, 0, W, H);
    const ph = H / 7;
    for (let r = 0; r < 7; r++) {
        const y = r * ph;
        ctx.fillStyle = r % 2 === 0 ? '#b98a45' : '#c49a52';
        ctx.fillRect(0, y, W, ph);
        ctx.fillStyle = 'rgba(90,55,20,.5)';
        ctx.fillRect(0, y, W, 5);
        ctx.fillStyle = 'rgba(90,55,20,.35)';
        const stagger = (r % 2) * 80;
        for (let v = stagger; v < W; v += 260) {
            ctx.fillRect(v, y, 5, ph);
        }
        ctx.strokeStyle = 'rgba(90,55,20,.18)';
        ctx.lineWidth = 2;
        let x = 0;
        while (x < W) {
            ctx.beginPath();
            const off = Math.sin(x * 0.05 + r) * 6;
            ctx.moveTo(x, y + off + 12);
            ctx.quadraticCurveTo(x + 60, y + off + 6 + Math.sin(r) * 4, x + 120, y + off + 14);
            ctx.stroke();
            x += 120;
        }
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(60,30,0,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(70,40,10,.7)';
    ctx.fillRect(0, MOUTH_Y() + 8, W, H - (MOUTH_Y() + 8));
}

function drawTrash() {
    const cx = CX(), cy = MOUTH_Y();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(cx, H - 18, 130, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d5a80';
    rr(cx - 95, cy - 10, 190, H - cy + 10, 14);
    ctx.fill();
    ctx.fillStyle = '#2f4766';
    rr(cx - 95, cy - 10, 190, H - cy + 10, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 4;
    for (let yy = cy + 30; yy < H - 20; yy += 26) {
        ctx.beginPath();
        ctx.moveTo(cx - 95, yy);
        ctx.lineTo(cx + 95, yy);
        ctx.stroke();
    }
    ctx.fillStyle = '#5b82ad';
    rr(cx - 110, cy - 34, 220, 28, 10);
    ctx.fill();
    ctx.fillStyle = '#7ba7d4';
    rr(cx - 110, cy - 34, 220, 12, 10);
    ctx.fill();
    ctx.fillStyle = '#101820';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 62, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '30px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♻️', cx, cy + (H - cy) / 2);
}

function drawPerson() {
    const cx = CX(), cy = MOUTH_Y();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(cx, H - 14, 110, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e07a5f';
    rr(cx - 85, cy + 4, 170, H - cy, 20);
    ctx.fill();
    ctx.fillStyle = '#b04f35';
    rr(cx - 85, cy + 4, 170, H - cy, 20);
    ctx.fill();
    ctx.fillStyle = '#f7c873';
    rr(cx - 40, cy + 14, 80, 40, 14);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(cx, cy - 26, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b3a29';
    ctx.beginPath();
    ctx.arc(cx, cy - 52, 74, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e0a880';
    ctx.beginPath();
    ctx.arc(cx - 74, cy - 30, 14, 0, Math.PI * 2);
    ctx.arc(cx + 74, cy - 30, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 28, cy - 34, 14, 0, Math.PI * 2);
    ctx.arc(cx + 28, cy - 34, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx - 28, cy - 34, 6, 0, Math.PI * 2);
    ctx.arc(cx + 28, cy - 34, 6, 0, Math.PI * 2);
    ctx.fill();
    const open = 1;
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 60, 26 * open + 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f76d6d';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 50, 18 * open + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦷', cx - 26, cy + 2);
    ctx.fillText('🦷', cx, cy + 4);
    ctx.fillText('🦷', cx + 26, cy + 2);
    ctx.fillStyle = 'rgba(255,120,120,.4)';
    ctx.beginPath();
    ctx.arc(cx - 46, cy - 16, 12, 0, Math.PI * 2);
    ctx.arc(cx + 46, cy - 16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('me dê comida boa! 😋', cx, cy - 78);
}

function drawMonster() {
    if (!monster) return;
    const m = monster;
    const bob = Math.sin(time * 3) * 4;
    const hx = m.x, hy = m.y + bob;
    const happy = m.happy;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(m.msg).width + 24;
    const by = hy - 90;
    rr(hx - tw / 2, by - 24, tw, 40, 12);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 8, by + 16);
    ctx.lineTo(hx + 2, by + 30);
    ctx.lineTo(hx + 12, by + 16);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillText(m.msg, hx, by - 1);
    ctx.fillStyle = '#58a04a';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 42, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d7a33';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 14, 42, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f5a27';
    ctx.beginPath();
    ctx.moveTo(hx - 30, hy - 30);
    ctx.lineTo(hx - 38, hy - 52);
    ctx.lineTo(hx - 14, hy - 34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 30, hy - 30);
    ctx.lineTo(hx + 38, hy - 52);
    ctx.lineTo(hx + 14, hy - 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx - 15, hy - 8, 11, 0, Math.PI * 2);
    ctx.arc(hx + 15, hy - 8, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    const ey = happy ? -2 : 0;
    ctx.beginPath();
    ctx.arc(hx - 15, hy - 8 + ey, 5, 0, Math.PI * 2);
    ctx.arc(hx + 15, hy - 8 + ey, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (happy) {
        ctx.arc(hx, hy + 10, 12, 0, Math.PI);
    } else {
        ctx.moveTo(hx - 14, hy + 8);
        ctx.lineTo(hx + 14, hy + 8);
    }
    ctx.stroke();
    ctx.strokeStyle = '#58a04a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hx - 40, hy + 8);
    ctx.lineTo(hx - 54, hy + 26);
    ctx.moveTo(hx + 40, hy + 8);
    ctx.lineTo(hx + 54, hy + 26);
    ctx.stroke();
}

/* ---------- Draw ---------- */
function draw() {
    ctx.clearRect(0, 0, W, H);
    if (state === 'menu') { return; }
    drawBackground();
    const now = performance.now();
    for (const t of trail) {
        const age = (now - t.t) / 220;
        const a = (1 - age) * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 6 * (1 - age) + 1, 0, Math.PI * 2);
        ctx.fill();
    }
    for (const f of foods) drawFruit(f);
    if (mode === 'classic') drawTrash();
    else drawPerson();
    drawMonster();
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of floats) {
        ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.lineWidth = 4;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
}

/* ---------- Loop ---------- */
let last = performance.now();
function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);