/* =====================================================================
   Cellphones SP — site da loja integrado ao Instagram
   Dados vêm de produtos.js (LOJA, PRODUTOS, CATEGORIAS)
   ===================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: LOJA.moeda });
const porId = id => PRODUTOS.find(p => p.id === id);
const linkProduto = p => `${LOJA.site.replace(/\/$/, "")}/#p=${p.id}`;
const linkInsta = () => `https://instagram.com/${LOJA.instagram}`;
const linkDirect = () => `https://ig.me/m/${LOJA.instagram}`;
const linkWhats = txt => `https://wa.me/${LOJA.whatsapp}${txt ? "?text=" + encodeURIComponent(txt) : ""}`;

/* ---------------------------------------------------------------------
   ILUSTRAÇÕES (SVG gerado por código — sem imagens de terceiros)
   --------------------------------------------------------------------- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
}
let uid = 0;
const lente = (x, y, r = 6) =>
  `<circle cx="${x}" cy="${y}" r="${r + 1.8}" fill="#26272c" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#07070d"/><circle cx="${x}" cy="${y}" r="${r * .55}" fill="#1a2b52"/>` +
  `<circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .22}" fill="#fff" opacity=".75"/>`;
const flash = (x, y, r = 2.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f6ebc9"/>`;

function frente(id, x, y, w, h, rx, entalhe) {
  const cx = x + w / 2;
  let n = "";
  if (entalhe === "ilha") n = `<rect x="${cx - 10}" y="${y + 8}" width="20" height="6" rx="3" fill="#000"/>`;
  else if (entalhe === "notch") n = `<rect x="${cx - 13}" y="${y + 3}" width="26" height="7" rx="3.5" fill="#0c0c10"/>`;
  else n = `<circle cx="${cx}" cy="${y + 10}" r="2.6" fill="#000"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#0c0c10" stroke="rgba(255,255,255,.22)" stroke-width="1"/>` +
    `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="${rx - 2.5}" fill="url(#${id}t)"/>` +
    `<circle cx="${x + w * .25}" cy="${y + h * .72}" r="${w * .42}" fill="url(#${id}w)"/>` +
    `<text x="${cx}" y="${y + h * .3}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${w * .23}" font-weight="700" fill="#fff" opacity=".92">9:41</text>` +
    `<rect x="${cx - w * .2}" y="${y + h * .34}" width="${w * .4}" height="3" rx="1.5" fill="#fff" opacity=".45"/>` + n;
}
const traseira = (id, x, y, w, h, rx) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${id}b)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>` +
  `<rect x="${x + 4}" y="${y + 6}" width="${w * .1}" height="${h - 12}" rx="${w * .05}" fill="#fff" opacity=".1"/>`;
const ilha = (x, y, w, h, r, cor, op = .9) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${cor}" opacity="${op}" stroke="rgba(255,255,255,.2)" stroke-width=".6"/>`;

const ARTES = {
  iphone17pro: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "ilha") + traseira(id, 88, 18, 76, 164, 15) +
    ilha(89, 24, 74, 42, 11, d) + lente(102, 35) + lente(102, 55) + lente(120, 45) + flash(150, 35) + `<circle cx="150" cy="53" r="2.2" fill="#111"/>`,
  iphonePro: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "ilha") + traseira(id, 88, 18, 76, 164, 15) +
    ilha(94, 24, 40, 40, 11, d) + lente(104, 34) + lente(104, 54) + lente(123, 44) + flash(124, 30, 2.2),
  iphone: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "ilha") + traseira(id, 88, 18, 76, 164, 15) +
    ilha(95, 24, 20, 38, 10, d) + lente(105, 33, 5.5) + lente(105, 53, 5.5) + flash(123, 30),
  iphoneDiag: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "ilha") + traseira(id, 88, 18, 76, 164, 15) +
    ilha(94, 24, 36, 36, 10, d) + lente(104, 34, 5.5) + lente(120, 50, 5.5) + flash(122, 31, 2.2),
  iphoneSingle: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "notch") + traseira(id, 88, 18, 76, 164, 15) + lente(102, 33, 6),
  iphoneAir: (id, c, d) => frente(id, 34, 28, 72, 154, 14, "ilha") + traseira(id, 88, 18, 76, 164, 15) +
    ilha(92, 25, 68, 18, 9, d) + lente(102, 34, 5.5) + flash(122, 34, 2.2) + `<circle cx="140" cy="34" r="1.6" fill="#111"/>`,
  galaxy: (id, c, d) => frente(id, 34, 26, 72, 156, 11, "furo") + traseira(id, 88, 18, 76, 164, 11) +
    lente(102, 32) + lente(102, 51) + lente(102, 70) + flash(118, 32),
  galaxyUltra: (id, c, d) => frente(id, 34, 26, 72, 156, 5, "furo") + traseira(id, 88, 18, 76, 164, 6) +
    lente(102, 31) + lente(102, 49) + lente(102, 67) + lente(120, 31, 4.5) + flash(120, 46, 2.2) + `<circle cx="120" cy="55" r="1.8" fill="#111"/>`,
  galaxyEdge: (id, c, d) => frente(id, 34, 26, 72, 156, 11, "furo") + traseira(id, 88, 18, 76, 164, 11) +
    ilha(94, 23, 22, 42, 11, d) + lente(105, 33, 6) + lente(105, 54, 6) + flash(124, 30),
  galaxyA: (id, c, d) => frente(id, 34, 26, 72, 156, 11, "furo") + traseira(id, 88, 18, 76, 164, 11) +
    ilha(94, 23, 22, 60, 11, d) + lente(105, 33, 5.5) + lente(105, 52, 5.5) + lente(105, 71, 5.5) + flash(124, 30),
  galaxyFold: (id, c, d) => frente(id, 14, 34, 118, 146, 9, "furo") +
    `<line x1="73" y1="37" x2="73" y2="177" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/>` +
    traseira(id, 122, 22, 62, 164, 8) + ilha(127, 26, 20, 58, 10, d) + lente(137, 36, 5) + lente(137, 54, 5) + lente(137, 72, 5) + flash(156, 32, 2.2),
  galaxyFlip: (id, c, d) => frente(id, 26, 14, 70, 172, 12, "furo") +
    `<line x1="29" y1="100" x2="93" y2="100" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/>` +
    `<rect x="98" y="64" width="80" height="92" rx="14" fill="url(#${id}b)" stroke="rgba(255,255,255,.3)"/>` +
    `<rect x="102" y="68" width="72" height="62" rx="11" fill="#08080e"/>` + lente(114, 80, 6) + lente(132, 80, 6) + flash(148, 78, 2.2) +
    `<text x="150" y="118" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fff" opacity=".85">9:41</text>` +
    `<rect x="98" y="148" width="80" height="8" rx="3" fill="#000" opacity=".25"/>`,

  teclado: (id, c, d) => {
    let k = "";
    for (let r = 0; r < 5; r++) for (let i = 0; i < 12; i++) {
      const w = r === 4 && i > 3 && i < 8 ? 0 : 10.4;
      if (w) k += `<rect x="${27 + i * 12.4}" y="${74 + r * 12.4}" width="${w}" height="10" rx="2.2" fill="#22242e" stroke="${c}" stroke-opacity="${.25 + (i % 4) * .12}" stroke-width=".8"/>`;
    }
    return `<ellipse cx="100" cy="146" rx="86" ry="8" fill="${c}" opacity=".45" filter="blur(4px)"/>` +
      `<rect x="20" y="66" width="160" height="78" rx="10" fill="#14151c" stroke="${c}" stroke-opacity=".6"/>` + k +
      `<rect x="77" y="124" width="46" height="10" rx="2.2" fill="#22242e" stroke="${c}" stroke-opacity=".5" stroke-width=".8"/>` +
      `<path d="M100 66 C100 50 120 46 120 30" stroke="#333" stroke-width="3" fill="none"/>`;
  },
  mouse: (id, c, d) => `<ellipse cx="100" cy="178" rx="50" ry="8" fill="#000" opacity=".4"/>` +
    `<path d="M100 26 C142 26 152 70 152 108 C152 156 128 176 100 176 C72 176 48 156 48 108 C48 70 58 26 100 26Z" fill="#17181f" stroke="rgba(255,255,255,.15)"/>` +
    `<path d="M100 26 C142 26 152 70 152 96 L100 96Z" fill="#1f2029"/><path d="M100 26 C58 26 48 70 48 96 L100 96Z" fill="#1c1d25"/>` +
    `<line x1="100" y1="28" x2="100" y2="96" stroke="#000" stroke-width="1.5"/>` +
    `<rect x="94" y="46" width="12" height="24" rx="6" fill="${c}"/>` +
    `<path d="M62 120 Q100 140 138 120" stroke="${c}" stroke-width="3" fill="none" opacity=".9"/>`,
  headset: (id, c, d) => `<path d="M44 112 C44 40 156 40 156 112" fill="none" stroke="#1c1d25" stroke-width="14" stroke-linecap="round"/>` +
    `<path d="M44 112 C44 40 156 40 156 112" fill="none" stroke="${c}" stroke-width="2" opacity=".7"/>` +
    `<rect x="26" y="98" width="40" height="64" rx="18" fill="#17181f" stroke="rgba(255,255,255,.15)"/><rect x="134" y="98" width="40" height="64" rx="18" fill="#17181f" stroke="rgba(255,255,255,.15)"/>` +
    `<rect x="32" y="112" width="8" height="36" rx="4" fill="${c}"/><rect x="160" y="112" width="8" height="36" rx="4" fill="${c}"/>` +
    `<path d="M46 150 C50 176 80 178 92 170" fill="none" stroke="#2a2b33" stroke-width="5" stroke-linecap="round"/><circle cx="94" cy="169" r="5" fill="${c}"/>`,
  fone: (id, c, d) => `<rect x="44" y="96" width="112" height="76" rx="34" fill="url(#${id}b)" stroke="rgba(0,0,0,.15)"/>` +
    `<line x1="48" y1="122" x2="152" y2="122" stroke="#000" stroke-opacity=".15"/><circle cx="100" cy="148" r="3" fill="#34d399"/>` +
    `<g transform="rotate(-18 72 60)"><ellipse cx="72" cy="58" rx="17" ry="20" fill="url(#${id}b)"/><rect x="66" y="66" width="12" height="38" rx="6" fill="url(#${id}b)"/><ellipse cx="72" cy="56" rx="8" ry="9" fill="#2a2b33"/></g>` +
    `<g transform="rotate(18 128 60)"><ellipse cx="128" cy="58" rx="17" ry="20" fill="url(#${id}b)"/><rect x="122" y="66" width="12" height="38" rx="6" fill="url(#${id}b)"/><ellipse cx="128" cy="56" rx="8" ry="9" fill="#2a2b33"/></g>`,
  controle: (id, c, d) => `<path d="M58 70 H142 C170 70 184 110 186 140 C188 168 166 176 152 160 L136 140 H64 L48 160 C34 176 12 168 14 140 C16 110 30 70 58 70Z" fill="url(#${id}b)" opacity=".95" stroke="rgba(255,255,255,.3)"/>` +
    `<circle cx="70" cy="122" r="13" fill="#15161d"/><circle cx="70" cy="122" r="8" fill="#2a2b33"/><circle cx="122" cy="122" r="13" fill="#15161d"/><circle cx="122" cy="122" r="8" fill="#2a2b33"/>` +
    `<path d="M50 96 h8 v-8 h6 v8 h8 v6 h-8 v8 h-6 v-8 h-8z" fill="#15161d"/>` +
    `<circle cx="146" cy="88" r="5" fill="#f87171"/><circle cx="158" cy="100" r="5" fill="#60a5fa"/><circle cx="134" cy="100" r="5" fill="#fbbf24"/><circle cx="146" cy="112" r="5" fill="#34d399"/>`,
  webcam: (id, c, d) => `<rect x="34" y="60" width="132" height="62" rx="31" fill="#17181f" stroke="rgba(255,255,255,.18)"/>` +
    lente(100, 91, 18) + `<circle cx="60" cy="91" r="3" fill="${c}"/><circle cx="140" cy="91" r="3" fill="#34d399"/>` +
    `<path d="M80 122 L74 160 H126 L120 122" fill="#121319"/><rect x="60" y="158" width="80" height="10" rx="5" fill="#1d1e26"/>`,
  relogio: (id, c, d) => `<rect x="74" y="16" width="52" height="56" rx="10" fill="${d}"/><rect x="74" y="128" width="52" height="56" rx="10" fill="${d}"/>` +
    `<circle cx="100" cy="100" r="48" fill="#1b1c22" stroke="${c}" stroke-width="4"/><circle cx="100" cy="100" r="40" fill="#06060a"/>` +
    `<circle cx="100" cy="100" r="30" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="130 200" stroke-linecap="round" transform="rotate(-90 100 100)"/>` +
    `<text x="100" y="106" text-anchor="middle" font-family="Arial" font-size="17" font-weight="700" fill="#fff">10:09</text><rect x="148" y="92" width="6" height="16" rx="3" fill="${c}"/>`,
  carregador: (id, c, d) => `<rect x="76" y="20" width="8" height="26" rx="3" fill="#b8bcc4"/><rect x="116" y="20" width="8" height="26" rx="3" fill="#b8bcc4"/>` +
    `<rect x="56" y="42" width="88" height="96" rx="18" fill="url(#${id}b)" stroke="rgba(0,0,0,.12)"/>` +
    `<rect x="92" y="66" width="16" height="6" rx="3" fill="#333"/><rect x="92" y="82" width="16" height="6" rx="3" fill="#333"/><rect x="90" y="98" width="20" height="8" rx="1" fill="#333"/>` +
    `<text x="100" y="128" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#555">65W</text>` +
    `<path d="M100 138 C100 170 150 160 160 186" stroke="#e5e7eb" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  caixa: (id, c, d) => `<ellipse cx="100" cy="176" rx="60" ry="8" fill="${c}" opacity=".4"/>` +
    `<rect x="40" y="56" width="120" height="112" rx="40" fill="url(#${id}b)"/>` +
    `<circle cx="100" cy="112" r="34" fill="#0f1014"/><circle cx="100" cy="112" r="20" fill="#1c1d24"/><circle cx="100" cy="112" r="8" fill="#2b2c34"/>` +
    `<circle cx="100" cy="112" r="38" fill="none" stroke="${shade(c, 60)}" stroke-width="2" opacity=".8"/>` +
    `<rect x="84" y="40" width="32" height="18" rx="6" fill="${d}"/>`,
  mousepad: (id, c, d) => `<path d="M20 80 L150 52 L184 112 L54 144Z" fill="#111218" stroke="${c}" stroke-width="3" filter="drop-shadow(0 0 6px ${c})"/>` +
    `<path d="M60 92 L140 74" stroke="${c}" stroke-opacity=".3" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="M128 92 C144 88 152 98 150 108 C148 118 136 122 128 118 C118 114 114 96 128 92Z" fill="#20212a" stroke="rgba(255,255,255,.2)"/>`,
};

function arte(p, tam) {
  const id = "a" + (uid++);
  const c = p.cor, d = shade(c, -50), l = shade(c, 40);
  const desenhar = ARTES[p.arte] || ARTES.mouse;
  const dim = tam ? `width="${tam}" height="${tam}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" ${dim} role="img" aria-label="Ilustração: ${p.nome}">` +
    `<defs>` +
    `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>` +
    `<linearGradient id="${id}t" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${shade(c, 20)}"/><stop offset=".45" stop-color="#3a2d86"/><stop offset="1" stop-color="#05060d"/></linearGradient>` +
    `<radialGradient id="${id}w"><stop offset="0" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}g" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>` +
    `</defs><ellipse cx="100" cy="108" rx="96" ry="88" fill="url(#${id}g)"/>${desenhar(id, c, d, l)}</svg>`;
}
// Usa a foto (ex.: gerada no Gemini) se existir; senão, a ilustração
function midia(p) {
  return p.imagem ? `<img src="${p.imagem}" alt="${p.nome} (imagem ilustrativa)" loading="lazy">` : arte(p);
}

/* ---------------------------------------------------------------------
   ESTADO
   --------------------------------------------------------------------- */
