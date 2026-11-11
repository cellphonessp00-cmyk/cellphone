/* Mega Casa SP — catálogo, busca, filtros, produto, carrinho */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const porId = id => PRODUTOS.find(p => p.id === id);
const desconto = p => p.precoAntigo > p.preco ? Math.round((1 - p.preco / p.precoAntigo) * 100) : 0;
const precoPix = v => v * (1 - LOJA.descontoPix / 100);
const nomeCat = id => (CATEGORIAS.find(c => c.id === id) || {}).nome || id;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const normal = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.max(0, Math.min(255, Math.round(f < 0 ? x * (1 + f) : x + (255 - x) * f))));
  return "#" + c.map(x => x.toString(16).padStart(2, "0")).join("");
}

/* ---------- ilustrações ---------- */
let gid = 0;
const ARTES = {
  geladeira: (c, g) => `<rect x="58" y="14" width="84" height="172" rx="10" fill="url(#${g})"/><line x1="58" y1="74" x2="142" y2="74" stroke="${shade(c,-.3)}" stroke-width="2"/><rect x="128" y="32" width="5" height="28" rx="2" fill="${shade(c,-.45)}"/><rect x="128" y="88" width="5" height="44" rx="2" fill="${shade(c,-.45)}"/><rect x="64" y="186" width="10" height="6" fill="#555"/><rect x="126" y="186" width="10" height="6" fill="#555"/>`,
  geladeira2: (c, g) => `<rect x="38" y="14" width="124" height="172" rx="10" fill="url(#${g})"/><line x1="100" y1="14" x2="100" y2="186" stroke="${shade(c,-.4)}" stroke-width="2"/><rect x="92" y="60" width="4" height="60" rx="2" fill="#cbd5e1"/><rect x="104" y="60" width="4" height="60" rx="2" fill="#cbd5e1"/><rect x="54" y="44" width="26" height="36" rx="4" fill="${shade(c,-.5)}"/><rect x="60" y="66" width="14" height="8" rx="2" fill="#93c5fd"/>`,
  lavadora: (c, g) => `<rect x="42" y="20" width="116" height="164" rx="12" fill="url(#${g})"/><rect x="42" y="20" width="116" height="30" rx="12" fill="${shade(c,-.08)}"/><circle cx="130" cy="35" r="7" fill="${shade(c,-.3)}"/><rect x="56" y="31" width="40" height="8" rx="3" fill="#60a5fa"/><circle cx="100" cy="116" r="46" fill="${shade(c,-.25)}"/><circle cx="100" cy="116" r="36" fill="#1e3a5f"/><circle cx="100" cy="116" r="36" fill="url(#vidro${g})"/>`,
  lavadora2: (c, g) => `<rect x="44" y="40" width="112" height="146" rx="10" fill="url(#${g})"/><rect x="44" y="20" width="112" height="30" rx="8" fill="${shade(c,-.1)}"/><rect x="56" y="28" width="56" height="12" rx="4" fill="#1e3a5f"/><circle cx="136" cy="34" r="8" fill="${shade(c,-.3)}"/><rect x="58" y="60" width="84" height="8" rx="4" fill="${shade(c,-.18)}"/>`,
  lavaloucas: (c, g) => `<rect x="44" y="24" width="112" height="160" rx="8" fill="url(#${g})"/><rect x="44" y="24" width="112" height="26" rx="8" fill="#1f2937"/><circle cx="62" cy="37" r="4" fill="#22c55e"/><rect x="74" y="34" width="40" height="6" rx="3" fill="#475569"/><rect x="60" y="62" width="80" height="6" rx="3" fill="${shade(c,-.35)}"/>`,
  airfryer: (c, g) => `<rect x="52" y="30" width="96" height="150" rx="34" fill="url(#${g})"/><rect x="62" y="96" width="76" height="70" rx="16" fill="${shade(c,-.25)}"/><rect x="84" y="118" width="32" height="12" rx="6" fill="${shade(c,.35)}"/><circle cx="100" cy="62" r="16" fill="#0f172a"/><text x="100" y="67" font-size="13" text-anchor="middle" fill="#f97316" font-family="monospace">180</text>`,
  microondas: (c, g) => `<rect x="20" y="52" width="160" height="96" rx="8" fill="url(#${g})"/><rect x="30" y="62" width="106" height="76" rx="5" fill="#111827"/><rect x="30" y="62" width="106" height="76" rx="5" fill="url(#vidro${g})"/><rect x="144" y="64" width="28" height="14" rx="3" fill="#0f172a"/><g fill="${shade(c,-.3)}"><circle cx="152" cy="92" r="4"/><circle cx="164" cy="92" r="4"/><circle cx="152" cy="106" r="4"/><circle cx="164" cy="106" r="4"/><circle cx="158" cy="126" r="9"/></g>`,
  cafeteira: (c, g) => `<rect x="54" y="30" width="92" height="40" rx="8" fill="url(#${g})"/><rect x="62" y="70" width="76" height="80" fill="${shade(c,-.25)}"/><rect x="54" y="150" width="92" height="30" rx="6" fill="url(#${g})"/><rect x="86" y="70" width="28" height="16" rx="3" fill="#9ca3af"/><path d="M84 116h32l-3 26h-26z" fill="#fff"/><path d="M116 122c10 0 10 14 0 14" stroke="#fff" stroke-width="4" fill="none"/><circle cx="76" cy="50" r="6" fill="#e5e7eb"/>`,
  liquidificador: (c, g) => `<path d="M70 26h60l-8 106H78z" fill="#dbeafe" opacity=".85"/><path d="M78 80h44l-4 52H82z" fill="#fca5a5"/><rect x="66" y="18" width="68" height="12" rx="4" fill="${shade(c,.2)}"/><rect x="64" y="130" width="72" height="52" rx="10" fill="url(#${g})"/><circle cx="100" cy="158" r="9" fill="${shade(c,.4)}"/>`,
  fogao: (c, g) => `<rect x="36" y="44" width="128" height="142" rx="8" fill="url(#${g})"/><rect x="36" y="30" width="128" height="22" rx="6" fill="#111827"/><g fill="#374151"><circle cx="60" cy="41" r="6"/><circle cx="82" cy="41" r="6"/><circle cx="100" cy="41" r="7"/><circle cx="118" cy="41" r="6"/><circle cx="140" cy="41" r="6"/></g><g fill="${shade(c,-.4)}"><circle cx="56" cy="62" r="5"/><circle cx="76" cy="62" r="5"/><circle cx="96" cy="62" r="5"/><circle cx="116" cy="62" r="5"/><circle cx="136" cy="62" r="5"/></g><rect x="50" y="80" width="100" height="10" rx="4" fill="${shade(c,-.35)}"/><rect x="50" y="98" width="100" height="72" rx="6" fill="#111827"/><rect x="50" y="98" width="100" height="72" rx="6" fill="url(#vidro${g})"/>`,
  panela: (c, g) => `<ellipse cx="100" cy="58" rx="54" ry="16" fill="${shade(c,-.3)}"/><path d="M46 58h108v100c0 14-24 22-54 22s-54-8-54-22z" fill="url(#${g})"/><rect x="88" y="34" width="24" height="16" rx="6" fill="#111"/><rect x="74" y="104" width="52" height="30" rx="6" fill="#0f172a"/><text x="100" y="124" font-size="14" text-anchor="middle" fill="#22d3ee" font-family="monospace">0:30</text>`,
  purificador: (c, g) => `<rect x="70" y="20" width="60" height="140" rx="12" fill="url(#${g})"/><rect x="80" y="40" width="40" height="12" rx="4" fill="#0ea5e9"/><rect x="92" y="96" width="16" height="22" rx="3" fill="#9ca3af"/><rect x="66" y="160" width="68" height="10" rx="4" fill="${shade(c,-.3)}"/><path d="M100 122c-4 6-6 10-6 13a6 6 0 0012 0c0-3-2-7-6-13z" fill="#38bdf8"/>`,
  arcond: (c, g) => `<rect x="12" y="62" width="176" height="62" rx="16" fill="url(#${g})"/><rect x="24" y="106" width="152" height="8" rx="4" fill="${shade(c,-.18)}"/><circle cx="168" cy="78" r="3" fill="#22c55e"/><g stroke="#60a5fa" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M50 136q10 10 0 22"/><path d="M90 136q10 10 0 22"/><path d="M130 136q10 10 0 22"/></g>`,
  ventilador: (c, g) => `<rect x="96" y="104" width="8" height="70" fill="${shade(c,.3)}"/><ellipse cx="100" cy="178" rx="40" ry="8" fill="url(#${g})"/><circle cx="100" cy="72" r="54" fill="none" stroke="${shade(c,.25)}" stroke-width="3"/><g fill="${shade(c,.15)}" opacity=".9"><ellipse cx="100" cy="46" rx="11" ry="24"/><ellipse cx="126" cy="72" rx="24" ry="11"/><ellipse cx="100" cy="98" rx="11" ry="24"/><ellipse cx="74" cy="72" rx="24" ry="11"/></g><circle cx="100" cy="72" r="10" fill="url(#${g})"/>`,
  tv: (c, g) => `<rect x="10" y="30" width="180" height="110" rx="6" fill="${c}"/><rect x="16" y="36" width="168" height="98" rx="3" fill="url(#tela${g})"/><path d="M16 110q50-40 90-10t78-30v64H16z" fill="#fff" opacity=".12"/><rect x="92" y="140" width="16" height="22" fill="${shade(c,.2)}"/><rect x="60" y="160" width="80" height="6" rx="3" fill="${shade(c,.2)}"/>`,
  robo: (c, g) => `<ellipse cx="100" cy="150" rx="74" ry="12" fill="#000" opacity=".1"/><circle cx="100" cy="104" r="72" fill="url(#${g})"/><circle cx="100" cy="104" r="56" fill="${shade(c,-.06)}"/><circle cx="100" cy="72" r="15" fill="#1f2937"/><circle cx="100" cy="72" r="5" fill="#22c55e"/><rect x="74" y="110" width="52" height="6" rx="3" fill="${shade(c,-.2)}"/>`,
  aspirador: (c, g) => `<rect x="94" y="20" width="12" height="130" rx="6" fill="${shade(c,-.2)}"/><rect x="80" y="20" width="40" height="16" rx="8" fill="#111827"/><rect x="86" y="62" width="30" height="56" rx="12" fill="url(#${g})"/><rect x="92" y="70" width="18" height="30" rx="6" fill="#c4b5fd" opacity=".7"/><rect x="62" y="148" width="76" height="22" rx="8" fill="#111827"/>`,
  moto: (c, g) => `<circle cx="50" cy="146" r="30" fill="#111"/><circle cx="50" cy="146" r="14" fill="#9ca3af"/><circle cx="152" cy="146" r="30" fill="#111"/><circle cx="152" cy="146" r="14" fill="#9ca3af"/><path d="M50 146l30-50h40l32 50" stroke="#374151" stroke-width="6" fill="none"/><path d="M66 96q20-24 60-18l18 18-12 26H82z" fill="url(#${g})"/><rect x="84" y="104" width="38" height="24" rx="4" fill="#1f2937"/><path d="M76 82h40l6 10H72z" fill="#111827"/><path d="M140 72l14-14h10" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="146" y="70" width="14" height="10" rx="3" fill="#fde047"/>`,
  scooter: (c, g) => `<circle cx="52" cy="152" r="24" fill="#111"/><circle cx="52" cy="152" r="10" fill="#9ca3af"/><circle cx="150" cy="152" r="24" fill="#111"/><circle cx="150" cy="152" r="10" fill="#9ca3af"/><path d="M30 140q0-40 40-44h30l10 40h34q8-50-10-80l10-6q26 40 14 96H40z" fill="url(#${g})"/><path d="M60 90h44q6 0 6 8H56q0-8 4-8z" fill="#111827"/><rect x="130" y="40" width="34" height="6" rx="3" fill="#111"/><circle cx="160" cy="62" r="7" fill="#fde047"/><rect x="34" y="66" width="34" height="24" rx="5" fill="${shade(c,-.3)}"/>`,
  bike: (c, g) => `<circle cx="50" cy="140" r="36" fill="none" stroke="#111" stroke-width="6"/><circle cx="154" cy="140" r="36" fill="none" stroke="#111" stroke-width="6"/><circle cx="50" cy="140" r="9" fill="#6b7280"/><path d="M50 140l40-58h52M90 82l12 58 52 0M102 140l-52 0M142 82l12 58" stroke="url(#${g})" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M84 70h18" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M136 66l8 16M136 64h14" stroke="#111" stroke-width="5" stroke-linecap="round"/><rect x="94" y="88" width="34" height="14" rx="5" fill="#111827" transform="rotate(10 111 95)"/>`,
  patinete: (c, g) => `<circle cx="48" cy="160" r="18" fill="#111"/><circle cx="160" cy="160" r="18" fill="#111"/><circle cx="48" cy="160" r="7" fill="#9ca3af"/><circle cx="160" cy="160" r="7" fill="#9ca3af"/><rect x="48" y="146" width="96" height="12" rx="6" fill="url(#${g})"/><path d="M160 160L136 30" stroke="url(#${g})" stroke-width="10" stroke-linecap="round"/><path d="M118 32h36" stroke="#111" stroke-width="8" stroke-linecap="round"/><rect x="132" y="56" width="14" height="8" rx="2" fill="#22c55e" transform="rotate(-10 139 60)"/>`
};

