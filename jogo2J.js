/* =====================================================
   COZINHA DO BOLO — script.js
   Jogo de confeitaria com conscientização sobre o
   desperdício de alimentos. Um erro de descarte permitido.
   ===================================================== */

'use strict';

/* =====================================================
   CONFIGURAÇÕES
   ===================================================== */

const CONFIG = {
    BASE_POINTS: 100,        // pedido correto
    SPEED_BONUS_MAX: 50,     // bônus por rapidez (proporcional ao tempo restante)
    PERFECT_BONUS: 50,       // bônus adicional: pedido perfeito (sem desperdício)
    COMBO_BONUS: 10,         // pontos extras por nível de combo
    WRONG_PENALTY: 50,       // pedido errado entregue
    DISCARD_PENALTY: 100,    // descartar um bolo
    TIMEOUT_PENALTY: 50,     // tempo esgotado
    TIMER_TICK: 1000
};

const TIPS = [
    "Conferir o pedido antes de começar pode evitar desperdícios.",
    "Planejamento ajuda a usar melhor os ingredientes.",
    "Um erro na cozinha pode representar desperdício de tempo, ingredientes e dinheiro.",
    "Evitar desperdícios começa antes mesmo de preparar a comida.",
    "Anote mentalmente cada item do pedido antes de montar.",
    "Pense duas vezes antes de finalizar o bolo.",
    "Cada bolo desperdiçado custa pontos e recursos."
];

const CUSTOMERS = ['🧑‍🍳', '👩‍🍳', '👨‍🍳', '🧔', '👩', '👨', '👵', '👴', '🧒', '👧', '🧑', '👦', '👩‍🦰', '👨‍🦱'];

/* =====================================================
   ESTADO DO JOGO
   ===================================================== */

const state = {
    screen: 'menu',
    levelIndex: 0,
    order: null,
    queue: [],
    cake: { batter: null, layers: 1, filling: null, covering: null, decoration: null },
    activeStep: 'batter',
    score: 0,
    combo: 0,
    maxCombo: 0,
    discardAvailable: 1,
    wasteCount: 0,
    wrongCount: 0,
    correctCount: 0,
    cakesMade: 0,
    timeoutCount: 0,
    requiredCorrect: 0,
    timeLeft: 0,
    timerInterval: null,
    lastFinalizeTime: 0
};

const settings = { sound: true, volume: 0.7, animations: true };

const progress = { unlocked: 1, bestScore: {}, stars: {} };

/* =====================================================
   DADOS DOS INGREDIENTES
   ===================================================== */

const BATTERS = [
    { id: 'vanilla', name: 'Baunilha', emoji: '🍰', color: '#f2e3c2' },
    { id: 'chocolate', name: 'Chocolate', emoji: '🍫', color: '#6b4226' },
    { id: 'strawberry', name: 'Morango', emoji: '🍓', color: '#f7a8b8' },
    { id: 'coconut', name: 'Coco', emoji: '🥥', color: '#fbf7ee' }
];

const FILLINGS = [
    { id: 'strawberry', name: 'Morango', emoji: '🍓', color: '#ff5f7a' },
    { id: 'chocolate', name: 'Chocolate', emoji: '🍫', color: '#8a5a2b' },
    { id: 'lemon', name: 'Limão', emoji: '🍋', color: '#f6e36b' },
    { id: 'vanilla', name: 'Baunilha', emoji: '🥛', color: '#f3e7d5' }
];

const COVERINGS = [
    { id: 'purple', name: 'Roxa', emoji: '🟣', color: '#a66bdd' },
    { id: 'pink', name: 'Rosa', emoji: '🩷', color: '#ff9ec4' },
    { id: 'white', name: 'Branca', emoji: '🤍', color: '#faf7f2' },
    { id: 'chocolate', name: 'Chocolate', emoji: '🟤', color: '#6b4226' },
    { id: 'green', name: 'Verde', emoji: '🟢', color: '#7ecb6a' }
];

