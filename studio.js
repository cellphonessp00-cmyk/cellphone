/* =====================================================================
   Studio Black Friday — calendário de posts (2 por dia) para o Instagram
   Usa produtos.js (LOJA.blackFriday) e as funções de arte/legenda do app.js
   ===================================================================== */
const BFC = LOJA.blackFriday;
const lerLS = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? padrao; } catch { return padrao; } };
const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const fotos = lerLS("fotosGemini", {});      // fotos do Gemini por produto (reduzidas)
const postados = lerLS("postados", {});      // slots marcados como postados

const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dataBR = (iso, op) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", op);

function diasCampanha() {
  const out = [];
  const d = new Date(BFC.inicio + "T12:00:00"), fim = new Date(BFC.fim + "T12:00:00");
  while (d <= fim) { out.push(new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}
// celulares e periféricos intercalados, maior desconto primeiro
function produtosPromo() {
  const ok = p => p.estoque > 0 && desconto(p) > 0;
  const ord = (a, b) => desconto(b) - desconto(a);
  const cel = PRODUTOS.filter(p => ok(p) && p.categoria === "celulares").sort(ord);
  const outros = PRODUTOS.filter(p => ok(p) && p.categoria !== "celulares").sort(ord);
  const r = [];
  for (let i = 0; i < Math.max(cel.length, outros.length); i++) { if (cel[i]) r.push(cel[i]); if (outros[i]) r.push(outros[i]); }
  return r;
}
const DIAS = diasCampanha();
const PROMO = produtosPromo();
const HORAS = BFC.horarios;

function slot(di, k) {
  const i = di * HORAS.length + k;
  return { id: `${DIAS[di]}-${k}`, data: DIAS[di], hora: HORAS[k], k, p: PROMO[i % PROMO.length], rodada: Math.floor(i / PROMO.length) };
}
function chamada(s) {
  const nome = LOJA.nome.toUpperCase();
  if (s.data === BFC.dia) return `🖤 É HOJE! BLACK FRIDAY ${nome} 🖤`;
  if (s.data > BFC.dia) return "⚡ BLACK FRIDAY ESTENDIDA — ÚLTIMOS DIAS! ⚡";
  const falta = Math.round((new Date(BFC.dia + "T12:00:00") - new Date(s.data + "T12:00:00")) / 864e5);
  if (falta <= 7) return `⏳ FALTAM ${falta} DIA${falta > 1 ? "S" : ""} PARA A BLACK FRIDAY!`;
  return s.rodada % 2 ? `🖤 BLACK FRIDAY ANTECIPADA ${nome} 🖤` : "🔥 ESQUENTA BLACK FRIDAY 🔥";
}

/* ---------- interface ---------- */
let diaAtual = Math.max(0, DIAS.indexOf(hojeISO()));
if (hojeISO() > BFC.fim) diaAtual = DIAS.length - 1;

function renderProgresso() {
  const total = DIAS.length * HORAS.length;
  const feitos = DIAS.reduce((s, d, di) => s + HORAS.filter((_, k) => postados[slot(di, k).id]).length, 0);
  $("#progTxt").textContent = `${feitos} de ${total} posts feitos`;
  $("#progBarra").style.width = (feitos / total * 100) + "%";
}
function renderDias() {
  const hoje = hojeISO();
  $("#dias").innerHTML = DIAS.map((d, di) => `
    <button class="dia ${di === diaAtual ? "ativo" : ""} ${d === hoje ? "hoje" : ""} ${d === BFC.dia ? "bf" : ""}" data-dia="${di}">
      ${d === BFC.dia ? "BLACK FRIDAY" : dataBR(d, { weekday: "short" }).replace(".", "")}
      <b>${dataBR(d, { day: "2-digit", month: "2-digit" })}</b>
      <span class="pontos">${HORAS.map((_, k) => `<i class="${postados[slot(di, k).id] ? "ok" : ""}"></i>`).join("")}</span>
    </button>`).join("");
  const ativo = $(".dia.ativo"); if (ativo) ativo.scrollIntoView({ block: "nearest", inline: "center" });
}
function renderPosts() {
  const di = diaAtual;
  $("#posts").innerHTML = HORAS.map((h, k) => {
    const s = slot(di, k), p = s.p;
    return `<article class="post ${postados[s.id] ? "feito" : ""}" data-slot="${k}">
      <div class="post-cab">
        <b>${dataBR(s.data, { weekday: "long", day: "2-digit", month: "2-digit" })} · ${h}</b>
        <label><input type="checkbox" data-postado ${postados[s.id] ? "checked" : ""}> Postado</label>
      </div>
      <div class="post-corpo">
        <div class="previa" data-previa>gerando arte…</div>
        <div>
          <span class="card-marca">${p.marca} · ${CATEGORIAS[p.categoria]} · -${desconto(p)}%</span>
          <h3>${p.nome}</h3>
          <div><span class="preco-de">${fmt(p.precoAntigo)}</span> <span class="preco">${fmt(p.preco)}</span></div>
          <textarea data-legenda aria-label="Legenda">${legenda(p, chamada(s))}</textarea>
        </div>
      </div>
      <div class="post-acoes">
        <button class="btn btn-mini btn-ouro" data-baixar="feed">Baixar post 4:5</button>
        <button class="btn btn-mini" data-baixar="story">Baixar story 9:16</button>
        <button class="btn btn-mini" data-copiar-legenda>Copiar legenda</button>
      </div>
      <div class="gemini-box">
        <b>Foto com Gemini (Nano Banana)</b> — ${fotos[p.id] ? `<span class="com-foto">✓ usando sua foto do Gemini</span>` : "usando a ilustração do site"}
        <div class="kit-acoes">
          <button class="btn btn-mini" data-prompt>Copiar prompt</button>
          <a class="btn btn-mini" href="https://gemini.google.com/app" target="_blank" rel="noopener">Abrir Gemini ↗</a>
          <label class="btn btn-mini">Usar foto do Gemini<input type="file" accept="image/*" data-foto hidden></label>
          ${fotos[p.id] ? `<button class="btn btn-mini" data-remover-foto>Remover foto</button>` : ""}
        </div>
      </div>
    </article>`;
  }).join("");
  // prévias
  HORAS.forEach(async (_, k) => {
    const s = slot(di, k);
    const url = await gerarArte(s.p, "feed", { blackFriday: true, imagem: fotos[s.p.id], retornar: true });
    const alvo = $(`.post[data-slot="${k}"] [data-previa]`);
    if (alvo && diaAtual === di) alvo.innerHTML = `<img src="${url}" alt="Prévia do post: ${s.p.nome}">`;
  });
}
function render() { renderProgresso(); renderDias(); renderPosts(); }

// reduz a foto para no máx. 1400px e guarda no aparelho
function lerFoto(arquivo) {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onerror = erro;
    r.onload = async () => {
      const img = await carregarImg(r.result);
      const esc = Math.min(1, 1400 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * esc); cv.height = Math.round(img.height * esc);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      ok(cv.toDataURL("image/jpeg", .88));
    };
    r.readAsDataURL(arquivo);
  });
}