function arte(p, cls = "") {
  if (p.imagem) return `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" class="${cls}">`;
  const g = "g" + (++gid), c = p.cor || "#9ca3af";
  const desenho = (ARTES[p.arte] || ARTES.geladeira)(c, g);
  return `<svg viewBox="0 0 200 200" class="${cls}" role="img" aria-label="${esc(p.nome)}"><defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c,.25)}"/><stop offset="1" stop-color="${shade(c,-.2)}"/></linearGradient>
    <linearGradient id="vidro${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="tela${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".55" stop-color="#7c3aed"/><stop offset="1" stop-color="#f97316"/></linearGradient>
  </defs>${desenho}</svg>`;
}

/* ---------- preço / card ---------- */
function precoHTML(v, off) {
  const [r, c] = v.toFixed(2).split(".");
  return `<div class="preco">R$ ${Number(r).toLocaleString("pt-BR")}<sup>${c}</sup>${off ? `<span class="off">${off}% OFF</span>` : ""}</div>`;
}
const parcela = p => `em até ${LOJA.parcelas}x ${fmt(p.preco / LOJA.parcelas)} sem juros`;
const estrelas = p => `<div class="estrelas">${p.avaliacao.toFixed(1).replace(".", ",")} <i>${"★".repeat(Math.round(p.avaliacao))}${"☆".repeat(5 - Math.round(p.avaliacao))}</i> (${p.avaliacoes.toLocaleString("pt-BR")})</div>`;
const temFreteGratis = p => p.freteGratis || p.preco >= LOJA.freteGratisAcima;