const estado = { categoria: "todos", marca: null, busca: "", ordem: "relevancia", soDisp: false, oferta: false };
let carrinho = {};
try { carrinho = JSON.parse(localStorage.getItem("carrinho") || "{}") || {}; } catch { carrinho = {}; }
const salvar = () => { try { localStorage.setItem("carrinho", JSON.stringify(carrinho)); } catch { } };

/* ---------------------------------------------------------------------
   CARDS / CATÁLOGO
   --------------------------------------------------------------------- */
function desconto(p) { return p.precoAntigo && p.precoAntigo > p.preco ? Math.round((1 - p.preco / p.precoAntigo) * 100) : 0; }

function cardHTML(p, i = 0) {
  const off = desconto(p), fora = p.estoque <= 0;
  return `<article class="card ${fora ? "esgotado" : ""}" data-id="${p.id}" style="animation-delay:${Math.min(i, 12) * 40}ms">
    <div class="card-arte">${midia(p)}
      <div class="selos-card">
        ${fora ? `<span class="tag tag-esgotado">Esgotado</span>` : ""}
        ${p.novo && !fora ? `<span class="tag tag-novo">Novo</span>` : ""}
        ${off && !fora ? `<span class="tag tag-off">-${off}%</span>` : ""}
      </div>
    </div>
    <div class="card-corpo">
      <span class="card-marca">${p.marca} · ${CATEGORIAS[p.categoria]}</span>
      <h3>${p.nome}</h3>
      ${!fora && p.estoque <= 3 ? `<span class="estoque-baixo">Últimas ${p.estoque} unidades</span>` : ""}
      <div class="card-rodape">
        <div>
          ${p.precoAntigo ? `<div class="preco-de">${fmt(p.precoAntigo)}</div>` : ""}
          <div class="preco">${fmt(p.preco)}</div>
          <div class="parcela">${LOJA.parcelas}x de ${fmt(p.preco / LOJA.parcelas)}</div>
        </div>
        <button class="add" data-add="${p.id}" ${fora ? "disabled" : ""} aria-label="Adicionar ${p.nome} ao carrinho">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  </article>`;
}