const DECORATIONS = [
    { id: 'stars', name: 'Estrelas', emoji: '⭐', symbol: '⭐' },
    { id: 'strawberries', name: 'Morangos', emoji: '🍓', symbol: '🍓' },
    { id: 'chocolate', name: 'Chocolate', emoji: '🍫', symbol: '🍫' },
    { id: 'sprinkles', name: 'Confetes', emoji: '🌈', symbol: '✨' },
    { id: 'flowers', name: 'Flores', emoji: '🌸', symbol: '🌸' }
];

const LAYERS = [1, 2, 3];

function getById(list, id) { return list.find(x => x.id === id) || null; }

/* =====================================================
   DADOS DAS FASES
   ===================================================== */

const LEVELS = [
    {
        id: 1, name: 'APRENDIZ', title: 'NÍVEL 1 — APRENDIZ',
        desc: 'Pedidos simples, poucas opções.',
        requiredCorrect: 4, time: 45,
        batterIds: ['vanilla', 'chocolate', 'strawberry'],
        fillingIds: ['strawberry', 'chocolate'],
        coveringIds: ['pink', 'white', 'chocolate'],
        decorationIds: ['stars', 'strawberries'],
        layers: [1, 2]
    },
    {
        id: 2, name: 'CONFEITEIRO', title: 'NÍVEL 2 — CONFEITEIRO',
        desc: 'Mais combinações, mais pedidos.',
        requiredCorrect: 6, time: 40,
        batterIds: ['vanilla', 'chocolate', 'strawberry', 'coconut'],
        fillingIds: ['strawberry', 'chocolate', 'lemon'],
        coveringIds: ['pink', 'white', 'chocolate', 'purple'],
        decorationIds: ['stars', 'strawberries', 'sprinkles'],
        layers: [1, 2, 3]
    },
    {
        id: 3, name: 'CONFEITARIA MOVIMENTADA', title: 'NÍVEL 3 — CONFEITARIA MOVIMENTADA',
        desc: 'Mais velocidade e fila de pedidos.',
        requiredCorrect: 8, time: 35,
        batterIds: BATTERS.map(x => x.id),
        fillingIds: FILLINGS.map(x => x.id),
        coveringIds: COVERINGS.map(x => x.id),
        decorationIds: DECORATIONS.map(x => x.id),
        layers: [1, 2, 3]
    },
    {
        id: 4, name: 'MESTRE DOS BOLOS', title: 'NÍVEL 4 — MESTRE DOS BOLOS',
        desc: 'Pedidos complexos, muito detalhe.',
        requiredCorrect: 10, time: 30,
        batterIds: BATTERS.map(x => x.id),
        fillingIds: FILLINGS.map(x => x.id),
        coveringIds: COVERINGS.map(x => x.id),
        decorationIds: DECORATIONS.map(x => x.id),
        layers: [1, 2, 3]
    },
    {
        id: 5, name: 'CONFEITEIRO CONSCIENTE', title: 'NÍVEL 5 — CONFEITEIRO CONSCIENTE',
        desc: 'Pedidos complexos, pouco tempo e uma única chance de descarte.',
        requiredCorrect: 10, time: 25,
        batterIds: BATTERS.map(x => x.id),
        fillingIds: FILLINGS.map(x => x.id),
        coveringIds: COVERINGS.map(x => x.id),
        decorationIds: DECORATIONS.map(x => x.id),
        layers: [1, 2, 3]
    }
];

/* =====================================================
   JOGADOR / PROGRESSO
   ===================================================== */

function currentLevel() { return LEVELS[state.levelIndex]; }

/* =====================================================
   SISTEMA DE SOM (Web Audio — sem arquivos externos)
   ===================================================== */