function cardHTML(p) {
  const off = desconto(p), fav = favs.includes(p.id);
  const tags = [];
  if (p.estoque <= 0) tags.push(`<span class="tag tag-esg">Esgotado</span>`);
  else if (p.vendidos >= 10000) tags.push(`<span class="tag tag-vend">MAIS VENDIDO</span>`);
  if (p.estoque > 0 && p.estoque <= 3) tags.push(`<span class="tag tag-ult">Últimas ${p.estoque}</span>`);
  if (p.entregaRapida && p.estoque > 0) tags.push(`<span class="tag tag-full">⚡ FULL</span>`);
  return `<article class="card${p.estoque <= 0 ? " esgotado" : ""}" data-id="${p.id}" tabindex="0">
    <button class="fav${fav ? " on" : ""}" data-fav="${p.id}" aria-label="Favoritar" aria-pressed="${fav}">${fav ? "♥" : "♡"}</button>
    <div class="card-img">${arte(p)}</div>
    <div class="card-corpo">
      <div class="etiquetas">${tags.join("")}</div>
      <h3>${esc(p.nome)}</h3>
      ${estrelas(p)}
      <div class="de">${off ? fmt(p.precoAntigo) : ""}</div>
      ${precoHTML(p.preco, off)}
      <div class="pix">${fmt(precoPix(p.preco))} no Pix</div>
      <div class="parc">${parcela(p)}</div>
      ${temFreteGratis(p) ? `<div class="frete">Frete grátis${p.entregaRapida ? " · chega amanhã" : ""}</div>` : ""}
    </div>
  </article>`;
}