function filtrar() {
  const q = estado.busca.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let lista = PRODUTOS.filter(p => {
    if (estado.categoria !== "todos" && p.categoria !== estado.categoria) return false;
    if (estado.marca && p.marca !== estado.marca) return false;
    if (estado.soDisp && p.estoque <= 0) return false;
    if (estado.oferta && (!desconto(p) || p.estoque <= 0)) return false;
    if (q) {
      const alvo = [p.nome, p.marca, CATEGORIAS[p.categoria], p.corNome, ...p.specs].join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return q.split(/\s+/).every(t => alvo.includes(t));
    }
    return true;
  });
  const disp = p => (p.estoque > 0 ? 0 : 1);
  if (estado.ordem === "menor") lista.sort((a, b) => disp(a) - disp(b) || a.preco - b.preco);
  else if (estado.ordem === "maior") lista.sort((a, b) => disp(a) - disp(b) || b.preco - a.preco);
  else if (estado.ordem === "nome") lista.sort((a, b) => a.nome.localeCompare(b.nome));
  else lista.sort((a, b) => disp(a) - disp(b));
  return lista;
}

function renderChips() {
  const cont = { todos: PRODUTOS.length };
  PRODUTOS.forEach(p => cont[p.categoria] = (cont[p.categoria] || 0) + 1);
  const chips = [["todos", "Todos"], ...Object.entries(CATEGORIAS).filter(([k]) => cont[k])];
  const nOfertas = PRODUTOS.filter(p => desconto(p) && p.estoque > 0).length;
  let html = bfAtivo() ? `<button class="chip chip-bf ${estado.oferta ? "ativo" : ""}" data-oferta>🔥 Black Friday<small>${nOfertas}</small></button>` : "";
  html += chips.map(([k, n]) => `<button class="chip ${estado.categoria === k && !estado.marca && !estado.oferta ? "ativo" : ""}" data-cat="${k}">${n}<small>${cont[k]}</small></button>`).join("");
  html += ["Apple", "Samsung"].map(m => `<button class="chip ${estado.marca === m ? "ativo" : ""}" data-marca="${m}">${m === "Apple" ? "iPhone" : "Galaxy"}</button>`).join("");
  $("#chips").innerHTML = html;
}

