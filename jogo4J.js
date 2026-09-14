const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const keys = {};
let running = false, paused = false, phaseIndex = 0;
let last = 0, messageTimer = 0;

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key.toLowerCase() === "e") interact();
    if (e.key === "Escape" && running) togglePause();
});
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const player = { x: 120, y: 300, w: 26, h: 34, speed: 175, carrying: null };

let state = {
    water: 100, energy: 100, seeds: 5, tomatoes: 0, carrots: 0, boxes: 0,
    money: 50, waste: 0, meals: 0, bought: 0, stored: 0
};

const phases = [
    {
        name: "FAZENDA", role: "👨‍🌾 Fazendeiro",
        bg: "#8bcf73", intro: "Você é o fazendeiro. Prepare a terra, plante, regue e colha.",
        objectives: ["Preparar 3 terrenos", "Plantar 3 sementes", "Regar 3 plantas", "Colher 3 alimentos", "Guardar a colheita"],
        setup() {
            objects = [
                obj("shed", 760, 100, 100, 90, "📦", "Galpão"),
                obj("water", 780, 430, 70, 65, "💧", "Reservatório"),
                obj("seed", 90, 90, 70, 60, "🌱", "Caixa de sementes"),
                obj("house", 60, 470, 130, 75, "🏠", "Casa"),
                obj("soil", 300, 180, 95, 75, "🟫", "Terra", "soil", 0),
                obj("soil", 440, 180, 95, 75, "🟫", "Terra", "soil", 1),
                obj("soil", 370, 315, 95, 75, "🟫", "Terra", "soil", 2)
            ];
        }
    },
    {
        name: "ARMAZENAMENTO", role: "📦 Trabalhador do armazenamento",
        bg: "#d5b27b", intro: "Organize as caixas para que os alimentos possam viajar com segurança.",
        objectives: ["Pegar uma caixa de tomate", "Levar ao local correto", "Pegar uma caixa de cenoura", "Organizar a segunda caixa"],
        setup() {
            objects = [
                obj("stock", 100, 115, 130, 95, "📦", "Estoque de caixas"),
                obj("tomatoSpot", 600, 120, 150, 90, "🍅", "Local dos tomates"),
                obj("carrotSpot", 600, 330, 150, 90, "🥕", "Local das cenouras"),
                obj("exit", 820, 500, 90, 60, "🚪", "Saída")
            ];
        }
    },
    {
        name: "TRANSPORTE", role: "🚚 Motorista",
        bg: "#9aa5ad", intro: "Leve os alimentos até o mercado. Dirija com cuidado para evitar perdas.",
        objectives: ["Entrar no caminhão", "Chegar ao mercado", "Entregar a carga"],
        setup() {
            objects = [
                obj("truck", 110, 430, 150, 75, "🚚", "Caminhão"),
                obj("market", 790, 90, 120, 110, "🏪", "Mercado"),
                obj("rock", 400, 150, 55, 55, "🪨", "Obstáculo"),
                obj("rock", 530, 370, 55, 55, "🪨", "Obstáculo"),
                obj("rock", 700, 270, 55, 55, "🪨", "Obstáculo")
            ];
        }
    },
    {
        name: "MERCADO", role: "🧑‍💼 Repositor",
        bg: "#e4d8c0", intro: "Reponha os alimentos e organize os produtos para que os mais antigos saiam primeiro.",
        objectives: ["Pegar caixa do estoque", "Repor tomate", "Pegar segunda caixa", "Repor cenoura"],
        setup() {
            objects = [
                obj("stock", 100, 100, 140, 110, "📦", "Estoque"),
                obj("shelfT", 500, 100, 170, 90, "🍅", "Prateleira de tomates"),
                obj("shelfC", 500, 320, 170, 90, "🥕", "Prateleira de cenouras"),
                obj("checkout", 790, 470, 110, 70, "🛒", "Caixa")
            ];
        }
    },
    {
        name: "COMPRAS", role: "🛒 Consumidor",
        bg: "#d6e3ef", intro: "Compre somente o que precisa. Promoções podem parecer boas, mas comprar demais pode gerar desperdício.",
        objectives: ["Pegar 2 tomates", "Pegar 1 cenoura", "Levar ao caixa"],
        setup() {
            objects = [
                obj("tomatoes", 170, 150, 150, 85, "🍅", "Tomates"),
                obj("carrots", 170, 340, 150, 85, "🥕", "Cenouras"),
                obj("promo", 500, 150, 170, 80, "🏷️", "Promoção: leve 5"),
                obj("checkout", 760, 430, 120, 80, "🛒", "Caixa")
            ];
        }
    },
    {
        name: "CASA", role: "🏠 Pessoa em casa",
        bg: "#d8c3a5", intro: "Organize a geladeira e planeje a refeição antes de cozinhar.",
        objectives: ["Guardar os alimentos", "Abrir a geladeira", "Planejar a refeição"],
        setup() {
            objects = [
                obj("bags", 120, 380, 110, 80, "🛍️", "Sacolas"),
                obj("fridge", 560, 120, 125, 220, "🧊", "Geladeira"),
                obj("table", 350, 410, 170, 90, "🍽️", "Mesa"),
                obj("trash", 800, 430, 70, 70, "🗑️", "Lixeira")
            ];
        }
    },
    {
        name: "COZINHA", role: "🍳 Cozinheiro",
        bg: "#ead9c6", intro: "Prepare uma quantidade adequada, aproveite as sobras e evite colocar comida fora.",
        objectives: ["Pegar ingredientes", "Preparar a refeição", "Servir", "Decidir o que fazer com a sobra"],
        setup() {
            objects = [
                obj("fridge", 100, 120, 125, 180, "🧊", "Geladeira"),
                obj("counter", 390, 110, 190, 100, "🔪", "Bancada"),
                obj("stove", 390, 330, 150, 100, "🍳", "Fogão"),
                obj("table", 690, 130, 170, 100, "🍽️", "Mesa"),
                obj("trash", 780, 420, 70, 70, "🗑️", "Lixeira")
            ];
        }
    }
];