/* ---------- estado ---------- */
const estado = { q: "", cat: null, marcas: new Set(), min: null, max: null, frete: false, rapida: false, estoque: false, nota: false, ordem: "relevancia" };
let carrinho = ler("mc_carrinho", []);
let favs = ler("mc_favs", []);
let cep = ler("mc_cep", "");

function filtrar() {
  const termos = normal(estado.q).split(/\s+/).filter(Boolean);
  let lista = PRODUTOS.filter(p => {
    const txt = normal(`${p.nome} ${p.marca} ${nomeCat(p.categoria)} ${Object.values(p.specs).join(" ")}`);
    if (termos.some(t => !txt.includes(t))) return false;
    if (estado.cat && p.categoria !== estado.cat) return false;
    if (estado.marcas.size && !estado.marcas.has(p.marca)) return false;
    if (estado.min != null && p.preco < estado.min) return false;
    if (estado.max != null && p.preco > estado.max) return false;
    if (estado.frete && !temFreteGratis(p)) return false;
    if (estado.rapida && !p.entregaRapida) return false;
    if (estado.estoque && p.estoque <= 0) return false;
    if (estado.nota && p.avaliacao < 4.7) return false;
    return true;
  });
  const ord = {
    relevancia: (a, b) => (b.estoque > 0) - (a.estoque > 0) || b.destaque - a.destaque || b.vendidos - a.vendidos,
    vendidos: (a, b) => b.vendidos - a.vendidos,
    menor: (a, b) => a.preco - b.preco,
    maior: (a, b) => b.preco - a.preco,
    desconto: (a, b) => desconto(b) - desconto(a),
    nota: (a, b) => b.avaliacao - a.avaliacao || b.avaliacoes - a.avaliacoes
  }[estado.ordem];
  return lista.sort(ord);
}

function renderCatalogo() {
  const lista = filtrar();
  $("#grade").innerHTML = lista.map(cardHTML).join("");
  $("#vazio").hidden = lista.length > 0;
  $("#resQtd").textContent = `${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}`;
  $("#resTitulo").textContent = estado.q ? `Resultados para "${estado.q}"` : estado.cat ? nomeCat(estado.cat) : "Todos os produtos";
  $("#ordem").value = estado.ordem;

  // contagem por categoria e marca (sobre os demais filtros)
  const base = PRODUTOS;
  $("#fCats").innerHTML = `<li><button data-fcat="" class="${!estado.cat ? "ativo" : ""}">Todas <span>${base.length}</span></button></li>` +
    CATEGORIAS.map(c => `<li><button data-fcat="${c.id}" class="${estado.cat === c.id ? "ativo" : ""}">${c.nome} <span>${base.filter(p => p.categoria === c.id).length}</span></button></li>`).join("");
  const marcas = [...new Set(PRODUTOS.filter(p => !estado.cat || p.categoria === estado.cat).map(p => p.marca))].sort();
  $("#fMarcas").innerHTML = marcas.map(m => `<li><label class="f-check"><input type="checkbox" data-marca="${esc(m)}" ${estado.marcas.has(m) ? "checked" : ""}> ${esc(m)}</label></li>`).join("");

  const chips = [];
  if (estado.q) chips.push(["q", `Busca: ${estado.q}`]);
  if (estado.cat) chips.push(["cat", nomeCat(estado.cat)]);
  estado.marcas.forEach(m => chips.push(["marca:" + m, m]));
  if (estado.min != null || estado.max != null) chips.push(["preco", `${estado.min != null ? fmt(estado.min) : "R$ 0"} – ${estado.max != null ? fmt(estado.max) : "∞"}`]);
  if (estado.frete) chips.push(["frete", "Frete grátis"]);
  if (estado.rapida) chips.push(["rapida", "Entrega rápida"]);
  if (estado.estoque) chips.push(["estoque", "Disponíveis"]);
  if (estado.nota) chips.push(["nota", "★ 4,7+"]);
  $("#ativos").innerHTML = chips.map(([k, t]) => `<button data-tirar="${esc(k)}">${esc(t)} ✕</button>`).join("");
  $$("#menuCats button").forEach(b => b.classList.toggle("ativo", b.dataset.cat !== undefined && (b.dataset.cat || null) === estado.cat));
}

function irCatalogo() { $("#catalogo").scrollIntoView({ behavior: "smooth" }); }
function limpar() {
  Object.assign(estado, { q: "", cat: null, min: null, max: null, frete: false, rapida: false, estoque: false, nota: false, ordem: "relevancia" });
  estado.marcas.clear();
  $("#q").value = ""; $("#pMin").value = ""; $("#pMax").value = "";
  ["fFrete", "fRapida", "fEstoque", "fNota"].forEach(id => $("#" + id).checked = false);
  renderCatalogo();
}

