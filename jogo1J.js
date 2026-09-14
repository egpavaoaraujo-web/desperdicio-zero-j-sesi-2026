(function () {
    const stage = document.getElementById('stage');
    const basket = document.getElementById('basket');
    const scoreVal = document.getElementById('scoreVal');
    const heartsEl = document.getElementById('hearts');
    const phasePill = document.getElementById('phasePill');
    const phaseBarFill = document.getElementById('phaseBarFill');
    const startOverlay = document.getElementById('startOverlay');
    const overOverlay = document.getElementById('overOverlay');
    const finalScoreVal = document.getElementById('finalScoreVal');
    const overMsg = document.getElementById('overMsg');

    const FRUITS = ['🍓', '🍉', '🍌', '🍍', '🍊', '🍎', '🍇', '🥭', '🍐', '🍒', '🥝', '🍋'];

    // Pelo menos 5 fases: cada fase deixa as frutas caírem mais rápido
    const PHASES = [
        { label: 'Comecinho', fallSpeedMin: 105, fallSpeedMax: 135, spawnInterval: 1450, duration: 24000 },
        { label: 'Pegando o jeito', fallSpeedMin: 135, fallSpeedMax: 170, spawnInterval: 1250, duration: 22000 },
        { label: 'Esquentando', fallSpeedMin: 170, fallSpeedMax: 210, spawnInterval: 1080, duration: 22000 },
        { label: 'Ritmo forte', fallSpeedMin: 205, fallSpeedMax: 250, spawnInterval: 930, duration: 20000 },
        { label: 'Quase no limite', fallSpeedMin: 245, fallSpeedMax: 295, spawnInterval: 800, duration: 20000 },
        { label: 'Fase Final', fallSpeedMin: 285, fallSpeedMax: 345, spawnInterval: 680, duration: 999999 },
    ];

    let fruits = [];
    let idCounter = 0;
    let score = 0;
    let lives = 3;
    const MAX_LIVES = 3;
    let running = false;
    let lastTs = null;
    let spawnTimer = null;
    let phaseAdvanceTimer = null;
    let phaseIndex = 0;
    let phaseStartedAt = 0;
    let audioCtx = null;

    let config = { spawnInterval: 1450, fallSpeedMin: 105, fallSpeedMax: 135 };

    const basketState = { x: 0, width: 110, speed: 340, moveLeft: false, moveRight: false };

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function playTone(type) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            if (type === 'good') { o.type = 'sine'; o.frequency.setValueAtTime(660, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(990, audioCtx.currentTime + .12); }
            else { o.type = 'sawtooth'; o.frequency.setValueAtTime(220, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + .18); }
            g.gain.setValueAtTime(.001, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(.16, audioCtx.currentTime + .02);
            g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .22);
            o.start(); o.stop(audioCtx.currentTime + .24);
        } catch (e) { }
    }

    function updateHUD() {
        scoreVal.textContent = score;
        let h = '';
        for (let i = 0; i < MAX_LIVES; i++) h += (i < lives) ? '❤️' : '🤍';
        heartsEl.textContent = h;
    }

    function updatePhaseHUD() {
        phasePill.textContent = 'Fase ' + (phaseIndex + 1) + '/' + PHASES.length;
    }

    function makeDecor() {
        for (let i = 0; i < 3; i++) {
            const c = document.createElement('div');
            c.className = 'decor cloud';
            c.style.top = (16 + i * 66) + 'px';
            c.style.left = (i % 2 === 0 ? rand(10, 40) : rand(60, 90)) + '%';
            stage.appendChild(c);
        }
    }

    function showPhaseBanner() {
        const p = PHASES[phaseIndex];
        const b = document.createElement('div');
        b.className = 'phaseBanner';
        const numText = 'Fase ' + (phaseIndex + 1) + (phaseIndex < PHASES.length - 1 ? '/' + PHASES.length : '');
        b.innerHTML = '<div class="pbNum">' + numText + '</div><div class="pbName">' + p.label + '</div>';
        stage.appendChild(b);
        setTimeout(() => b.remove(), 2000);
    }

    function startPhase(i) {
        phaseIndex = i;
        const p = PHASES[Math.min(i, PHASES.length - 1)];
        config.spawnInterval = p.spawnInterval;
        config.fallSpeedMin = p.fallSpeedMin;
        config.fallSpeedMax = p.fallSpeedMax;
        phaseStartedAt = performance.now();
        updatePhaseHUD();
        showPhaseBanner();
        clearTimeout(phaseAdvanceTimer);
        if (i < PHASES.length - 1) {
            phaseAdvanceTimer = setTimeout(() => startPhase(i + 1), p.duration);
        }
    }

    /* ---------- teclado ---------- */
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') basketState.moveLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') basketState.moveRight = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') basketState.moveLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') basketState.moveRight = false;
    });
    /* arraste/toque como alternativa no celular */
    let dragging = false;
    stage.addEventListener('pointerdown', (e) => {
        if (!running) return;
        dragging = true;
        setBasketFromClientX(e.clientX);
    });
    stage.addEventListener('pointermove', (e) => {
        if (!dragging || !running) return;
        setBasketFromClientX(e.clientX);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    function setBasketFromClientX(clientX) {
        const stageRect = stage.getBoundingClientRect();
        basketState.x = clamp(clientX - stageRect.left - basketState.width / 2, 0, stage.clientWidth - basketState.width);
        applyBasketTransform();
    }
    function applyBasketTransform() {
        basket.style.transform = 'translateX(' + basketState.x + 'px)';
    }

    function spawnFruit() {
        const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        const size = 52;
        const stageW = stage.clientWidth;

        const el = document.createElement('div');
        el.className = 'fruit';
        el.innerHTML = '<span class="fruitEmoji">' + emoji + '</span>';
        stage.appendChild(el);

        const f = {
            id: idCounter++, el, size, caught: false,
            x: rand(6, Math.max(6, stageW - size - 6)),
            y: -size - rand(0, 30),
            speed: rand(config.fallSpeedMin, config.fallSpeedMax),
            rotation: rand(-12, 12),
            rotSpeed: rand(-30, 30)
        };
        applyFruitTransform(f);
        fruits.push(f);
    }

    function applyFruitTransform(f) {
        f.el.style.transform = 'translate(' + f.x + 'px,' + f.y + 'px) rotate(' + f.rotation + 'deg)';
    }

    function floatText(text, x, y, kind) {
        const t = document.createElement('div');
        t.className = 'floatText ' + kind;
        t.textContent = text;
        t.style.left = clamp(x, 4, stage.clientWidth - 80) + 'px';
        t.style.top = clamp(y, 4, stage.clientHeight - 30) + 'px';
        stage.appendChild(t);
        setTimeout(() => t.remove(), 950);
    }

    function catchFruit(f) {
        f.caught = true;
        score += 10;
        const bx = f.x, by = f.y;
        f.el.classList.add('caughtAnim');
        floatText('+10', bx, by, 'good');
        basket.classList.add('catchFlash');
        setTimeout(() => basket.classList.remove('catchFlash'), 260);
        playTone('good');
        setTimeout(() => removeFruit(f), 300);
        updateHUD();
    }

    function missFruit(f) {
        f.caught = true;
        lives -= 1;
        floatText('Desperdício! 😢', f.x, stage.clientHeight - 70, 'bad');
        f.el.classList.add('missedAnim');
        playTone('bad');
        setTimeout(() => removeFruit(f), 300);
        updateHUD();
        checkGameOver();
    }

    function removeFruit(f) {
        f.el.remove();
        fruits = fruits.filter(x => x !== f);
    }

    function checkGameOver() {
        if (lives <= 0) { endGame(); }
    }

    function tick(ts) {
        if (!running) return;
        if (lastTs === null) lastTs = ts;
        const dt = Math.min(.05, (ts - lastTs) / 1000);
        lastTs = ts;

        if (basketState.moveLeft) basketState.x -= basketState.speed * dt;
        if (basketState.moveRight) basketState.x += basketState.speed * dt;
        basketState.x = clamp(basketState.x, 0, stage.clientWidth - basketState.width);
        applyBasketTransform();

        const p = PHASES[Math.min(phaseIndex, PHASES.length - 1)];
        if (p.duration < 999999) {
            const elapsed = ts - phaseStartedAt;
            phaseBarFill.style.width = clamp((elapsed / p.duration) * 100, 0, 100) + '%';
        } else {
            phaseBarFill.style.width = '100%';
        }

        const basketTop = stage.clientHeight - 14 - 64;
        const basketBottom = stage.clientHeight - 14;
        const basketLeft = basketState.x;
        const basketRight = basketState.x + basketState.width;
        const groundY = stage.clientHeight - 4;

        fruits.slice().forEach(f => {
            if (f.caught) return;
            f.y += f.speed * dt;
            f.rotation += f.rotSpeed * dt;
            applyFruitTransform(f);

            const fruitBottom = f.y + f.size;
            const fruitCenterX = f.x + f.size / 2;

            if (fruitBottom >= basketTop && fruitBottom <= basketBottom + 20 &&
                fruitCenterX >= basketLeft && fruitCenterX <= basketRight) {
                catchFruit(f);
            } else if (fruitBottom >= groundY) {
                missFruit(f);
            }
        });
        requestAnimationFrame(tick);
    }

    function spawnLoop() {
        if (!running) return;
        spawnFruit();
        spawnTimer = setTimeout(spawnLoop, config.spawnInterval + rand(-120, 120));
    }

    function startGame() {
        fruits.forEach(f => f.el.remove());
        fruits = [];
        score = 0; lives = MAX_LIVES;
        basketState.x = 0; basketState.moveLeft = false; basketState.moveRight = false;
        updateHUD();
        startOverlay.classList.add('hidden');
        overOverlay.classList.add('hidden');
        running = true;
        lastTs = null;
        clearTimeout(spawnTimer);
        clearTimeout(phaseAdvanceTimer);
        startPhase(0);
        requestAnimationFrame(() => {
            basketState.x = clamp(stage.clientWidth / 2 - basketState.width / 2, 0, stage.clientWidth - basketState.width);
            applyBasketTransform();
        });
        spawnLoop();
        requestAnimationFrame(tick);
    }

    function endGame() {
        running = false;
        clearTimeout(spawnTimer);
        clearTimeout(phaseAdvanceTimer);
        finalScoreVal.textContent = score;
        const reachedFinal = phaseIndex >= PHASES.length - 1;
        overMsg.textContent = reachedFinal ? 'Incrível! Você chegou até a Fase Final. 🏆'
            : score >= 120 ? 'Excelente! Você é craque em evitar desperdício. 🌟 Chegou até a fase ' + (phaseIndex + 1) + '.'
                : score >= 50 ? 'Muito bem! Você chegou até a fase ' + (phaseIndex + 1) + '.'
                    : 'Foi um começo! Você chegou até a fase ' + (phaseIndex + 1) + '. Tente de novo.';
        overOverlay.classList.remove('hidden');
    }

    makeDecor();
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('retryBtn').addEventListener('click', startGame);
    updateHUD();
    updatePhaseHUD();
})();