let objects = [];

function obj(type, x, y, w, h, icon, label, sub = "", index = 0) {
    return { type, x, y, w, h, icon, label, sub, index, state: 0, used: false };
}

function resetState() {
    state = { water: 100, energy: 100, seeds: 5, tomatoes: 0, carrots: 0, boxes: 0, money: 50, waste: 0, meals: 0, bought: 0, stored: 0 };
    phaseIndex = 0;
}

function startGame() {
    resetState(); loadPhase(0);
    document.getElementById("startScreen").classList.add("hidden");
    running = true; paused = false; requestAnimationFrame(loop);
}
function loadPhase(i) {
    phaseIndex = i;
    player.x = 120; player.y = 300; player.carrying = null;
    phases[i].setup();
    document.getElementById("phaseName").textContent = phases[i].name;
    showMessage(phases[i].intro);
    updateHUD();
}
function togglePause() {
    paused = !paused;
    document.getElementById("pauseScreen").classList.toggle("hidden", !paused);
}
function nextPhase() {
    if (phaseIndex < phases.length - 1) loadPhase(phaseIndex + 1);
    else finishGame();
}
function finishGame() {
    running = false;
    document.getElementById("finalStats").innerHTML =
        `<p><b>Alimentos aproveitados:</b> ${Math.max(0, 100 - state.waste)}%</p>
     <p><b>Desperdício:</b> ${state.waste}%</p>
     <p><b>Etapas concluídas:</b> ${phases.length}/7</p>`;
    document.getElementById("finishScreen").classList.remove("hidden");
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function solid(o) {
    return ["shed", "house", "water", "seed", "soil", "stock", "tomatoSpot", "carrotSpot", "truck", "market", "rock", "shelfT", "shelfC", "checkout", "tomatoes", "carrots", "promo", "bags", "fridge", "table", "trash", "counter", "stove"].includes(o.type);
}
function blocked(nx, ny) {
    const p = { x: nx, y: ny, w: player.w, h: player.h };
    if (nx < 8 || ny < 8 || nx + player.w > W - 8 || ny + player.h > H - 8) return true;
    return objects.some(o => solid(o) && rectsOverlap(p, { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 }) && o.type !== "soil");
}
function move(dt) {
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (dx || dy) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        const speed = phaseIndex === 2 && player.carrying === "truck" ? 235 : player.speed;
        let nx = player.x + dx * speed * dt, ny = player.y + dy * speed * dt;
        if (!blocked(nx, player.y)) player.x = nx;
        if (!blocked(player.x, ny)) player.y = ny;
        if (phaseIndex === 0) state.energy = Math.max(0, state.energy - 0.7 * dt);
    }
}
function nearObject() {
    let best = null, bd = 999;
    for (const o of objects) {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const d = Math.hypot((player.x + player.w / 2) - cx, (player.y + player.h / 2) - cy);
        if (d < Math.max(o.w, o.h) * .65 + 25 && d < bd) { best = o; bd = d; }
    }
    return best;
}