function renderGrade() {
  const lista = filtrar();
  $("#grade").innerHTML = lista.map(cardHTML).join("");
  $("#vazio").hidden = lista.length > 0;
}

function renderDestaques() {
  $("#trilhoDestaques").innerHTML = PRODUTOS.filter(p => p.destaque).map(cardHTML).join("");
}

function renderHero() {
  const ids = ["iphone-17-pro-max", "galaxy-s26-ultra", "fone-tws-anc"];
  const ps = ids.map(porId).filter(Boolean);
  $("#heroArte").innerHTML = ps.map(p => `<div class="flut" data-id="${p.id}">${arte(p)}</div>`).join("");
}

function renderInsta() {
  const ps = PRODUTOS.filter(p => p.estoque > 0).sort((a, b) => (b.destaque - a.destaque) || (b.novo - a.novo)).slice(0, 9);
  $("#instaGrade").innerHTML = ps.map(p => `<div class="insta-post" data-id="${p.id}">${midia(p)}<span>${p.nome}<em>${fmt(p.preco)}</em></span></div>`).join("");
}

/* ---------------------------------------------------------------------
   MODAL DE PRODUTO
   --------------------------------------------------------------------- */
let atual = null;
function abrirProduto(id, atualizarHash = true) {
  const p = porId(id);
  if (!p) return;
  atual = p;
  const fora = p.estoque <= 0, off = desconto(p);
  $("#mArte").innerHTML = midia(p);
  $("#mMarca").textContent = `${p.marca} · ${CATEGORIAS[p.categoria]} · ${p.corNome}`;
  $("#mNome").textContent = p.nome;
  $("#mDesc").textContent = p.descricao;
  $("#mSpecs").innerHTML = p.specs.map(s => `<li>${s}</li>`).join("");
  $("#mPreco").innerHTML = `${p.precoAntigo ? `<div><span class="preco-de">${fmt(p.precoAntigo)}</span> ${off ? `<b style="color:var(--rosa);font-size:.85rem">-${off}%</b>` : ""}</div>` : ""}
    <div class="preco">${fmt(p.preco)}</div><div class="parcela">ou ${LOJA.parcelas}x de ${fmt(p.preco / LOJA.parcelas)} sem juros</div>`;
  const e = $("#mEstoque");
  e.className = "estoque " + (fora ? "fora" : p.estoque <= 3 ? "baixo" : "ok");
  e.textContent = fora ? "Esgotado — chame no Direct para reservar" : p.estoque <= 3 ? `Últimas ${p.estoque} unidades` : "Em estoque · pronta entrega";
  $("#mAdd").disabled = fora;
  $("#mDirect").textContent = fora ? "Avise-me no Direct" : "Pedir no Direct";
  $("#kId").textContent = p.id;
  $("#modal").hidden = false;
  document.body.classList.add("travado");
  if (atualizarHash) history.replaceState(null, "", "#p=" + p.id);
}
function fecharProduto() {
  $("#modal").hidden = true;
  document.body.classList.remove("travado");
  atual = null;
  if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
}