/* ---------- home ---------- */
const BANNERS = [
  { tit: "Motos elétricas com até 20% OFF", txt: "Sem gasolina, sem rodízio. Bateria de lítio e entrega em SP.", selo: "MOBILIDADE ELÉTRICA", cat: "motos", fundo: "linear-gradient(120deg,#0b2d6b,#1d4ed8 60%,#06b6d4)", prod: "moto-eletrica-urban-3000" },
  { tit: "Semana da Air Fryer", txt: "A partir de R$ 349,90 com 5% OFF no Pix.", selo: "MAIS VENDIDA DO BRASIL", cat: "cozinha", fundo: "linear-gradient(120deg,#7c2d12,#ea580c 60%,#facc15)", prod: "airfryer-mondial-5l" },
  { tit: "Ar-condicionado inverter", txt: "Até 70% de economia de energia. 10x sem juros.", selo: "VERÃO 2026", cat: "climatizacao", fundo: "linear-gradient(120deg,#064e3b,#059669 60%,#a3e635)", prod: "ar-split-lg-12000" },
  { tit: "Geladeiras e lava e seca", txt: "Frete grátis para toda a Grande SP.", selo: "CASA NOVA", cat: "refrigeracao", fundo: "linear-gradient(120deg,#312e81,#6d28d9 60%,#ec4899)", prod: "geladeira-samsung-side-602l" }
];
let heroI = 0, heroTimer;
function renderHero() {
  $("#heroTrilho").innerHTML = BANNERS.map(b => `<div class="banner" style="background:${b.fundo}">
    <div><span class="selo">${b.selo}</span><h1>${b.tit}</h1><p>${b.txt}</p><button class="btn btn-claro" data-cat="${b.cat}">Ver ofertas →</button></div>
    <div class="arte">${arte(porId(b.prod))}</div></div>`).join("");
  $("#heroDots").innerHTML = BANNERS.map((_, i) => `<button data-dot="${i}" aria-label="Banner ${i + 1}"></button>`).join("");
  irHero(0);
}
function irHero(i) {
  heroI = (i + BANNERS.length) % BANNERS.length;
  $("#heroTrilho").style.transform = `translateX(-${heroI * 100}%)`;
  $$("#heroDots button").forEach((b, j) => b.classList.toggle("ativo", j === heroI));
  clearTimeout(heroTimer);
  heroTimer = setTimeout(() => irHero(heroI + 1), 6000);
}

function renderHome() {
  $("#menuCats").innerHTML = `<button data-cat="">Todas</button>` + CATEGORIAS.map(c => `<button data-cat="${c.id}">${c.icone} ${c.nome}</button>`).join("") + `<button data-ordem="desconto">🏷️ Ofertas</button>`;
  $("#menuMobileLista").innerHTML = CATEGORIAS.map(c => `<button data-cat="${c.id}"><span>${c.icone}</span>${c.nome}</button>`).join("");
  $("#circulos").innerHTML = CATEGORIAS.map(c => `<button data-cat="${c.id}"><span class="bola">${c.icone}</span>${c.nome}</button>`).join("");
  const disp = PRODUTOS.filter(p => p.estoque > 0);
  $("#ofertasDia").innerHTML = [...disp].sort((a, b) => desconto(b) - desconto(a)).slice(0, 10).map(cardHTML).join("");
  $("#mobilidade").innerHTML = PRODUTOS.filter(p => p.categoria === "motos" || p.categoria === "mobilidade").map(cardHTML).join("");
  $("#maisVendidos").innerHTML = [...disp].sort((a, b) => b.vendidos - a.vendidos).slice(0, 10).map(cardHTML).join("");
}

function cronometro() {
  const agora = new Date(), fim = new Date(agora); fim.setHours(23, 59, 59, 999);
  const s = Math.max(0, Math.floor((fim - agora) / 1000));
  $("#cronometro").textContent = [s / 3600, (s % 3600) / 60, s % 60].map(n => String(Math.floor(n)).padStart(2, "0")).join(":");
}

/* ---------- busca com sugestões ---------- */
let sugI = -1;
function sugerir() {
  const t = normal($("#q").value.trim());
  const ul = $("#sugestoes");
  if (t.length < 2) { ul.hidden = true; return; }
  const r = PRODUTOS.filter(p => normal(p.nome + " " + p.marca).includes(t)).slice(0, 6);
  sugI = -1;
  ul.innerHTML = r.length ? r.map(p => `<li data-abrir="${p.id}">${arte(p, "mini")}<span>${esc(p.nome)}</span><small>${fmt(p.preco)}</small></li>`).join("")
    : `<li class="muted">Nenhuma sugestão. Pressione Enter para buscar.</li>`;
  ul.hidden = false;
}