let interactionLock = false;
function interact() {
    if (!running || paused || interactionLock) return;
    const o = nearObject(); if (!o) return;
    interactionLock = true; setTimeout(() => interactionLock = false, 250);
    const p = phaseIndex;

    if (p === 0) farmInteract(o);
    else if (p === 1) storageInteract(o);
    else if (p === 2) transportInteract(o);
    else if (p === 3) marketInteract(o);
    else if (p === 4) shoppingInteract(o);
    else if (p === 5) homeInteract(o);
    else if (p === 6) kitchenInteract(o);
    updateHUD(); checkPhase();
}
function farmInteract(o) {
    if (o.type === "seed") {
        state.seeds = 5; showMessage("Você pegou 5 sementes.");
    } else if (o.type === "soil") {
        if (o.state === 0) {
            if (state.energy < 8) { showMessage("Você está sem energia."); return; }
            o.state = 1; state.energy -= 8; showMessage("Terra preparada!");
        } else if (o.state === 1) {
            if (state.seeds <= 0) { showMessage("Você não tem sementes."); return; }
            o.state = 2; state.seeds--; showMessage("Semente plantada!");
        } else if (o.state === 2) {
            if (state.water < 10) { showMessage("Pegue água no reservatório."); return; }
            o.state = 3; state.water -= 10; showMessage("Planta regada! Espere um pouco...");
            setTimeout(() => { if (o.state === 3) { o.state = 4; updateHUD(); showMessage("Uma planta cresceu! 🍅"); } }, 3500);
        } else if (o.state === 4) {
            o.state = 5; state.tomatoes++; showMessage("Você colheu um alimento!");
        }
    } else if (o.type === "water") {
        state.water = Math.min(100, state.water + 40); showMessage("Reservatório abastecido: +40 água.");
    } else if (o.type === "shed") {
        if (state.tomatoes >= 3) { state.stored = 3; state.tomatoes -= 3; showMessage("Colheita armazenada! Fase concluída."); }
        else showMessage("Você precisa colher 3 alimentos.");
    }
}
function storageInteract(o) {
    if (o.type === "stock" && !o.used) {
        o.used = true; player.carrying = "box"; state.boxes++; showMessage("Você pegou uma caixa de tomates.");
    } else if (o.type === "tomatoSpot" && player.carrying === "box") {
        player.carrying = null; showMessage("Caixa de tomates organizada!");
        o.used = true;
    } else if (o.type === "stock" && o.used === false) {
        player.carrying = "boxC"; state.boxes++; o.used = true;
    } else if (o.type === "carrotSpot" && player.carrying) {
        player.carrying = null; o.used = true; showMessage("Caixa de cenouras organizada!");
    }
    if (o.type === "tomatoSpot" && o.used && !player.carrying) showMessage("Tomates já organizados.");
}
function storageObjectives() {
    return [objects.find(o => o.type === "tomatoSpot")?.used, objects.find(o => o.type === "tomatoSpot")?.used, objects.find(o => o.type === "carrotSpot")?.used, objects.find(o => o.type === "carrotSpot")?.used];
}
function transportInteract(o) {
    if (o.type === "truck" && !o.used) { o.used = true; player.carrying = "truck"; showMessage("Você entrou no caminhão!"); }
    else if (o.type === "market" && player.carrying === "truck") { o.used = true; player.carrying = null; showMessage("Carga entregue sem desperdício!"); }
}
function marketInteract(o) {
    if (o.type === "stock" && !o.used) { o.used = true; player.carrying = "tomatoBox"; showMessage("Pegou uma caixa de tomates."); }
    else if (o.type === "shelfT" && player.carrying === "tomatoBox") { o.used = true; player.carrying = null; showMessage("Tomates repostos."); }
    else if (o.type === "stock" && o.used && !player.carrying) { player.carrying = "carrotBox"; showMessage("Pegou uma caixa de cenouras."); }
    else if (o.type === "shelfC" && player.carrying === "carrotBox") { o.used = true; player.carrying = null; showMessage("Cenouras repostas."); }
}
function shoppingInteract(o) {
    if (o.type === "tomatoes" && !o.used) { o.used = true; state.bought += 2; showMessage("Você pegou 2 tomates. Só compre o necessário!"); }
    else if (o.type === "carrots" && !o.used) { o.used = true; state.bought += 1; showMessage("Você pegou 1 cenoura."); }
    else if (o.type === "promo") { showMessage("Promoção: comprar mais só vale a pena se você realmente for usar."); }
    else if (o.type === "checkout" && state.bought >= 3) { o.used = true; state.money -= 8; showMessage("Compra consciente realizada!"); }
    else if (o.type === "checkout") { showMessage("Pegue os itens da lista primeiro."); }
}
function homeInteract(o) {
    if (o.type === "bags" && !o.used) { o.used = true; showMessage("Alimentos retirados das sacolas."); }
    else if (o.type === "fridge" && !o.used) { o.used = true; showMessage("Geladeira organizada: alimentos próximos da validade ficam à vista."); }
    else if (o.type === "table" && !o.used) { o.used = true; showMessage("Refeição planejada! Você vai preparar uma quantidade adequada."); }
}
function kitchenInteract(o) {
    if (o.type === "fridge" && !o.used) { o.used = true; player.carrying = "ingredients"; showMessage("Você pegou os ingredientes."); }
    else if (o.type === "counter" && player.carrying === "ingredients") { player.carrying = "meal"; o.used = true; showMessage("Ingredientes preparados!"); }
    else if (o.type === "stove" && player.carrying === "meal") { player.carrying = "served"; o.used = true; showMessage("Refeição pronta!"); }
    else if (o.type === "table" && player.carrying === "served") { player.carrying = null; o.used = true; state.meals++; showMessage("Refeição servida! Agora cuide da sobra."); }
    else if (o.type === "trash") { state.waste = Math.min(100, state.waste + 10); o.used = true; showMessage("Você desperdiçou comida. Tente aproveitar as sobras!"); }
}

