/* ============================================================
   UMA ESCOLHA, UM FUTURO — script.js
   História interativa sobre o desperdício de alimentos.
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */
const TOTAL_CAPITULOS = 8;
const QTDE_FINAIS = 7; // 6 finais + 1 secreto
const LIMITE_SECRETO = 10; // todas as decisões conscientes
const STORAGE_KEY = "umaEscolhaUmFuturo_finais";

/* ============================================================
   ESTADO DO JOGO
   ============================================================ */
const estado = {
    tela: "menu",
    cenaAtual: null,
    variaveis: { consciencia: 40, desperdicio: 50, planejamento: 40, recursos: 50, relacionamentos: 50 },
    estatisticas: { aproveitados: 0, desperdicados: 0, comprasConscientes: 0, refeicoesPlanejadas: 0, decisoesSustentaveis: 0 },
    escolhasConscientes: 0,
    decisoesFeitas: 0,
    final: null,
    finaisDescobertos: [],
    audioAtivo: false
};

/* ============================================================
   PERSONAGENS
   ============================================================ */
const PERSONAGENS = {
    narrador: { nome: "", emoji: "📖", cor: "#8a7a5c" },
    lia: { nome: "Lia", emoji: "👩🏻", cor: "#43a047" },
    mae: { nome: "Dona Marta", emoji: "👩🦱", cor: "#fb8c00" },
    bia: { nome: "Bia", emoji: "👩🏽‍🦰", cor: "#e91e63" },
    rafa: { nome: "Rafa", emoji: "👨🏻", cor: "#3f51b5" },
    ze: { nome: "Sr. Zé", emoji: "👨🏽‍🦳", cor: "#795548" },
    chef: { nome: "Chef", emoji: "👨🏽‍🍳", cor: "#9c27b0" }
};

/* ============================================================
   CENAS — ESTRUTURA DA HISTÓRIA
   Cada cena: id, cap, personagem, texto, escolhas[]
   Cada escolha: texto, icone, proximaCena, efeitos, stats, consciente, tom
   ============================================================ */

// Helper: cena de transição (continuação narrativa)
const cont = (id, cap, personagem, texto, proximaCena) => ({
    id, cap, personagem, texto,
    escolhas: [{ texto: "Continuar", icone: "▶", proximaCena }]
});