/* ---------- produto ---------- */
let atual = null, qtdAtual = 1, voltAtual = null;
function abrirProduto(id, empurrar = true) {
  const p = porId(id); if (!p) return;
  atual = p; qtdAtual = 1; voltAtual = p.voltagens ? p.voltagens[0] : null;
  const off = desconto(p), fav = favs.includes(p.id);
  const rel = PRODUTOS.filter(x => x.id !== p.id && x.categoria === p.categoria).concat(PRODUTOS.filter(x => x.id !== p.id && x.categoria !== p.categoria && x.destaque)).slice(0, 8);
  const estTxt = p.estoque <= 0 ? `<span style="color:var(--vermelho)">Produto esgotado</span>` : p.estoque <= 3 ? `<span style="color:#b45309">Últimas ${p.estoque} unidades!</span>` : `<span style="color:var(--verde)">Estoque disponível</span>`;
  $("#modalCorpo").innerHTML = `
  <div class="prod">
    <div class="prod-img">${arte(p)}</div>
    <div class="prod-info">
      <div class="meta">${nomeCat(p.categoria)} · ${esc(p.marca)} · +${p.vendidos.toLocaleString("pt-BR")} vendidos</div>
      <h2 id="mNome">${esc(p.nome)}</h2>
      ${estrelas(p)}
      <div class="de">${off ? fmt(p.precoAntigo) : ""}</div>
      ${precoHTML(p.preco, off)}
      <div class="caixa-pag">
        <div class="pix">💠 ${fmt(precoPix(p.preco))} no Pix (${LOJA.descontoPix}% OFF)</div>
        <div>💳 ${parcela(p)}</div>
      </div>
      ${p.voltagens ? `<div><b style="font-size:14px">Voltagem:</b><div class="volts" id="volts">${p.voltagens.map(v => `<button data-volt="${v}" class="${v === voltAtual ? "ativo" : ""}">${v}</button>`).join("")}</div></div>` : ""}
      <div>
        <b style="font-size:14px">Calcular frete e prazo</b>
        <form class="cep-calc" id="cepForm"><input id="cepIn" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${esc(cep)}"><button class="btn btn-sec">OK</button></form>
        <div class="cep-res" id="cepRes"></div>
      </div>
      <div class="estoque-txt">${estTxt}</div>
      ${p.estoque > 0 ? `<div style="display:flex;align-items:center;gap:10px;font-size:14px">Quantidade: <div class="qtd"><button data-q="-1" aria-label="Menos">−</button><span id="qtdTxt">1</span><button data-q="1" aria-label="Mais">+</button></div><span class="muted">(${p.estoque} disponíveis)</span></div>` : ""}
      <div class="acoes-prod">
        ${p.estoque > 0 ? `<button class="btn btn-pri" data-comprar>Comprar agora</button><button class="btn btn-sec" data-add>Adicionar ao carrinho</button>`
          : `<a class="btn btn-verde" target="_blank" rel="noopener" href="${linkWhats(`Olá! Quero ser avisado quando chegar: ${p.nome}`)}">Avise-me quando chegar</a>`}
        <button class="btn btn-sec" data-fav="${p.id}">${fav ? "♥ Nos favoritos" : "♡ Favoritar"}</button>
        <a class="btn btn-verde" target="_blank" rel="noopener" href="${linkWhats(`Olá! Tenho interesse em: ${p.nome} (${fmt(p.preco)}). ${linkProduto(p)}`)}">💬 Tirar dúvida no WhatsApp</a>
      </div>
    </div>
  </div>
  <div class="prod-sec"><h3>Descrição</h3><p>${esc(p.descricao)}</p></div>
  <div class="prod-sec"><h3>Características</h3><table class="specs">${Object.entries(p.specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}<tr><th>Marca</th><td>${esc(p.marca)}</td></tr>${p.voltagens ? `<tr><th>Voltagem</th><td>${p.voltagens.join(" / ")}</td></tr>` : ""}</table></div>
  <div class="prod-sec"><h3>Quem viu este produto também viu</h3><div class="carrossel relacionados">${rel.map(cardHTML).join("")}</div></div>`;
  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
  $(".modal-caixa").scrollTop = 0;
  if (cep) calcFrete(cep);
  if (empurrar) history.replaceState(null, "", "#p=" + p.id);
}
function fecharProduto() {
  $("#modal").hidden = true; document.body.style.overflow = "";
  if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
}

function calcFrete(v) {
  const d = v.replace(/\D/g, "");
  const out = $("#cepRes");
  if (d.length !== 8) { if (out) out.textContent = "Digite um CEP com 8 números."; return; }
  cep = d.slice(0, 5) + "-" + d.slice(5); gravar("mc_cep", cep);
  $("#cepTopoTxt").textContent = "Entregar em " + cep;
  if (!out || !atual) return;
  const n = +d.slice(0, 2), capital = n <= 5, grandeSP = n <= 9, sp = n <= 19;
  const dias = atual.entregaRapida && capital ? "amanhã" : capital ? "em 1 a 2 dias úteis" : grandeSP ? "em 2 a 3 dias úteis" : sp ? "em 3 a 5 dias úteis" : "em 5 a 10 dias úteis";
  const valor = temFreteGratis(atual) ? "Frete grátis" : `Frete ${fmt(sp ? 19.9 : 39.9)}`;
  out.textContent = `${valor} · chega ${dias} (estimativa)`;
}

/* ---------- links ---------- */
const linkProduto = p => location.origin + location.pathname + "#p=" + p.id;
const linkWhats = txt => `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(txt)}`;