function objectivesDone() {
    const p = phaseIndex;
    if (p === 0) return objects.filter(o => o.type === "soil" && o.state >= 1).length >= 3 &&
        objects.filter(o => o.type === "soil" && o.state >= 2).length >= 3 &&
        objects.filter(o => o.type === "soil" && o.state >= 3).length >= 3 &&
        objects.filter(o => o.type === "soil" && o.state >= 5).length >= 3 &&
        state.stored >= 3;
    if (p === 1) return objects.find(o => o.type === "tomatoSpot")?.used && objects.find(o => o.type === "carrotSpot")?.used;
    if (p === 2) return objects.find(o => o.type === "market")?.used;
    if (p === 3) return objects.find(o => o.type === "shelfT")?.used && objects.find(o => o.type === "shelfC")?.used;
    if (p === 4) return objects.find(o => o.type === "checkout")?.used;
    if (p === 5) return objects.find(o => o.type === "table")?.used;
    if (p === 6) return state.meals >= 1 && objects.find(o => o.type === "table")?.used;
}
function checkPhase() {
    if (objectivesDone()) {
        showMessage("Fase concluída! Próxima etapa...");
        setTimeout(() => nextPhase(), 1100);
    }
}
function updateHUD() {
    document.getElementById("stats").textContent =
        `💧 ${Math.round(state.water)}  ⚡ ${Math.round(state.energy)}  🍅 ${state.tomatoes}  🌱 ${state.seeds}  🗑️ ${state.waste}%`;
    const p = phaseIndex;
    let list = [];
    if (p === 0) {
        list = [
            ["Preparar 3 terrenos", objects.filter(o => o.type === "soil" && o.state >= 1).length >= 3],
            ["Plantar 3 sementes", objects.filter(o => o.type === "soil" && o.state >= 2).length >= 3],
            ["Regar 3 plantas", objects.filter(o => o.type === "soil" && o.state >= 3).length >= 3],
            ["Colher 3 alimentos", objects.filter(o => o.type === "soil" && o.state >= 5).length >= 3],
            ["Guardar a colheita", state.stored >= 3]
        ];
    } else if (p === 1) {
        list = [["Pegar caixa de tomate", !!objects.find(o => o.type === "tomatoSpot")?.used],
        ["Organizar tomate", !!objects.find(o => o.type === "tomatoSpot")?.used],
        ["Pegar caixa de cenoura", !!objects.find(o => o.type === "carrotSpot")?.used],
        ["Organizar cenoura", !!objects.find(o => o.type === "carrotSpot")?.used]];
    } else if (p === 2) {
        list = [["Entrar no caminhão", !!objects.find(o => o.type === "truck")?.used],
        ["Chegar ao mercado", !!objects.find(o => o.type === "market")?.used],
        ["Entregar a carga", !!objects.find(o => o.type === "market")?.used]];
    } else if (p === 3) {
        list = [["Pegar caixa do estoque", !!objects.find(o => o.type === "shelfT")?.used || !!objects.find(o => o.type === "shelfC")?.used],
        ["Repor tomate", !!objects.find(o => o.type === "shelfT")?.used],
        ["Pegar segunda caixa", !!objects.find(o => o.type === "shelfC")?.used],
        ["Repor cenoura", !!objects.find(o => o.type === "shelfC")?.used]];
    } else if (p === 4) {
        list = [["Pegar 2 tomates", state.bought >= 2], ["Pegar 1 cenoura", state.bought >= 3], ["Levar ao caixa", !!objects.find(o => o.type === "checkout")?.used]];
    } else if (p === 5) {
        list = [["Guardar os alimentos", !!objects.find(o => o.type === "bags")?.used], ["Abrir a geladeira", !!objects.find(o => o.type === "fridge")?.used], ["Planejar a refeição", !!objects.find(o => o.type === "table")?.used]];
    } else {
        list = [["Pegar ingredientes", !!objects.find(o => o.type === "fridge")?.used], ["Preparar a refeição", !!objects.find(o => o.type === "counter")?.used], ["Servir", state.meals >= 1], ["Aproveitar a refeição", state.meals >= 1]];
    }
    document.getElementById("objectives").innerHTML = list.map(x => `<div class="${x[1] ? 'done' : ''}">${x[1] ? '☑' : '☐'} ${x[0]}</div>`).join("");
}
function showMessage(text) {
    const el = document.getElementById("message"); el.textContent = text; el.classList.add("show");
    clearTimeout(messageTimer); messageTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
function draw() {
    const ph = phases[phaseIndex];
    ctx.fillStyle = ph.bg; ctx.fillRect(0, 0, W, H);
    drawDecor(phaseIndex);
    objects.forEach(drawObject);
    drawPlayer();
}
function drawDecor(p) {
    ctx.save();
    if (p === 0) {
        for (let x = 0; x < W; x += 48)for (let y = 0; y < H; y += 48) {
            ctx.strokeStyle = "#ffffff18"; ctx.strokeRect(x, y, 48, 48);
        }
        for (let i = 0; i < 20; i++) { ctx.fillStyle = "#5a9f4f"; ctx.fillRect((i * 83) % W, ((i * 137) % H), 4, 9); }
    } else if (p === 2) {
        ctx.fillStyle = "#69747d"; ctx.fillRect(0, 240, W, 120);
        ctx.fillStyle = "#c9b84e"; for (let x = 0; x < W; x += 60)ctx.fillRect(x, 294, 35, 7);
    } else {
        ctx.fillStyle = "#ffffff25"; for (let x = 0; x < W; x += 80)ctx.fillRect(x, 0, 2, H);
        for (let y = 0; y < H; y += 80)ctx.fillRect(0, y, W, 2);
    }
    ctx.restore();
}
function drawObject(o) {
    ctx.save();
    if (o.type === "soil") {
        ctx.fillStyle = o.state === 0 ? "#8b6b4a" : o.state === 1 ? "#6e4b32" : "#5c422e";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#4a3425"; ctx.strokeRect(o.x, o.y, o.w, o.h);
        if (o.state >= 2) { ctx.font = "30px Arial"; ctx.textAlign = "center"; ctx.fillText(o.state >= 5 ? "🍅" : o.state >= 4 ? "🍅" : "🌱", o.x + o.w / 2, o.y + o.h / 2 + 10); }
        ctx.font = "12px Arial"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        if (o.state === 0) ctx.fillText("terra", o.x + o.w / 2, o.y + o.h - 8);
        if (o.state === 1) ctx.fillText("preparada", o.x + o.w / 2, o.y + o.h - 8);
    } else {
        ctx.fillStyle = "#00000018"; ctx.fillRect(o.x + 4, o.y + 6, o.w, o.h);
        ctx.fillStyle = "#f5f0e8"; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#00000030"; ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.font = `${Math.min(48, o.h * .55)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.icon, o.x + o.w / 2, o.y + o.h / 2 - 4);
        ctx.font = "11px Arial"; ctx.fillStyle = "#263238"; ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h - 8);
        if (o.used) { ctx.fillStyle = "#4baf55"; ctx.font = "bold 11px Arial"; ctx.fillText("✓", o.x + o.w - 10, o.y + 12); }
    }
    ctx.restore();
}
function drawPlayer() {
    ctx.save();
    const x = player.x, y = player.y;
    ctx.fillStyle = "#00000030"; ctx.beginPath(); ctx.ellipse(x + 13, y + 32, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = phaseIndex === 2 ? "#3949ab" : phaseIndex === 0 ? "#4b8f42" : "#e59a5c";
    ctx.fillRect(x + 3, y + 12, 20, 19);
    ctx.fillStyle = "#f0b27a"; ctx.beginPath(); ctx.arc(x + 13, y + 8, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5b3a29"; ctx.fillRect(x + 5, y, 17, 6);
    ctx.fillStyle = "#172235"; ctx.font = "10px Arial"; ctx.textAlign = "center"; ctx.fillText(phases[phaseIndex].role, x + 13, y - 8);
    if (player.carrying) { ctx.font = "22px Arial"; ctx.fillText(player.carrying === "truck" ? "🚚" : "📦", x + 13, y - 22); }
    ctx.restore();
}
function loop(t) {
    if (!running) return;
    const dt = Math.min(.033, (t - last) / 1000 || 0); last = t;
    if (!paused) { move(dt); draw(); const o = nearObject(); document.getElementById("interaction").innerHTML = o ? `<div class="interact">[E] ${actionText(o)}</div>` : ""; updateHUD(); }
    requestAnimationFrame(loop);
}
function actionText(o) {
    if (phaseIndex === 0) {
        if (o.type === "soil") return o.state === 0 ? "PREPARAR TERRA" : o.state === 1 ? "PLANTAR" : o.state === 2 ? "REGAR" : o.state === 3 ? "AGUARDAR CRESCIMENTO" : "COLHER";
        if (o.type === "seed") return "Pegar sementes"; if (o.type === "water") return "Pegar água"; if (o.type === "shed") return "Armazenar colheita";
    }
    if (phaseIndex === 1) { if (o.type === "stock") return "Pegar caixa"; if (o.type === "tomatoSpot") return "Organizar tomates"; if (o.type === "carrotSpot") return "Organizar cenouras"; }
    if (phaseIndex === 2) { if (o.type === "truck") return "Entrar no caminhão"; if (o.type === "market") return "Entregar carga"; }
    if (phaseIndex === 3) { if (o.type === "stock") return "Pegar caixa"; if (o.type === "shelfT") return "Repor tomates"; if (o.type === "shelfC") return "Repor cenouras"; }
    if (phaseIndex === 4) { if (o.type === "tomatoes") return "Pegar 2 tomates"; if (o.type === "carrots") return "Pegar 1 cenoura"; if (o.type === "promo") return "Ver promoção"; if (o.type === "checkout") return "Passar no caixa"; }
    if (phaseIndex === 5) { if (o.type === "bags") return "Guardar alimentos"; if (o.type === "fridge") return "Abrir geladeira"; if (o.type === "table") return "Planejar refeição"; }
    if (phaseIndex === 6) { if (o.type === "fridge") return "Pegar ingredientes"; if (o.type === "counter") return "Preparar"; if (o.type === "stove") return "Cozinhar"; if (o.type === "table") return "Servir"; if (o.type === "trash") return "Descartar"; }
    return "Interagir";
}
document.getElementById("startBtn").onclick = startGame;
document.getElementById("resumeBtn").onclick = togglePause;
document.getElementById("restartBtn").onclick = () => { paused = false; document.getElementById("pauseScreen").classList.add("hidden"); loadPhase(phaseIndex); };
document.getElementById("againBtn").onclick = () => { document.getElementById("finishScreen").classList.add("hidden"); startGame(); };