const CENAS = {

    /* ---------------- CAPÍTULO 1 — GELADEIRA ---------------- */
    c1_inicio: cont("c1_inicio", 1, "narrador",
        "Um novo dia amanhece em uma casinha tranquila. É sábado, e Lia acorda com a casa ainda em silêncio.",
        "c1_geladeira"),

    c1_geladeira: {
        id: "c1_geladeira", cap: 1, personagem: "lia", isDecisao: true,
        texto: "Lia abre a geladeira e percebe que há vários alimentos que precisam ser consumidos em breve.\n\n“Tem bastante comida aqui... mas será que ainda dá para aproveitar tudo?”",
        escolhas: [
            {
                texto: "Preparar uma refeição usando os alimentos próximos da validade", icone: "🍲",
                proximaCena: "c1_uso", consciente: true, tom: "positivo",
                efeitos: { consciencia: 10, desperdicio: -10, planejamento: 5 },
                stats: { aproveitados: 1, refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Deixar para depois e pedir outra comida", icone: "🛵",
                proximaCena: "c1_pediu", consciente: false, tom: "negativo",
                efeitos: { desperdicio: 15, recursos: -10, consciencia: -5 },
                stats: { desperdicados: 2 }
            }
        ]
    },

    c1_uso: cont("c1_uso", 1, "lia",
        "Em poucos minutos, o cheiro de uma sopa caseira toma conta da cozinha. Dona Marta chega e sorri ao ver os legumes fresquinhos sendo aproveitados.",
        "c1_sobras"),

    c1_sobras: {
        id: "c1_sobras", cap: 1, personagem: "lia", isDecisao: true,
        texto: "Depois da refeição, sobrou um pouco de comida. Lia olha a panela e o prato com restos.",
        escolhas: [
            {
                texto: "Guardar corretamente para a próxima refeição", icone: "🧊",
                proximaCena: "c2_mercado", consciente: true, tom: "positivo",
                efeitos: { consciencia: 5, desperdicio: -5, planejamento: 5 },
                stats: { aproveitados: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Jogar fora agora", icone: "🗑️",
                proximaCena: "c2_mercado", consciente: false, tom: "negativo",
                efeitos: { desperdicio: 10, consciencia: -5 },
                stats: { desperdicados: 2 }
            }
        ]
    },

    c1_pediu: cont("c1_pediu", 1, "lia",
        "Lia pede uma comida pronta. Ela come rápido, enquanto a geladeira continua guardando alimentos que, sem uso, vão se aproximando do fim da validade.",
        "c2_mercado"),

    /* ---------------- CAPÍTULO 2 — SUPERMERCADO ---------------- */
    c2_mercado: {
        id: "c2_mercado", cap: 2, personagem: "ze", isDecisao: true,
        texto: "No supermercado, Sr. Zé aponta para uma placa colorida:\n\n“LEVE 5 E PAGUE 4!”\n\nLia só precisa de 2 itens. A promoção parece ótima... mas ela já tem bastante comida em casa.",
        escolhas: [
            {
                texto: "Comprar somente os 2 itens que precisa", icone: "🛒",
                proximaCena: "c2_consciente", consciente: true, tom: "positivo",
                efeitos: { consciencia: 10, planejamento: 5, desperdicio: -5 },
                stats: { comprasConscientes: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Aproveitar a promoção e levar 5", icone: "🛍️",
                proximaCena: "c2_promocao", consciente: false, tom: "negativo",
                efeitos: { recursos: 8, desperdicio: 10, planejamento: -5 },
                stats: { desperdicados: 1 }
            }
        ]
    },

    c2_consciente: cont("c2_consciente", 2, "ze",
        "“Boa escolha, mocinha! Comprar só o que a gente precisa já é metade do caminho”, diz Sr. Zé, guardando as caixas que sobraram.",
        "c3_restaurante"),

    c2_promocao: cont("c2_promocao", 2, "lia",
        "Lia sai feliz com a sacola cheia. Porém, no caminho para casa, ela lembra: a geladeira ainda estava cheia. “Onde vou colocar tudo isso?”",
        "c3_restaurante"),

    /* ---------------- CAPÍTULO 3 — RESTAURANTE ---------------- */
    c3_restaurante: {
        id: "c3_restaurante", cap: 3, personagem: "chef", isDecisao: true,
        texto: "No restaurante, o Chef traz o cardápio. O prato do dia vem numa porção bem grande.\n\n“A porção maior custa só um pouco a mais!”, ele sugere.",
        escolhas: [
            {
                texto: "Pedir a porção menor, que é suficiente", icone: "🍽️",
                proximaCena: "c3_menor", consciente: true, tom: "positivo",
                efeitos: { consciencia: 8, desperdicio: -5, planejamento: 3, recursos: -3 },
                stats: { refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Pedir a porção grande", icone: "🍖",
                proximaCena: "c3_grande", consciente: false, tom: "neutro",
                efeitos: { recursos: 2 }
            }
        ]
    },

    c3_menor: cont("c3_menor", 3, "lia",
        "Lia termina o prato por completo. O Chef elogia: “Comer o que se pede também é respeitar a comida.”",
        "c4_familia"),

    c3_grande: {
        id: "c3_grande", cap: 3, personagem: "lia", isDecisao: true,
        texto: "A porção grande chega e é simplesmente enorme. Lia come bastante, mas não consegue terminar. Sobra quase metade no prato.",
        escolhas: [
            {
                texto: "Levar o restante para casa em uma marmita", icone: "🥡",
                proximaCena: "c3_levou", consciente: true, tom: "positivo",
                efeitos: { consciencia: 8, desperdicio: -8, recursos: 4 },
                stats: { aproveitados: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Deixar o restante no prato", icone: "🗑️",
                proximaCena: "c3_deixou", consciente: false, tom: "negativo",
                efeitos: { desperdicio: 12, consciencia: -5 },
                stats: { desperdicados: 2 }
            }
        ]
    },

    c3_levou: cont("c3_levou", 3, "lia",
        "Lia pede uma marmita e leva o restante para casa. Amanhã, aquela porção vira mais uma refeição.",
        "c4_familia"),

    c3_deixou: cont("c3_deixou", 3, "chef",
        "O Chef suspira ao recolher o prato cheio. Mais comida indo para o lixo sem ter sido aproveitada.",
        "c4_familia"),

    /* ---------------- CAPÍTULO 4 — FAMÍLIA ---------------- */
    c4_familia: {
        id: "c4_familia", cap: 4, personagem: "mae", isDecisao: true,
        texto: "Em casa, Dona Marta mostra uma maçã com uma pequena mancha na casca.\n\n“Ainda é boa para comer? Ou jogo fora?”",
        escolhas: [
            {
                texto: "Verificar se está própria para consumo e utilizá-la", icone: "🔍",
                proximaCena: "c4_usou", consciente: true, tom: "positivo",
                efeitos: { consciencia: 10, desperdicio: -10, planejamento: 3 },
                stats: { aproveitados: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Descartar imediatamente", icone: "🗑️",
                proximaCena: "c4_descartou", consciente: false, tom: "negativo",
                efeitos: { desperdicio: 10, consciencia: -5 },
                stats: { desperdicados: 1 }
            }
        ]
    },

    c4_usou: cont("c4_usou", 4, "mae",
        "Depois de lavada e com a parte afetada retirada, a maçã estava ótima. Dona Marta lembra: “A aparência nem sempre conta toda a história.”",
        "c5_festa"),

    c4_descartou: cont("c4_descartou", 4, "mae",
        "A maçã vai para o lixo. Uma fruta que ainda tinha uso descartada por causa de uma simples mancha.",
        "c5_festa"),

    /* ---------------- CAPÍTULO 5 — FESTA ---------------- */
    c5_festa: {
        id: "c5_festa", cap: 5, personagem: "bia", isDecisao: true, importante: true,
        texto: "Bia pede ajuda a Lia para organizar a festa do bairro.\n\n“Quanto de comida a gente prepara? Se faltar, fica ruim... Se sobrar, vira desperdício.”",
        escolhas: [
            {
                texto: "Planejar a quantidade certa contando as pessoas", icone: "📋",
                proximaCena: "c5_planejou", consciente: true, tom: "positivo",
                efeitos: { planejamento: 12, consciencia: 8, desperdicio: -8 },
                stats: { refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Preparar em excesso “para garantir”", icone: "🎉",
                proximaCena: "c5_excesso", consciente: false, tom: "negativo",
                efeitos: { relacionamentos: 5, desperdicio: 15, planejamento: -5 },
                stats: { desperdicados: 3 }
            }
        ]
    },

    c5_planejou: cont("c5_planejou", 5, "bia",
        "Com uma lista de convidados, a comida dá certinho. Todo mundo come bem e quase nada sobra.",
        "c6_compras"),

    c5_excesso: cont("c5_excesso", 5, "lia",
        "No fim da festa, muitas travessas seguem cheias. Ninguém quer levar nada. Lia olha para a montanha de comida que será descartada.",
        "c6_compras"),

    /* ---------------- CAPÍTULO 6 — COMPRAS ---------------- */
    c6_compras: {
        id: "c6_compras", cap: 6, personagem: "ze", isDecisao: true,
        texto: "Na semana seguinte, Sr. Zé pergunta:\n\n“Veio comprar o quê hoje, Lia?”\n\nSem lista na mão, tudo parece tentador nas prateleiras.",
        escolhas: [
            {
                texto: "Fazer uma lista e seguir exatamente o que precisa", icone: "✅",
                proximaCena: "c6_lista", consciente: true, tom: "positivo",
                efeitos: { planejamento: 10, consciencia: 5, desperdicio: -5 },
                stats: { comprasConscientes: 1, refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Comprar por impulso o que dá vontade", icone: "😍",
                proximaCena: "c6_impulso", consciente: false, tom: "negativo",
                efeitos: { recursos: -8, desperdicio: 10 },
                stats: { desperdicados: 1 }
            }
        ]
    },

    c6_lista: cont("c6_lista", 6, "ze",
        "Lia sai do mercado com o carrinho equilibrado. Nada de excesso, nada de desperdício. Sr. Zé dá um joinha.",
        "c7_sobras"),

    c6_impulso: cont("c6_impulso", 6, "lia",
        "No carrinho entram coisas que Lia nem sabia que queria. Em casa, algumas delas vão dividir espaço com o que já existia na geladeira.",
        "c7_sobras"),

    /* ---------------- CAPÍTULO 7 — SOBRAS ---------------- */
    c7_sobras: {
        id: "c7_sobras", cap: 7, personagem: "lia", isDecisao: true, importante: true,
        texto: "Ao organizar a geladeira, Lia encontra várias sobras acumuladas de dias anteriores. É um bom momento para decidir o que fazer com elas.",
        escolhas: [
            {
                texto: "Preparar uma nova refeição usando as sobras", icone: "🍲",
                proximaCena: "c7_reaproveitou", consciente: true, tom: "positivo",
                efeitos: { consciencia: 12, desperdicio: -12, planejamento: 5 },
                stats: { aproveitados: 2, refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Guardar corretamente para mais tarde", icone: "🧊",
                proximaCena: "c7_guardou", consciente: true, tom: "positivo",
                efeitos: { planejamento: 8, desperdicio: -5, consciencia: 3 },
                stats: { aproveitados: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Compartilhar o excesso com a vizinha e Bia", icone: "🤝",
                proximaCena: "c7_compartilhou", consciente: true, tom: "positivo",
                efeitos: { relacionamentos: 12, desperdicio: -10, consciencia: 8 },
                stats: { decisoesSustentaveis: 1 }
            }
        ]
    },

    c7_reaproveitou: cont("c7_reaproveitou", 7, "lia",
        "Com criatividade, as sobras viram um prato novo e delicioso. Lia descobre que aproveitar também é cozinhar.",
        "c8_final"),

    c7_guardou: cont("c7_guardou", 7, "lia",
        "Lia organiza potes bem fechados, etiqueta e guarda tudo no lugar certo. Nada se perde e tudo tem seu momento.",
        "c8_final"),

    c7_compartilhou: cont("c7_compartilhou", 7, "bia",
        "A vizinha agradece o prato de comida e Bia adora. O que era excesso virou carinho compartilhado, e o lixo ficou mais vazio.",
        "c8_final"),

    /* ---------------- CAPÍTULO 8 — DECISÃO FINAL ---------------- */
    c8_final: {
        id: "c8_final", cap: 8, personagem: "lia", isDecisao: true, importante: true,
        texto: "Dia do grande encontro: Lia vai preparar uma refeição para várias pessoas, com recursos limitados.\n\nEla precisa decidir como comprar, preparar, aproveitar e lidar com as sobras. Todas as suas escolhas até aqui pesaram neste momento.",
        escolhas: [
            {
                texto: "Planejar um cardápio que aproveita tudo o que já tem em casa", icone: "📋",
                proximaCena: "final", consciente: true, tom: "positivo",
                efeitos: { planejamento: 15, consciencia: 10, desperdicio: -15 },
                stats: { refeicoesPlanejadas: 1, decisoesSustentaveis: 1 }
            },
            {
                texto: "Comprar tudo novo sem conferir o que já tem", icone: "🛒",
                proximaCena: "final", consciente: false, tom: "negativo",
                efeitos: { recursos: -12, desperdicio: 15, consciencia: -5 },
                stats: { desperdicados: 3 }
            },
            {
                texto: "Pedir que cada amigo leve um prato e compartilhar", icone: "🤝",
                proximaCena: "final", consciente: true, tom: "positivo",
                efeitos: { relacionamentos: 15, desperdicio: -8, consciencia: 8 },
                stats: { decisoesSustentaveis: 1 }
            }
        ]
    }
};

/* ============================================================
   FINAIS
   ============================================================ */
const FINAIS = {
    futuro_consciente: {
        nome: "FUTURO CONSCIENTE", icone: "🌱", cor: "#43a047",
        mensagem: "Lia aprendeu a planejar suas compras e refeições. Passou a desperdiçar menos e influenciou as pessoas ao seu redor.",
        moral: "Planejamento também é uma forma de combater o desperdício."
    },
    aproveitamento: {
        nome: "APROVEITAMENTO", icone: "🍲", cor: "#fb8c00",
        mensagem: "Lia percebeu que muitas sobras poderiam ser aproveitadas e passou a planejar refeições com o que já tinha em casa.",
        moral: "Reaproveitar é cozinhar pensando no futuro."
    },
    compartilhando: {
        nome: "COMPARTILHANDO", icone: "🤝", cor: "#e91e63",
        mensagem: "Lia passou a compartilhar alimentos quando havia excesso e quando era apropriado, unindo pessoas e enchendo menos o lixo.",
        moral: "Compartilhar multiplica a comida e o carinho."
    },
    compras_conscientes: {
        nome: "COMPRAS CONSCIENTES", icone: "🛒", cor: "#3f51b5",
        mensagem: "Lia aprendeu a comprar de acordo com suas necessidades, evitando excessos que antes acabavam na geladeira.",
        moral: "Comprar bem é comprar só o que se precisa."
    },
    muito_desperdicio: {
        nome: "MUITO DESPERDÍCIO", icone: "🗑️", cor: "#e53935",
        mensagem: "As escolhas ao longo da história fizeram com que muita comida fosse desperdiçada. Lia agora enxerga as consequências de perto.",
        moral: "Cada alimento descartado já custou recursos, trabalho e natureza."
    },
    equilibrio: {
        nome: "EQUILÍBRIO", icone: "⚖️", cor: "#8d6e63",
        mensagem: "Lia não tomou todas as decisões perfeitamente, mas aprendeu a encontrar maneiras melhores de planejar e aproveitar os alimentos.",
        moral: "Não precisa ser perfeito — basta melhorar um pouco a cada dia."
    },
    secreto: {
        nome: "DESPERDÍCIO MÍNIMO", icone: "🌟", cor: "#fbc02d", secreto: true,
        mensagem: "Você descobriu o caminho do desperdício mínimo. Cada decisão foi pensada, e quase nada se perdeu.",
        moral: "Pequenas escolhas podem gerar grandes mudanças."
    }
};

/* Ordem de exibição nos finais descobertos */
const ORDEM_FINAIS = [
    ["futuro_consciente", "Futuro Consciente"],
    ["aproveitamento", "Aproveitamento"],
    ["compartilhando", "Compartilhando"],
    ["compras_conscientes", "Compras Conscientes"],
    ["muito_desperdicio", "Muito Desperdício"],
    ["equilibrio", "Equilíbrio"],
    ["secreto", "Final Secreto"]
];

/* ============================================================
   SISTEMA DE CONSEQUÊNCIAS
   ============================================================ */
function aplicarEfeitos(escolha) {
    const v = estado.variaveis;
    const efeitos = escolha.efeitos || {};
    for (const chave in efeitos) {
        if (v[chave] !== undefined) {
            v[chave] = clamp(v[chave] + efeitos[chave], 0, 100);
        }
    }
    const stats = escolha.stats || {};
    for (const chave in stats) {
        if (estado.estatisticas[chave] !== undefined) {
            estado.estatisticas[chave] += stats[chave];
        }
    }
    estado.decisoesFeitas++;
    if (escolha.consciente === true) estado.escolhasConscientes++;
}

function clamp(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
}

/* ============================================================
   SISTEMA DE FINAIS
   ============================================================ */
function determinarFinal() {
    const v = estado.variaveis;
    const s = estado.estatisticas;

    if (estado.escolhasConscientes >= LIMITE_SECRETO) return "secreto";
    if (v.desperdicio >= 75) return "muito_desperdicio";
    if (v.consciencia >= 70 && v.desperdicio <= 35) return "futuro_consciente";
    if (v.relacionamentos >= 70) return "compartilhando";
    if (s.refeicoesPlanejadas >= 4 && v.planejamento >= 65) return "aproveitamento";
    if (s.comprasConscientes >= 3 && v.planejamento >= 65) return "compras_conscientes";
    return "equilibrio";
}

function registrarFinal(id) {
    if (!estado.finaisDescobertos.includes(id)) {
        estado.finaisDescobertos.push(id);
        salvarFinais();
        somNovoFinal();
    }
}

/* ============================================================
   ESTATÍSTICAS
   ============================================================ */
function formatarEstrela(valor) {
    return valor >= 80 ? "★" : valor >= 50 ? "☆" : "○";
}

function montarEstatisticasHTML() {
    const s = estado.estatisticas;
    const itens = [
        { ico: "🍎", num: s.aproveitados, label: "Alimentos aproveitados" },
        { ico: "🗑️", num: s.desperdicados, label: "Alimentos desperdiçados" },
        { ico: "🛒", num: s.comprasConscientes, label: "Compras conscientes" },
        { ico: "🍲", num: s.refeicoesPlanejadas, label: "Refeições planejadas" },
        { ico: "♻️", num: s.decisoesSustentaveis, label: "Decisões sustentáveis" }
    ];
    let html = "";
    itens.forEach(item => {
        html += `<div class="stat-cell"><div class="s-ico">${item.ico}</div><div class="s-num">${item.num}</div><div class="s-label">${item.label}</div></div>`;
    });
    return html;
}

function montarMedidoresHTML() {
    const v = estado.variaveis;
    const m = [
        { label: "Desperdício", valor: v.desperdicio, cor: v.desperdicio >= 60 ? "var(--vermelho)" : v.desperdicio >= 35 ? "var(--laranja)" : "var(--verde)" },
        { label: "Consciência", valor: v.consciencia, cor: "var(--verde)" },
        { label: "Planejamento", valor: v.planejamento, cor: "var(--amarelo)" }
    ];
    let html = "";
    m.forEach(item => {
        html += `<div class="meter-row"><span class="m-label">${item.label}</span><div class="meter-track"><div class="meter-fill" style="width:0;background:${item.cor}" data-w="${item.valor}"></div></div><span>${item.valor}%</span></div>`;
    });
    return html;
}

/* ============================================================
   LOCALSTORAGE
   ============================================================ */
function carregarFinais() {
    try {
        const dados = localStorage.getItem(STORAGE_KEY);
        estado.finaisDescobertos = dados ? JSON.parse(dados) : [];
    } catch (e) {
        estado.finaisDescobertos = [];
    }
    if (!Array.isArray(estado.finaisDescobertos)) estado.finaisDescobertos = [];
}

function salvarFinais() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estado.finaisDescobertos));
    } catch (e) { /* ignora falhas de armazenamento */ }
}

/* ============================================================
   INTERFACE
   ============================================================ */
const el = {
    screens: document.querySelectorAll(".screen"),
    chapterLabel: document.getElementById("chapter-label"),
    progressFill: document.getElementById("progress-fill"),
    hudValue: document.getElementById("hud-value"),
    avatarRing: document.getElementById("avatar-ring"),
    avatarEmoji: document.getElementById("avatar-emoji"),
    characterName: document.getElementById("character-name"),
    dialogueText: document.getElementById("dialogue-text"),
    decisionBadge: document.getElementById("decision-badge"),
    choices: document.getElementById("choices"),
    sceneStage: document.getElementById("scene-stage")
};

function mostrarTela(nome) {
    el.screens.forEach(s => s.classList.remove("active"));
    const alvo = document.getElementById("screen-" + nome);
    if (alvo) alvo.classList.add("active");
    estado.tela = nome;
}

function atualizarHUD() {
    const cap = estado.cenaAtual ? estado.cenaAtual.cap : 1;
    el.chapterLabel.textContent = `CAPÍTULO ${cap} / ${TOTAL_CAPITULOS}`;
    el.progressFill.style.width = (cap / TOTAL_CAPITULOS) * 100 + "%";
    el.hudValue.textContent = estado.variaveis.consciencia + "%";
}

function setPersonagem(personagem) {
    const p = PERSONAGENS[personagem] || PERSONAGENS.narrador;
    el.avatarEmoji.textContent = p.emoji;
    el.characterName.textContent = p.nome;
    el.avatarRing.style.setProperty("border-color", p.cor, "important");
    el.avatarRing.style.background = `radial-gradient(circle at 32% 28%, #fff, ${p.cor}22)`;
}

function renderizarCena(cena) {
    estado.cenaAtual = cena;
    atualizarHUD();
    setPersonagem(cena.personagem);

    // Alerta de decisão importante
    if (cena.importante) {
        el.decisionBadge.classList.remove("hidden");
        somImportante();
    } else {
        el.decisionBadge.classList.add("hidden");
    }

    // Texto com animação de digitação
    el.dialogueText.textContent = "";
    let i = 0;
    const texto = cena.texto;
    const typer = setInterval(() => {
        el.dialogueText.textContent = texto.slice(0, i);
        i += 2;
        if (i >= texto.length) {
            el.dialogueText.textContent = texto;
            clearInterval(typer);
        }
    }, 12);

    // Botões de escolha
    el.choices.innerHTML = "";
    cena.escolhas.forEach((escolha, idx) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        if (escolha.tom === "positivo") btn.classList.add("choice-positive");
        else if (escolha.tom === "negativo") btn.classList.add("choice-negative");
        else btn.classList.add("choice-secret");
        btn.innerHTML = `<span class="choice-ico">${escolha.icone}</span><span>${escolha.texto}</span>`;
        btn.style.animationDelay = (0.08 * (idx + 1)) + "s";
        btn.addEventListener("click", () => escolher(idx));
        el.choices.appendChild(btn);
    });
}

function transicaoCena(cena) {
    el.sceneStage.classList.add("scene-fade-out");
    setTimeout(() => {
        el.sceneStage.classList.remove("scene-fade-out");
        renderizarCena(cena);
        somTransicao();
    }, 260);
}

/* ============================================================
   ESCOLHAS
   ============================================================ */
function escolher(indice) {
    const cena = estado.cenaAtual;
    const escolha = cena.escolhas[indice];
    if (!escolha) return;

    somEscolha();
    aplicarEfeitos(escolha);

    if (escolha.proximaCena === "final") {
        finalizarHistoria();
        return;
    }

    const proxima = CENAS[escolha.proximaCena];
    if (proxima) transicaoCena(proxima);
}

/* ============================================================
   FLUXO DO FINAL
   ============================================================ */
function finalizarHistoria() {
    const id = determinarFinal();
    estado.final = id;
    const final = FINAIS[id];

    registrarFinal(id);

    document.getElementById("ending-icon").textContent = final.icone;
    document.getElementById("ending-icon").style.animation = "popIn .6s ease";
    document.getElementById("ending-title").textContent = final.nome;
    document.getElementById("ending-title").style.color = final.cor;
    document.getElementById("ending-message").textContent = final.mensagem;

    document.getElementById("ending-meta").innerHTML =
        `Você descobriu <strong>${estado.finaisDescobertos.length} de ${QTDE_FINAIS}</strong> finais. &nbsp;•&nbsp; &nbsp;<em>${final.moral}</em>`;

    document.getElementById("stats-grid").innerHTML = montarEstatisticasHTML();
    document.getElementById("meters").innerHTML = montarMedidoresHTML();
    setTimeout(() => {
        document.querySelectorAll(".meter-fill").forEach(m => { m.style.width = m.dataset.w + "%"; });
    }, 120);

    if (id === "muito_desperdicio") somNegativo(); else somPositivo();

    mostrarTela("ending");
}

function reiniciarJogo() {
    estado.cenaAtual = null;
    estado.variaveis = { consciencia: 40, desperdicio: 50, planejamento: 40, recursos: 50, relacionamentos: 50 };
    estado.estatisticas = { aproveitados: 0, desperdicados: 0, comprasConscientes: 0, refeicoesPlanejadas: 0, decisoesSustentaveis: 0 };
    estado.escolhasConscientes = 0;
    estado.decisoesFeitas = 0;
    estado.final = null;
    mostrarTela("game");
    renderizarCena(CENAS.c1_inicio);
}

/* ============================================================
   FINAIS DESCOBERTOS (tela)
   ============================================================ */
function renderizarFinaisDescobertos() {
    const lista = document.getElementById("endings-list");
    lista.innerHTML = "";
    ORDEM_FINAIS.forEach(([id, rotulo]) => {
        const descoberto = estado.finaisDescobertos.includes(id);
        const chip = document.createElement("div");
        chip.className = "ending-chip " + (descoberto ? "unlocked" : "locked") + (id === "secreto" ? " secreto" : "");
        if (descoberto) {
            const f = FINAIS[id];
            chip.innerHTML = `<span class="e-ico">${f.icone}</span><span>🔓 ${f.nome}</span>`;
        } else {
            chip.innerHTML = `<span class="e-ico">🔒</span><span>${id === "secreto" ? "Final Secreto" : rotulo}</span>`;
        }
        lista.appendChild(chip);
    });
    document.getElementById("endings-count").textContent =
        `Você descobriu ${estado.finaisDescobertos.length} de ${QTDE_FINAIS} finais.`;
}

/* ============================================================
   ÁUDIO (gerado pelo navegador — Web Audio API)
   ============================================================ */
let audioCtx = null;
function garantirAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    estado.audioAtivo = !!audioCtx;
    return audioCtx;
}

function tocarTonalidade(freqIni, freqFim, duracao, tipo, ganhoVol) {
    const ctx = garantirAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo || "sine";
    osc.frequency.setValueAtTime(freqIni, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqFim), t0 + duracao);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(ganhoVol || 0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duracao + 0.02);
}

function somEscolha() { tocarTonalidade(420, 620, 0.12, "triangle", 0.06); }
function somTransicao() { tocarTonalidade(300, 520, 0.18, "sine", 0.05); }
function somImportante() {
    tocarTonalidade(440, 440, 0.14, "square", 0.04);
    setTimeout(() => tocarTonalidade(330, 330, 0.16, "square", 0.04), 160);
}
function somPositivo() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tocarTonalidade(f, f, 0.18, "triangle", 0.07), i * 130));
}
function somNegativo() {
    [392, 349, 311, 262].forEach((f, i) => setTimeout(() => tocarTonalidade(f, f, 0.22, "sawtooth", 0.05), i * 150));
}
function somNovoFinal() {
    [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => tocarTonalidade(f, f, 0.16, "sine", 0.07), i * 110));
}

/* ============================================================
   ANIMAÇÕES
   ============================================================ */
// (Transições de cena e aparecimento dos botões tratados em renderizarCena/transicaoCena)

/* ============================================================
   EVENTOS
   ============================================================ */
document.getElementById("btn-start").addEventListener("click", () => {
    garantirAudio();
    reiniciarJogo();
});

document.getElementById("btn-restart").addEventListener("click", () => reiniciarJogo());
document.getElementById("btn-again").addEventListener("click", () => reiniciarJogo());
document.getElementById("btn-menu").addEventListener("click", () => mostrarTela("menu"));

document.getElementById("btn-howto").addEventListener("click", () => { somEscolha(); mostrarTela("howto"); });
document.getElementById("btn-howto-back").addEventListener("click", () => { somEscolha(); mostrarTela("menu"); });

document.getElementById("btn-endings").addEventListener("click", () => { somEscolha(); renderizarFinaisDescobertos(); mostrarTela("endings"); });
document.getElementById("btn-endings-back").addEventListener("click", () => { somEscolha(); mostrarTela("menu"); });

// Habilita áudio no primeiro toque (requisito de navegadores)
document.body.addEventListener("pointerdown", garantirAudio, { once: true });

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
carregarFinais();
mostrarTela("menu");