let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, dur, type, vol, delay) {
    if (!settings.sound || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t0 = audioCtx.currentTime + (delay || 0);
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime((vol || 0.3) * settings.volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur);
}

const Sound = {
    click: () => { ensureAudio(); tone(600, 0.08, 'triangle', 0.25); },
    select: () => { ensureAudio(); tone(780, 0.12, 'triangle', 0.28); },
    success: () => { ensureAudio(); tone(660, 0.12, 'sine', 0.3); tone(880, 0.16, 'sine', 0.3, 0.1); tone(1100, 0.2, 'sine', 0.3, 0.2); },
    perfect: () => { ensureAudio();[520, 660, 780, 1040].forEach((f, i) => tone(f, 0.18, 'sine', 0.3, i * 0.09)); },
    error: () => { ensureAudio(); tone(320, 0.2, 'sawtooth', 0.22); tone(240, 0.25, 'sawtooth', 0.2, 0.15); },
    discard: () => { ensureAudio(); tone(200, 0.2, 'sawtooth', 0.25); tone(140, 0.3, 'sawtooth', 0.2, 0.15); },
    timeout: () => { ensureAudio(); tone(420, 0.15, 'square', 0.2); tone(300, 0.2, 'square', 0.2, 0.15); },
    gameover: () => { ensureAudio();[330, 280, 220, 160].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.22, i * 0.18)); },
    win: () => { ensureAudio();[523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.3, i * 0.12)); }
};

/* =====================================================
   SISTEMA DE PEDIDOS
   ===================================================== */

function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateOrder(level) {
    return {
        batter: randomOf(level.batterIds),
        layers: randomOf(level.layers),
        filling: randomOf(level.fillingIds),
        covering: randomOf(level.coveringIds),
        decoration: randomOf(level.decorationIds),
        customer: randomOf(CUSTOMERS)
    };
}

function generateQueue(level, count) {
    const q = [];
    for (let i = 0; i < count; i++) q.push(generateOrder(level));
    return q;
}

/* =====================================================
   SISTEMA DE MONTAGEM
   ===================================================== */

function setStep(step) {
    state.activeStep = step;
    document.querySelectorAll('.step-tab').forEach(t => t.classList.toggle('active', t.dataset.step === step));
    renderStepContent();
}

function renderStepContent() {
    const box = document.getElementById('step-content');
    const step = state.activeStep;
    let html = '';

    if (step === 'batter') {
        html += '<div class="step-hint">Escolha a massa do bolo:</div><div class="option-grid">';
        for (const b of BATTERS) {
            const sel = state.cake.batter === b.id ? ' selected' : '';
            html += `<button class="option-btn${sel}" data-opt="batter" data-id="${b.id}"><span class="o-emoji">${b.emoji}</span><span class="o-name">${b.name}</span></button>`;
        }
        html += '</div>';
    } else if (step === 'layers') {
        html += '<div class="step-hint">Quantas camadas?</div><div class="option-grid">';
        for (const n of LAYERS) {
            const sel = state.cake.layers === n ? ' selected' : '';
            const cake = '🎂'.repeat(Math.min(n, 3));
            html += `<button class="option-btn layers-btn${sel}" data-opt="layers" data-id="${n}"><span class="o-name">${cake} ${n} camada${n > 1 ? 's' : ''}</span></button>`;
        }
        html += '</div>';
    } else if (step === 'filling') {
        html += '<div class="step-hint">Escolha o recheio:</div><div class="option-grid">';
        for (const f of FILLINGS) {
            const sel = state.cake.filling === f.id ? ' selected' : '';
            html += `<button class="option-btn${sel}" data-opt="filling" data-id="${f.id}"><span class="o-emoji">${f.emoji}</span><span class="o-name">${f.name}</span></button>`;
        }
        html += '</div>';
    } else if (step === 'covering') {
        html += '<div class="step-hint">Escolha a cobertura:</div><div class="option-grid">';
        for (const c of COVERINGS) {
            const sel = state.cake.covering === c.id ? ' selected' : '';
            html += `<button class="option-btn${sel}" data-opt="covering" data-id="${c.id}"><span class="o-emoji">${c.emoji}</span><span class="o-name">${c.name}</span></button>`;
        }
        html += '</div>';
    } else if (step === 'decoration') {
        html += '<div class="step-hint">Escolha a decoração:</div><div class="option-grid">';
        for (const d of DECORATIONS) {
            const sel = state.cake.decoration === d.id ? ' selected' : '';
            html += `<button class="option-btn${sel}" data-opt="decoration" data-id="${d.id}"><span class="o-emoji">${d.emoji}</span><span class="o-name">${d.name}</span></button>`;
        }
        html += '</div>';
    }
    box.innerHTML = html;
}