/* ---------------------------------------------------------------------
   CARRINHO
   --------------------------------------------------------------------- */
function adicionar(id) {
  const p = porId(id);
  if (!p || p.estoque <= 0) return;
  const q = carrinho[id] || 0;
  if (q >= p.estoque) return aviso(`Só temos ${p.estoque} em estoque 😅`);
  carrinho[id] = q + 1;
  salvar(); renderCarrinho();
  const c = $("#contador"); c.classList.remove("pulo"); void c.offsetWidth; c.classList.add("pulo");
  aviso(`${p.nome} adicionado ✓`);
}
function alterar(id, delta) {
  const p = porId(id);
  const q = (carrinho[id] || 0) + delta;
  if (q <= 0) delete carrinho[id];
  else if (q > p.estoque) return aviso(`Só temos ${p.estoque} em estoque`);
  else carrinho[id] = q;
  salvar(); renderCarrinho();
}
function itensCarrinho() {
  return Object.entries(carrinho).map(([id, q]) => ({ p: porId(id), q })).filter(i => i.p && i.p.estoque > 0);
}
function renderCarrinho() {
  const itens = itensCarrinho();
  const qtd = itens.reduce((s, i) => s + i.q, 0);
  const total = itens.reduce((s, i) => s + i.q * i.p.preco, 0);
  const c = $("#contador"); c.textContent = qtd; c.classList.toggle("ativo", qtd > 0);
  $("#itens").innerHTML = itens.length ? itens.map(({ p, q }) => `
    <div class="item">
      <div class="item-arte">${midia(p)}</div>
      <div><h4>${p.nome}</h4><div class="mudo">${fmt(p.preco)}</div></div>
      <div class="qtd"><button data-menos="${p.id}" aria-label="Diminuir">−</button><span>${q}</span><button data-mais="${p.id}" aria-label="Aumentar">+</button></div>
    </div>`).join("") : `<div class="carrinho-vazio">Seu carrinho está vazio.<br>Que tal dar uma olhada nos destaques? ✨</div>`;
  $("#total").textContent = fmt(total);
  $("#parcelado").textContent = total ? `ou ${LOJA.parcelas}x de ${fmt(total / LOJA.parcelas)} sem juros` : "";
  $("#finalizarWhats").disabled = $("#finalizarDirect").disabled = !itens.length;
}
function textoPedido() {
  const itens = itensCarrinho();
  const total = itens.reduce((s, i) => s + i.q * i.p.preco, 0);
  return `Olá, ${LOJA.nome}! Quero fazer este pedido pelo site:\n\n` +
    itens.map(({ p, q }) => `• ${q}x ${p.nome} (${p.corNome}) — ${fmt(p.preco * q)}`).join("\n") +
    `\n\nTotal: ${fmt(total)}\nPode confirmar disponibilidade e frete?`;
}
function abrirGaveta() { $("#gaveta").hidden = false; document.body.classList.add("travado"); }
function fecharGaveta() { $("#gaveta").hidden = true; if ($("#modal").hidden) document.body.classList.remove("travado"); }