/* ---------- carrinho e favoritos ---------- */
function salvarCarrinho() { gravar("mc_carrinho", carrinho); atualizarBolhas(); }
function atualizarBolhas() {
  const n = carrinho.reduce((s, i) => s + i.qtd, 0);
  $("#qtdCarrinho").textContent = n; $("#qtdCarrinho").hidden = !n;
  $("#qtdFavs").textContent = favs.length; $("#qtdFavs").hidden = !favs.length;
}
function adicionar(p, qtd = 1, volt = null) {
  const it = carrinho.find(i => i.id === p.id && i.volt === volt);
  if (it) it.qtd = Math.min(p.estoque, it.qtd + qtd); else carrinho.push({ id: p.id, qtd: Math.min(p.estoque, qtd), volt });
  salvarCarrinho();
  aviso(`✓ ${p.nome.slice(0, 40)}… adicionado ao carrinho`);
}
function alternarFav(id) {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  gravar("mc_favs", favs); atualizarBolhas();
  $$(`[data-fav="${id}"]`).forEach(b => {
    const on = favs.includes(id);
    if (b.classList.contains("fav")) { b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡"; b.setAttribute("aria-pressed", on); }
    else b.textContent = on ? "♥ Nos favoritos" : "♡ Favoritar";
  });
  if (!$("#gaveta").hidden && modoGaveta === "favs") renderGaveta();
}

let modoGaveta = "carrinho";
function abrirGaveta(modo) { modoGaveta = modo; renderGaveta(); $("#gaveta").hidden = false; document.body.style.overflow = "hidden"; }
function fecharGaveta() { $("#gaveta").hidden = true; if ($("#modal").hidden) document.body.style.overflow = ""; }
function renderGaveta() {
  const itens = $("#gavetaItens"), rod = $("#gavetaRodape");
  if (modoGaveta === "favs") {
    $("#gavetaTit").textContent = "Favoritos";
    const lista = favs.map(porId).filter(Boolean);
    itens.innerHTML = lista.length ? lista.map(p => `<div class="item"><div class="mini" data-abrir="${p.id}">${arte(p)}</div><div><h4>${esc(p.nome)}</h4><b>${fmt(p.preco)}</b><br><button class="remover" data-fav="${p.id}">Remover</button></div>${p.estoque > 0 ? `<button class="btn btn-sec" data-addfav="${p.id}">🛒</button>` : ""}</div>`).join("")
      : `<div class="vazio-gav">Toque no ♡ dos produtos para salvar aqui.</div>`;
    rod.innerHTML = ""; return;
  }
  $("#gavetaTit").textContent = "Carrinho";
  const linhas = carrinho.map(i => ({ ...i, p: porId(i.id) })).filter(i => i.p);
  if (!linhas.length) { itens.innerHTML = `<div class="vazio-gav">🛒<br>Seu carrinho está vazio.</div>`; rod.innerHTML = `<button class="btn btn-pri" data-fechar-gaveta>Continuar comprando</button>`; return; }
  itens.innerHTML = linhas.map((i, k) => `<div class="item"><div class="mini" data-abrir="${i.p.id}">${arte(i.p)}</div>
    <div><h4>${esc(i.p.nome)}</h4>${i.volt ? `<small>${i.volt}</small><br>` : ""}<b>${fmt(i.p.preco * i.qtd)}</b><br><button class="remover" data-rem="${k}">Remover</button></div>
    <div class="qtd"><button data-cq="${k}:-1" aria-label="Menos">−</button><span>${i.qtd}</span><button data-cq="${k}:1" aria-label="Mais">+</button></div></div>`).join("");
  const sub = linhas.reduce((s, i) => s + i.p.preco * i.qtd, 0);
  const gratis = sub >= LOJA.freteGratisAcima || linhas.every(i => i.p.freteGratis);
  const falta = LOJA.freteGratisAcima - sub;
  rod.innerHTML = `${!gratis && falta > 0 ? `<div class="linha muted" style="font-size:13px">Faltam ${fmt(falta)} para frete grátis</div>` : ""}
    <div class="linha"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    <div class="linha"><span>Frete</span><span>${gratis ? `<b style="color:var(--verde)">Grátis</b>` : "a calcular"}</span></div>
    <div class="linha total"><span>Total</span><span>${fmt(sub)}</span></div>
    <div class="linha verde"><span>No Pix (${LOJA.descontoPix}% OFF)</span><span>${fmt(precoPix(sub))}</span></div>
    <div class="linha muted" style="font-size:13px"><span>ou em até ${LOJA.parcelas}x de ${fmt(sub / LOJA.parcelas)} sem juros</span></div>
    <a class="btn btn-verde" target="_blank" rel="noopener" href="${linkWhats(pedidoTexto(linhas, sub))}">💬 Finalizar pelo WhatsApp</a>
    <button class="btn btn-sec" data-limpar-carrinho>Esvaziar carrinho</button>`;
}
function pedidoTexto(linhas, sub) {
  return `Olá, ${LOJA.nome}! Quero fazer este pedido:\n\n` +
    linhas.map(i => `• ${i.qtd}x ${i.p.nome}${i.volt ? ` (${i.volt})` : ""} — ${fmt(i.p.preco * i.qtd)}`).join("\n") +
    `\n\nTotal: ${fmt(sub)}\nNo Pix: ${fmt(precoPix(sub))}` + (cep ? `\nCEP: ${cep}` : "") + `\n\nPode confirmar disponibilidade e frete?`;
}

let avisoT;
function aviso(t) { const a = $("#aviso"); a.textContent = t; a.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => a.hidden = true, 2600); }