/* =====================================================
   VISUALIZAÇÃO DO BOLO
   ===================================================== */

function renderCake() {
    const view = document.getElementById('cake-view');
    const c = state.cake;
    const batter = getById(BATTERS, c.batter);
    const filling = getById(FILLINGS, c.filling);
    const covering = getById(COVERINGS, c.covering);
    const decoration = getById(DECORATIONS, c.decoration);

    if (!batter || !filling || !covering) {
        let missing = [];
        if (!batter) missing.push('Massa');
        if (!filling) missing.push('Recheio');
        if (!covering) missing.push('Cobertura');
        view.innerHTML = `<div class="cake-placeholder">🧁 Montando bolo...<br/>Faltando: ${missing.join(', ') || '—'}</div>`;
        return;
    }

    let html = '';
    if (decoration) html += `<div class="cake-decoration">${decoration.symbol} ${decoration.symbol}</div>`;

    for (let i = 0; i < c.layers; i++) {
        html += `
      <div class="cake-tier">
        <div class="tier-covering" style="background:${covering.color}"></div>
        <div class="tier-filling" style="background:${filling.color}"></div>
        <div class="tier-batter" style="background:${batter.color}"></div>
      </div>`;
    }
    view.innerHTML = html;
}

/* =====================================================
   SISTEMA DE COMPARAÇÃO
   ===================================================== */

function isOrderComplete() {
    return !!(state.cake.batter && state.cake.filling && state.cake.covering && state.cake.decoration);
}

function compareCakeToOrder() {
    const c = state.cake;
    const o = state.order;
    return c.batter === o.batter &&
        c.layers === o.layers &&
        c.filling === o.filling &&
        c.covering === o.covering &&
        c.decoration === o.decoration;
}

/* =====================================================
   HUD
   ===================================================== */