document.addEventListener("click", async e => {
  const t = e.target;
  const dia = t.closest("[data-dia]");
  if (dia) { diaAtual = Number(dia.dataset.dia); return render(); }
  const post = t.closest(".post"); if (!post) return;
  const s = slot(diaAtual, Number(post.dataset.slot));
  const b = t.closest("[data-baixar]");
  if (b) {
    const f = b.dataset.baixar;
    return gerarArte(s.p, f, { blackFriday: true, imagem: fotos[s.p.id], nomeArquivo: `bf-${s.data}-${s.hora.replace(":", "h")}-${s.p.id}-${f}.png` });
  }
  if (t.closest("[data-copiar-legenda]")) return copiar($("[data-legenda]", post).value, "Legenda copiada ✓");
  if (t.closest("[data-prompt]")) return copiar(promptGemini(s.p, true), "Prompt copiado — cole no Gemini ✨");
  if (t.closest("[data-remover-foto]")) { delete fotos[s.p.id]; gravarLS("fotosGemini", fotos); return renderPosts(); }
});
document.addEventListener("change", async e => {
  const t = e.target, post = t.closest(".post"); if (!post) return;
  const s = slot(diaAtual, Number(post.dataset.slot));
  if (t.matches("[data-postado]")) {
    if (t.checked) postados[s.id] = true; else delete postados[s.id];
    gravarLS("postados", postados); post.classList.toggle("feito", t.checked); renderProgresso(); renderDias();
  }
  if (t.matches("[data-foto]") && t.files[0]) {
    fotos[s.p.id] = await lerFoto(t.files[0]);
    if (!gravarLS("fotosGemini", fotos)) aviso("Foto usada agora, mas o aparelho está sem espaço para guardá-la.");
    else aviso("Foto do Gemini aplicada ✓");
    renderPosts();
  }
});

aplicarLojaStudio();
function aplicarLojaStudio() {
  $$("[data-loja]").forEach(el => el.textContent = LOJA[el.dataset.loja]);
  $$('[data-link="instagram"]').forEach(a => { a.href = linkInsta(); a.target = "_blank"; a.rel = "noopener"; });
}
if (!PROMO.length) $("#posts").innerHTML = `<p class="vazio">Nenhum produto com desconto e estoque. Preencha "precoAntigo" em produtos.js.</p>`;
else document.fonts.load("800 40px Inter").catch(() => { }).finally(render);