/* ---------- eventos ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button, a, [data-abrir], .card, .modal-fundo");
  if (!t) return;
  const d = t.dataset;

  if (d.fav !== undefined && d.fav) { e.stopPropagation(); alternarFav(d.fav); return; }
  if (d.cat !== undefined) {
    if (t.tagName === "A") e.preventDefault();
    limpar(); estado.cat = d.cat || null; renderCatalogo(); fecharProduto(); fecharMenu(); irCatalogo(); return;
  }
  if (d.ordem) { if (t.tagName === "A") e.preventDefault(); limpar(); estado.ordem = d.ordem; renderCatalogo(); irCatalogo(); return; }
  if (d.fcat !== undefined) { estado.cat = d.fcat || null; estado.marcas.clear(); renderCatalogo(); return; }
  if (d.tirar) {
    const k = d.tirar;
    if (k === "q") { estado.q = ""; $("#q").value = ""; }
    else if (k === "cat") estado.cat = null;
    else if (k.startsWith("marca:")) estado.marcas.delete(k.slice(6));
    else if (k === "preco") { estado.min = estado.max = null; $("#pMin").value = $("#pMax").value = ""; }
    else { estado[k] = false; $("#f" + k[0].toUpperCase() + k.slice(1)).checked = false; }
    renderCatalogo(); return;
  }
  if (d.dot) { irHero(+d.dot); return; }
  if (d.hero) { irHero(heroI + +d.hero); return; }
  if (d.abrir) { $("#sugestoes").hidden = true; fecharGaveta(); abrirProduto(d.abrir); return; }
  if (t.classList.contains("card")) { abrirProduto(d.id); return; }
  if (d.fechar !== undefined) { fecharProduto(); return; }
  if (d.fecharGaveta !== undefined) { fecharGaveta(); return; }
  if (d.fecharMenu !== undefined) { fecharMenu(); return; }
  if (d.volt) { voltAtual = d.volt; $$("#volts button").forEach(b => b.classList.toggle("ativo", b === t)); return; }
  if (d.q) { qtdAtual = Math.max(1, Math.min(atual.estoque, qtdAtual + +d.q)); $("#qtdTxt").textContent = qtdAtual; return; }
  if (d.add !== undefined) { adicionar(atual, qtdAtual, voltAtual); return; }
  if (d.comprar !== undefined) { adicionar(atual, qtdAtual, voltAtual); fecharProduto(); abrirGaveta("carrinho"); return; }
  if (d.addfav) { const p = porId(d.addfav); adicionar(p, 1, p.voltagens ? p.voltagens[0] : null); return; }
  if (d.rem) { carrinho.splice(+d.rem, 1); salvarCarrinho(); renderGaveta(); return; }
  if (d.cq) {
    const [k, n] = d.cq.split(":").map(Number), it = carrinho[k], p = porId(it.id);
    it.qtd = Math.max(1, Math.min(p.estoque, it.qtd + n)); salvarCarrinho(); renderGaveta(); return;
  }
  if (d.limparCarrinho !== undefined) { carrinho = []; salvarCarrinho(); renderGaveta(); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { fecharProduto(); fecharGaveta(); fecharMenu(); $("#filtros").classList.remove("aberto"); $("#sugestoes").hidden = true; }
  if (e.key === "Enter" && e.target.classList?.contains("card")) abrirProduto(e.target.dataset.id);
});

function fecharMenu() { $("#menuMobile").hidden = true; }

function iniciar() {
  document.title = `${LOJA.nome} — Eletrodomésticos e Motos Elétricas`;
  $("#avisoFrete").textContent = fmt(LOJA.freteGratisAcima).replace(",00", "");
  $("#avisoPix").textContent = `${LOJA.descontoPix}% OFF`;
  $("#avisoParc").textContent = `${LOJA.parcelas}x`;
  $("#slogan").textContent = LOJA.slogan;
  $("#linkInsta").href = `https://instagram.com/${LOJA.instagram}`;
  $("#linkWhats").href = `https://wa.me/${LOJA.whatsapp}`;
  if (cep) $("#cepTopoTxt").textContent = "Entregar em " + cep;

  renderHome(); renderHero(); renderCatalogo(); atualizarBolhas();
  cronometro(); setInterval(cronometro, 1000);

  $("#busca").addEventListener("submit", e => { e.preventDefault(); estado.q = $("#q").value.trim(); estado.cat = null; $("#sugestoes").hidden = true; renderCatalogo(); irCatalogo(); });
  $("#q").addEventListener("input", sugerir);
  $("#q").addEventListener("keydown", e => {
    const li = $$("#sugestoes li[data-abrir]");
    if (!li.length || $("#sugestoes").hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); sugI = (sugI + (e.key === "ArrowDown" ? 1 : -1) + li.length) % li.length;
      li.forEach((l, i) => l.classList.toggle("ativo", i === sugI));
    } else if (e.key === "Enter" && sugI >= 0) { e.preventDefault(); li[sugI].click(); }
  });
  document.addEventListener("click", e => { if (!e.target.closest(".busca")) $("#sugestoes").hidden = true; });

  $("#ordem").addEventListener("change", e => { estado.ordem = e.target.value; renderCatalogo(); });
  $("#fMarcas").addEventListener("change", e => { const m = e.target.dataset.marca; e.target.checked ? estado.marcas.add(m) : estado.marcas.delete(m); renderCatalogo(); });
  const preco = () => { const a = $("#pMin").value, b = $("#pMax").value; estado.min = a === "" ? null : +a; estado.max = b === "" ? null : +b; renderCatalogo(); };
  $("#pMin").addEventListener("change", preco); $("#pMax").addEventListener("change", preco);
  [["fFrete", "frete"], ["fRapida", "rapida"], ["fEstoque", "estoque"], ["fNota", "nota"]].forEach(([id, k]) => $("#" + id).addEventListener("change", e => { estado[k] = e.target.checked; renderCatalogo(); }));
  $("#limparFiltros").addEventListener("click", limpar);
  $("#vazioLimpar").addEventListener("click", limpar);
  $("#abrirFiltros").addEventListener("click", () => $("#filtros").classList.add("aberto"));
  $("#fecharFiltros").addEventListener("click", () => $("#filtros").classList.remove("aberto"));
  $("#abrirCarrinho").addEventListener("click", () => abrirGaveta("carrinho"));
  $("#abrirFavs").addEventListener("click", () => abrirGaveta("favs"));
  $("#abrirMenu").addEventListener("click", () => $("#menuMobile").hidden = false);
  $("#logo").addEventListener("click", e => { e.preventDefault(); limpar(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("#cepTopo").addEventListener("click", () => {
    const v = prompt("Digite seu CEP para ver prazos de entrega:", cep);
    if (v) calcFrete(v);
  });
  document.addEventListener("submit", e => { if (e.target.id === "cepForm") { e.preventDefault(); calcFrete($("#cepIn").value); } });
  document.addEventListener("input", e => {
    if (e.target.id === "cepIn") { let v = e.target.value.replace(/\D/g, "").slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5); e.target.value = v; }
  });
  $("#hero").addEventListener("mouseenter", () => clearTimeout(heroTimer));
  $("#hero").addEventListener("mouseleave", () => irHero(heroI));

  const abrirHash = () => { const m = location.hash.match(/^#p=(.+)$/); if (m) abrirProduto(decodeURIComponent(m[1]), false); };
  window.addEventListener("hashchange", abrirHash);
  abrirHash();
}
iniciar();