function updateHUD() {
    document.getElementById('hud-level-val').textContent = `${currentLevel().id} · ${currentLevel().name}`;
    document.getElementById('hud-score').textContent = state.score;
    document.getElementById('hud-combo').textContent = `🔥 x${state.combo}`;
    const disc = document.getElementById('hud-discard');
    disc.textContent = state.discardAvailable;
    disc.classList.toggle('zero', state.discardAvailable === 0);
    document.getElementById('hud-progress').textContent = `${state.correctCount}/${state.requiredCorrect}`;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const el = document.getElementById('hud-timer');
    const s = Math.max(0, state.timeLeft);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${mm}:${ss}`;
    el.classList.toggle('low', s <= 10);
}

function renderOrder() {
    const o = state.order;
    const b = getById(BATTERS, o.batter);
    const f = getById(FILLINGS, o.filling);
    const c = getById(COVERINGS, o.covering);
    const d = getById(DECORATIONS, o.decoration);
    document.getElementById('customer').textContent = o.customer;
    document.getElementById('ord-batter').textContent = `${b.emoji} ${b.name}`;
    document.getElementById('ord-layers').textContent = `${o.layers} camada${o.layers > 1 ? 's' : ''}`;
    document.getElementById('ord-filling').textContent = `${f.emoji} ${f.name}`;
    document.getElementById('ord-covering').textContent = `${c.emoji} ${c.name}`;
    document.getElementById('ord-decoration').textContent = `${d.emoji} ${d.name}`;
    renderQueue();
}

function renderQueue() {
    const box = document.getElementById('queue-box');
    const list = document.getElementById('queue-list');
    const lvl = currentLevel();
    const showQueue = lvl.id >= 3;
    box.style.display = showQueue ? 'block' : 'none';
    if (!showQueue) return;
    list.innerHTML = state.queue.map(q => {
        const d = getById(DECORATIONS, q.decoration);
        const c = getById(COVERINGS, q.covering);
        return `<div class="queue-item">${q.customer} ${c.emoji} ${d.emoji} · ${q.layers} camada${q.layers > 1 ? 's' : ''}</div>`;
    }).join('');
}

/* =====================================================
   SISTEMA DE TEMPO
   ===================================================== */

function startTimer() {
    clearInterval(state.timerInterval);
    state.timeLeft = currentLevel().time;
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        if (state.timeLeft <= 0) handleTimeout();
    }, CONFIG.TIMER_TICK);
}

function stopTimer() { clearInterval(state.timerInterval); state.timerInterval = null; }

function handleTimeout() {
    stopTimer();
    state.score = Math.max(0, state.score - CONFIG.TIMEOUT_PENALTY);
    state.timeoutCount++;
    state.combo = 0;
    state.cakesMade++;
    Sound.timeout();
    showToast('⏱️ PEDIDO PERDIDO! O tempo acabou.', 'waste');
    // Sem desperdício: o bolo ainda não foi finalizado.
    nextOrder(false);
}

/* =====================================================
   SISTEMA DE PONTUAÇÃO + COMBO
   ===================================================== */

function handleCorrect() {
    stopTimer();
    state.cakesMade++;
    state.correctCount++;
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    let gained = CONFIG.BASE_POINTS;
    const frac = Math.max(0, state.timeLeft) / currentLevel().time;
    const speedBonus = Math.round(CONFIG.SPEED_BONUS_MAX * frac);
    let perfectBonus = 0;

    if (state.discardAvailable === 1) {
        perfectBonus = CONFIG.PERFECT_BONUS;
    }

    gained += speedBonus + perfectBonus + (state.combo - 1) * CONFIG.COMBO_BONUS;
    state.score += gained;

    Sound.success();
    if (perfectBonus > 0) Sound.perfect();
    showToast(`✅ PEDIDO CORRETO! +${gained} pontos`, 'ok');

    const win = state.correctCount >= state.requiredCorrect;
    if (win) {
        Sound.win();
        setTimeout(() => completeLevel(), 500);
    } else {
        nextOrder(true);
    }
}

function handleWrong() {
    // Um bolo errado foi finalizado.
    if (state.discardAvailable === 1) {
        // PRIMEIRO ERRO — oferece a única oportunidade de descarte.
        stopTimer();
        Sound.error();
        openErrorModal();
    } else {
        // SEGUNDO ERRO — fim de jogo.
        stopTimer();
        state.wrongCount++;
        Sound.gameover();
        gameOver();
    }
}

/* =====================================================
   DIALOGO DO PRIMEIRO ERRO
   ===================================================== */

function openErrorModal() {
    document.getElementById('modal-error').classList.remove('hidden');
}

function closeErrorModal() {
    document.getElementById('modal-error').classList.add('hidden');
}

function discardCake() {
    closeErrorModal();
    state.discardAvailable = 0;
    state.wasteCount++;
    state.cakesMade++;
    state.score = Math.max(0, state.score - CONFIG.DISCARD_PENALTY);
    state.combo = 0;
    Sound.discard();
    showToast('🗑️ Você desperdiçou uma tentativa. Agora será preciso ter ainda mais atenção.', 'waste');
    resetCake();
    updateHUD();
    startTimer(); // tenta novamente o mesmo pedido
}

function deliverAnyway() {
    closeErrorModal();
    // Usa a única oportunidade (descarte) mas NÃO gera desperdício.
    state.discardAvailable = 0;
    state.wrongCount++;
    state.cakesMade++;
    state.score = Math.max(0, state.score - CONFIG.WRONG_PENALTY);
    state.combo = 0;
    Sound.error();
    showToast('❌ O cliente rejeitou o pedido. -50 pontos', 'error');
    nextOrder(false);
}

/* =====================================================
   PEDIDOS / FLUXO
   ===================================================== */

function resetCake() {
    state.cake = { batter: null, layers: 1, filling: null, covering: null, decoration: null };
    state.activeStep = 'batter';
    renderCake();
    setStep('batter');
    highlightTabs();
}

function nextOrder(keepQueue) {
    const lvl = currentLevel();
    if (!keepQueue && lvl.id >= 3) {
        if (state.queue.length > 0) {
            state.order = state.queue.shift();
        } else {
            state.order = generateOrder(lvl);
        }
    } else {
        state.order = generateOrder(lvl);
    }
    resetCake();
    renderOrder();
    updateHUD();
    showTip();
    startTimer();
}

function highlightTabs() {
    document.querySelectorAll('.step-tab').forEach(t => {
        const has = !!state.cake[t.dataset.step];
        t.style.opacity = has ? '1' : '0.85';
    });
}

/* =====================================================
   MENSAGENS EDUCATIVAS
   ===================================================== */

function showTip() {
    const el = document.getElementById('game-tip');
    el.textContent = '💡 ' + randomOf(TIPS);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
}

function showToast(msg, kind) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' error' : kind === 'waste' ? ' waste' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
}

/* =====================================================
   FIM DE FASE / VITÓRIA
   ===================================================== */

function completeLevel() {
    stopTimer();
    const stars = computeStars();
    saveLevelResult(stars);

    const lvl = currentLevel();
    document.getElementById('lc-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('lc-stats').innerHTML = buildStatsHTML();
    const next = document.getElementById('lc-next');
    const hasNext = state.levelIndex < LEVELS.length - 1;
    next.style.display = hasNext ? '' : 'none';

    showScreen('levelcomplete');
}

function computeStars() {
    // 1 estrela: completou. 2 estrelas: poucos erros. 3 estrelas: nenhum desperdício.
    let stars = 1;
    if (state.wasteCount === 0) stars++;
    if (state.wrongCount === 0 && state.timeoutCount === 0) stars++;
    return stars;
}

function gameOver() {
    stopTimer();
    showScreen('gameover');
    document.getElementById('go-stats').innerHTML = buildStatsHTML();
}

function buildStatsHTML() {
    const total = state.cakesMade || 0;
    const aproveitamento = total > 0 ? Math.round((state.correctCount / total) * 100) : 0;
    const rows = [
        ['🍰 Bolos preparados', state.cakesMade],
        ['✅ Pedidos corretos', state.correctCount],
        ['❌ Pedidos errados', state.wrongCount],
        ['⏱️ Tempo esgotado', state.timeoutCount],
        ['🗑️ Bolos desperdiçados', state.wasteCount],
        ['♻️ Aproveitamento', aproveitamento + '%'],
        ['🔥 Maior combo', 'x' + state.maxCombo],
        ['⭐ Pontuação', state.score]
    ];
    return rows.map(r => `<div class="stats-row"><span>${r[0]}</span><span class="s-val">${r[1]}</span></div>`).join('');
}

/* =====================================================
   SISTEMA DE FASES
   ===================================================== */

function startLevel(index) {
    if (index + 1 > progress.unlocked) return;
    state.levelIndex = index;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.discardAvailable = 1;
    state.wasteCount = 0;
    state.wrongCount = 0;
    state.correctCount = 0;
    state.cakesMade = 0;
    state.timeoutCount = 0;
    state.requiredCorrect = currentLevel().requiredCorrect;
    state.queue = [];
    if (currentLevel().id >= 3) state.queue = generateQueue(currentLevel(), 3);

    showScreen('game');
    nextOrder(false);
}

function renderLevelSelect() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = LEVELS.map((lvl, i) => {
        const locked = i + 1 > progress.unlocked;
        const stars = progress.stars[i + 1] || 0;
        return `
      <div class="level-card${locked ? ' locked' : ''}" data-level="${i}">
        <div class="num">🎂</div>
        <div class="lname">${lvl.title}</div>
        <div class="desc">${lvl.desc}</div>
        <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      </div>`;
    }).join('');
}

/* =====================================================
   MENUS / NAVEGAÇÃO
   ===================================================== */

function showScreen(name) {
    state.screen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    if (name === 'menu') document.getElementById('btn-quit').style.display = 'none';
    else document.getElementById('btn-quit').style.display = '';
    if (name !== 'game') stopTimer();
}

function goMenu() { stopTimer(); showScreen('menu'); }

/* =====================================================
   LOCALSTORAGE
   ===================================================== */

const LS_KEYS = { progress: 'cozinha_progress', settings: 'cozinha_settings' };

function loadData() {
    try {
        const p = JSON.parse(localStorage.getItem(LS_KEYS.progress));
        if (p && typeof p === 'object') Object.assign(progress, p);
        const s = JSON.parse(localStorage.getItem(LS_KEYS.settings));
        if (s && typeof s === 'object') Object.assign(settings, s);
    } catch (e) { /* ignora dados corrompidos */ }
}

function saveProgress() {
    try { localStorage.setItem(LS_KEYS.progress, JSON.stringify(progress)); } catch (e) { }
}

function saveSettings() {
    try { localStorage.setItem(LS_KEYS.settings, JSON.stringify(settings)); } catch (e) { }
}

function saveLevelResult(stars) {
    const lvlId = currentLevel().id;
    progress.stars[lvlId] = Math.max(progress.stars[lvlId] || 0, stars);
    progress.bestScore[lvlId] = Math.max(progress.bestScore[lvlId] || 0, state.score);
    if (lvlId + 1 <= LEVELS.length) {
        progress.unlocked = Math.max(progress.unlocked, lvlId + 1);
    }
    saveProgress();
}

function resetProgress() {
    progress.unlocked = 1;
    progress.bestScore = {};
    progress.stars = {};
    saveProgress();
    showToast('🧹 Progresso resetado!', 'ok');
}

/* =====================================================
   EVENTOS
   ===================================================== */

document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
        Sound.click();
        const dest = nav.dataset.nav;
        if (dest === 'play') {
            const idx = Math.min(progress.unlocked - 1, LEVELS.length - 1);
            startLevel(idx);
        } else if (dest === 'levels') {
            renderLevelSelect();
            showScreen('levels');
        } else {
            showScreen(dest);
        }
        return;
    }

    const levelCard = e.target.closest('.level-card');
    if (levelCard && !levelCard.classList.contains('locked')) {
        Sound.click();
        startLevel(parseInt(levelCard.dataset.level, 10));
        return;
    }

    const stepTab = e.target.closest('.step-tab');
    if (stepTab) { Sound.click(); setStep(stepTab.dataset.step); return; }

    const optBtn = e.target.closest('.option-btn');
    if (optBtn) {
        const key = optBtn.dataset.opt;
        const id = key === 'layers' ? parseInt(optBtn.dataset.id, 10) : optBtn.dataset.id;
        state.cake[key] = id;
        Sound.select();
        renderStepContent();
        renderCake();
        highlightTabs();
        return;
    }
});

document.getElementById('btn-finalize').addEventListener('click', () => {
    if (!state.order) return;
    if (!isOrderComplete()) {
        Sound.error();
        showToast('🧁 Escolha massa, recheio, cobertura e decoração antes de finalizar.', 'error');
        return;
    }
    if (compareCakeToOrder()) {
        handleCorrect();
    } else {
        handleWrong();
    }
});

document.getElementById('btn-discard').addEventListener('click', discardCake);
document.getElementById('btn-deliver-anyway').addEventListener('click', deliverAnyway);

document.getElementById('btn-quit').addEventListener('click', () => { Sound.click(); goMenu(); });

document.getElementById('lc-next').addEventListener('click', () => {
    Sound.click();
    if (state.levelIndex < LEVELS.length - 1) startLevel(state.levelIndex + 1);
});
document.getElementById('lc-replay').addEventListener('click', () => { Sound.click(); startLevel(state.levelIndex); });
document.getElementById('go-replay').addEventListener('click', () => { Sound.click(); startLevel(state.levelIndex); });

// Configurações
document.getElementById('set-sound').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); });
document.getElementById('set-volume').addEventListener('input', (e) => { settings.volume = e.target.value / 100; saveSettings(); });
document.getElementById('set-anim').addEventListener('change', (e) => {
    settings.animations = e.target.checked;
    document.body.classList.toggle('no-anim', !settings.animations);
    saveSettings();
});
document.getElementById('btn-reset').addEventListener('click', () => { Sound.click(); resetProgress(); });

/* =====================================================
   LOOP DO JOGO / INICIALIZAÇÃO
   ===================================================== */

function init() {
    loadData();
    document.getElementById('set-sound').checked = settings.sound;
    document.getElementById('set-volume').value = Math.round(settings.volume * 100);
    document.getElementById('set-anim').checked = settings.animations;
    document.body.classList.toggle('no-anim', !settings.animations);
    renderLevelSelect();
    showScreen('menu');
}

init();