/* ---------------------------------------------------------------------
   KIT INSTAGRAM: legenda, prompt Gemini, arte para post/story
   --------------------------------------------------------------------- */
function legenda(p, chamada) {
  const off = desconto(p);
  const tagMarca = p.marca === "Apple" ? "#iphone #apple" : p.marca === "Samsung" ? "#samsung #galaxy" : "#" + CATEGORIAS[p.categoria].toLowerCase().replace(/\s/g, "");
  const tagBF = bfAtivo() ? " #blackfriday #blackfriday2026 #blackfridaybrasil" : "";
  if (!chamada && bfAtivo()) chamada = `🖤 BLACK FRIDAY ${LOJA.nome.toUpperCase()} 🖤`;
  return (chamada ? chamada + "\n\n" : "") + `✨ ${p.nome.toUpperCase()} ✨\n\n${p.descricao}\n\n` +
    p.specs.map(s => `✅ ${s}`).join("\n") + `\n🎨 Cor: ${p.corNome}\n\n` +
    (p.precoAntigo ? `De ${fmt(p.precoAntigo)} por ` : "💰 ") + `${fmt(p.preco)}${off ? ` (-${off}%)` : ""}\n` +
    `💳 ou ${LOJA.parcelas}x de ${fmt(p.preco / LOJA.parcelas)} sem juros\n` +
    (p.estoque <= 0 ? "⏳ Esgotado — chama no Direct pra reservar!\n" : p.estoque <= 3 ? `🔥 Últimas ${p.estoque} unidades!\n` : "📦 Pronta entrega\n") +
    `\n📩 Chama no Direct ou compre pelo link da bio\n🔗 ${linkProduto(p)}\n\n*Imagem ilustrativa. Ofertas válidas enquanto durar o estoque.\n\n${tagMarca} ${LOJA.hashtags}${tagBF}`;
}
function promptGemini(p, bf = bfAtivo()) {
  const cel = p.categoria === "celulares";
  const fundo = bf
    ? "Cenário de Black Friday: fundo preto profundo com detalhes e reflexos dourados, partículas de luz douradas desfocadas e um brilho suave atrás do produto"
    : `Fundo escuro em degradê com um brilho suave na cor ${p.corNome}`;
  return `Crie uma fotografia de produto ilustrativa, estilo estúdio premium, de um ${p.nome} na cor ${p.corNome}` +
    (cel ? ", mostrando a frente com a tela acesa e a traseira com o módulo de câmeras lado a lado" : ", em ângulo de três quartos") +
    `. ${fundo}, iluminação de recorte, reflexo sutil no chão, nitidez alta, aparência realista e fiel ao design oficial do produto. ` +
    `Sem texto, sem marcas d'água, sem pessoas. Composição centralizada com espaço livre acima e abaixo do produto, formato vertical 4:5 (1080x1350) para post de Instagram.`;
}
function carregarImg(src) {
  return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
}
const bfAtivo = () => !!(LOJA.blackFriday && LOJA.blackFriday.ativo);
async function gerarArte(p, formato, opc = {}) {
  const bf = opc.blackFriday ?? bfAtivo();
  const W = 1080, H = formato === "story" ? 1920 : 1350;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  const fonte = (peso, tam) => `${peso} ${tam}px Inter, Arial, sans-serif`;

  // fundo
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, bf ? "#000000" : "#0b0d16"); g.addColorStop(1, shade(p.cor, bf ? -135 : -110));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, H * .4, 20, W / 2, H * .4, W * .7);
  rg.addColorStop(0, (bf ? "#f5c518" : p.cor) + (bf ? "33" : "66")); rg.addColorStop(1, "transparent");
  x.fillStyle = rg; x.fillRect(0, 0, W, H);
  if (bf) { x.fillStyle = "#f5c518"; x.fillRect(0, 0, W, 12); }

  // produto (foto do Gemini se houver; senão ilustração)
  const tam = formato === "story" ? 940 : 690, topo = formato === "story" ? 300 : 150;
  let img;
  try { img = await carregarImg(opc.imagem || p.imagem || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(arte(p, tam))); }
  catch { img = await carregarImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(arte(p, tam))); }
  const esc = Math.min(tam / img.width, tam / img.height);
  x.drawImage(img, (W - img.width * esc) / 2, topo + (tam - img.height * esc) / 2, img.width * esc, img.height * esc);

  // cabeçalho
  x.fillStyle = "#fff"; x.font = fonte(800, 44); x.textBaseline = "top";
  x.fillText(LOJA.nome, 70, 70);
  const off = desconto(p);
  const selo = p.estoque <= 0 ? "ESGOTADO" : bf ? `BLACK FRIDAY${off ? ` -${off}%` : ""}` : p.novo ? "LANÇAMENTO" : off ? `-${off}% OFF` : "PRONTA ENTREGA";
  x.font = fonte(800, 30);
  const sw = x.measureText(selo).width + 48;
  x.fillStyle = p.estoque <= 0 ? "#3a3d4c" : bf ? "#f5c518" : off && !p.novo ? "#ff3d8b" : "#22d3ee";
  x.beginPath(); x.roundRect(W - 70 - sw, 64, sw, 60, 30); x.fill();
  x.fillStyle = p.estoque <= 0 || (!bf && off && !p.novo) ? "#fff" : bf ? "#000" : "#05222a";
  x.fillText(selo, W - 70 - sw + 24, 79);

  // textos
  let y = topo + tam + (formato === "story" ? 40 : 10);
  x.fillStyle = "#9aa1b8"; x.font = fonte(600, 30);
  x.fillText(`${p.marca.toUpperCase()} · ${p.corNome.toUpperCase()}`, 70, y); y += 48;
  let ts = 84; x.font = fonte(800, ts);
  while (x.measureText(p.nome).width > W - 140 && ts > 40) { ts -= 4; x.font = fonte(800, ts); }
  x.fillStyle = "#fff"; x.fillText(p.nome, 70, y); y += ts + 18;
  x.fillStyle = "#c9cde0"; x.font = fonte(500, 30);
  x.fillText(p.specs.slice(0, 3).join("  •  "), 70, y, W - 140); y += 64;
  if (p.precoAntigo) {
    x.fillStyle = "#8a90a6"; x.font = fonte(500, 34);
    const de = "de " + fmt(p.precoAntigo); x.fillText(de, 70, y);
    const dw = x.measureText(de).width; x.fillRect(70, y + 19, dw, 3); y += 46;
  }
  x.fillStyle = "#fff"; x.font = fonte(800, 72); x.fillText(fmt(p.preco), 70, y);
  const pw = x.measureText(fmt(p.preco)).width;
  x.fillStyle = "#9aa1b8"; x.font = fonte(500, 30);
  x.fillText(`ou ${LOJA.parcelas}x de ${fmt(p.preco / LOJA.parcelas)}`, 90 + pw, y + 34);

  // rodapé
  x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(0, H - 110, W, 110);
  x.fillStyle = "#fff"; x.font = fonte(700, 34);
  x.fillText(`📩 Peça no Direct  @${LOJA.instagram}`, 70, H - 74);
  x.fillStyle = "#8a90a6"; x.font = fonte(500, 22);
  x.textAlign = "right"; x.fillText("Imagem ilustrativa", W - 70, H - 64); x.textAlign = "left";

  if (opc.retornar) return cv.toDataURL("image/jpeg", .92);
  try {
    const a = document.createElement("a");
    a.download = opc.nomeArquivo || `${p.id}-${formato}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
    aviso("Arte baixada! Pronta para postar 📸");
  } catch {
    aviso("Abra o site por um servidor (veja o LEIA-ME) para baixar artes com fotos locais.");
  }
}
async function copiar(txt, msg) {
  try { await navigator.clipboard.writeText(txt); }
  catch {
    const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch { } t.remove();
  }
  aviso(msg);
}

/* ---------------------------------------------------------------------
   UTILIDADES DE UI
   --------------------------------------------------------------------- */
let tAviso;
function aviso(msg) {
  const a = $("#aviso"); a.textContent = msg; a.classList.add("ativo");
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("ativo"), 2400);
}
function aplicarLoja() {
  document.title = `${LOJA.nome} — Smartphones e Periféricos`;
  $$("[data-loja]").forEach(el => el.textContent = LOJA[el.dataset.loja]);
  $$('[data-link="instagram"]').forEach(a => { a.href = linkInsta(); a.target = "_blank"; a.rel = "noopener"; });
  $$('[data-link="whatsapp"]').forEach(a => { a.href = linkWhats(`Olá, ${LOJA.nome}! Vim pelo site.`); a.target = "_blank"; a.rel = "noopener"; });
  $("#totalProdutos").textContent = PRODUTOS.length;
}
function irParaCatalogo() { $("#catalogo").scrollIntoView({ behavior: "smooth" }); }

/* ---------------------------------------------------------------------
   EVENTOS
   --------------------------------------------------------------------- */
function renderFaixaBF() {
  const f = $("#faixaBF");
  if (!f || !bfAtivo()) return;
  const max = Math.max(...PRODUTOS.filter(p => p.estoque > 0).map(desconto));
  $("#faixaBFtxt").innerHTML = `<b>BLACK FRIDAY</b> · até <b>${max}% OFF</b> em iPhone, Galaxy e periféricos`;
  f.hidden = false;
}

function iniciarLoja() {
document.addEventListener("click", e => {
  const t = e.target;
  const oferta = t.closest("[data-oferta]");
  if (oferta) {
    e.preventDefault();
    estado.oferta = !estado.oferta || oferta.id === "faixaBF"; estado.categoria = "todos"; estado.marca = null;
    renderChips(); renderGrade(); if (oferta.id === "faixaBF") irParaCatalogo(); return;
  }
  const add = t.closest("[data-add]");
  if (add) { e.stopPropagation(); return adicionar(add.dataset.add); }
  const mais = t.closest("[data-mais]"); if (mais) return alterar(mais.dataset.mais, 1);
  const menos = t.closest("[data-menos]"); if (menos) return alterar(menos.dataset.menos, -1);
  const card = t.closest(".card, .insta-post, .flut"); if (card) return abrirProduto(card.dataset.id);
  if (t.closest("[data-fechar]")) return fecharProduto();
  if (t.closest("[data-fechar-gaveta]")) return fecharGaveta();
  const cat = t.closest("[data-cat]");
  if (cat) { estado.categoria = cat.dataset.cat; estado.marca = null; estado.oferta = false; renderChips(); return renderGrade(); }
  const marca = t.closest("[data-marca]");
  if (marca) { estado.marca = estado.marca === marca.dataset.marca ? null : marca.dataset.marca; estado.categoria = "todos"; estado.oferta = false; renderChips(); return renderGrade(); }
  const rapido = t.closest("[data-filtro-rapido]");
  if (rapido) {
    const v = rapido.dataset.filtroRapido; estado.oferta = false;
    if (v === "Apple" || v === "Samsung") { estado.marca = v; estado.categoria = "todos"; }
    else { estado.categoria = v; estado.marca = null; }
    renderChips(); renderGrade(); return irParaCatalogo();
  }
  const rolar = t.closest("[data-rolar]");
  if (rolar) { const tr = $("#trilhoDestaques"); tr.scrollBy({ left: Number(rolar.dataset.rolar) * tr.clientWidth * .8 }); }
  if (t.closest(".menu a")) $("#menu").classList.remove("aberto");
});

$("#busca").addEventListener("input", e => { estado.busca = e.target.value; renderGrade(); });
$("#ordem").addEventListener("change", e => { estado.ordem = e.target.value; renderGrade(); });
$("#soDisponiveis").addEventListener("change", e => { estado.soDisp = e.target.checked; renderGrade(); });
$("#abrirBusca").addEventListener("click", () => { irParaCatalogo(); setTimeout(() => $("#busca").focus({ preventScroll: true }), 450); });
$("#abrirCarrinho").addEventListener("click", abrirGaveta);
$("#abrirMenu").addEventListener("click", () => $("#menu").classList.toggle("aberto"));

$("#mAdd").addEventListener("click", () => atual && adicionar(atual.id));
$("#mDirect").addEventListener("click", () => {
  if (!atual) return;
  const msg = `Olá! Tenho interesse no ${atual.nome} (${atual.corNome}) — ${fmt(atual.preco)}. ${linkProduto(atual)}`;
  copiar(msg, "Mensagem copiada — é só colar no Direct 📩");
  window.open(linkDirect(), "_blank", "noopener");
});
$("#finalizarWhats").addEventListener("click", () => window.open(linkWhats(textoPedido()), "_blank", "noopener"));
$("#finalizarDirect").addEventListener("click", () => {
  copiar(textoPedido(), "Pedido copiado — cole no Direct 📩");
  window.open(linkDirect(), "_blank", "noopener");
});
$("#kPost").addEventListener("click", () => atual && gerarArte(atual, $("#kFormato").value));
$("#kLegenda").addEventListener("click", () => atual && copiar(legenda(atual), "Legenda copiada ✓"));
$("#kLink").addEventListener("click", () => atual && copiar(linkProduto(atual), "Link do produto copiado ✓"));
$("#kPrompt").addEventListener("click", () => atual && copiar(promptGemini(atual), "Prompt copiado — cole no Gemini ✨"));

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#modal").hidden) fecharProduto(); else if (!$("#gaveta").hidden) fecharGaveta();
});
window.addEventListener("scroll", () => $("#topo").classList.toggle("rolou", scrollY > 10), { passive: true });
window.addEventListener("hashchange", lerHash);
function lerHash() {
  const m = location.hash.match(/^#p=([\w-]+)/);
  if (m && porId(m[1])) abrirProduto(m[1], false);
}

// animação de entrada ao rolar
const obs = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add("visivel"); obs.unobserve(en.target); }
}), { threshold: .12 }) : null;

/* ---------------------------------------------------------------------
   INÍCIO
   --------------------------------------------------------------------- */
aplicarLoja();
renderFaixaBF();
renderHero();
renderDestaques();
renderChips();
renderGrade();
renderInsta();
renderCarrinho();
$$(".revelar").forEach(el => obs ? obs.observe(el) : el.classList.add("visivel"));
lerHash();
}
if (document.getElementById("grade")) iniciarLoja();
