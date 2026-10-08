let games = [],
  platforms = [],
  activePlatform = "",
  page = 1,
  onlyFavorites = false,
  isDemo = false,
  lastRevision = -1;
let favorites = new Set();
try {
  favorites = new Set(
    JSON.parse(localStorage.getItem("retrovault-favorites") || "[]"),
  );
} catch {}
const demos = [
  ["Neon Horizon", "PlayStation 1", "Corrida", 1998],
  ["Chronicles of Ember", "Super Nintendo", "RPG", 1995],
  ["Cosmic Patrol", "Mega Drive", "Ação", 1993],
  ["Midnight Manor", "PlayStation 2", "Aventura", 2001],
  ["Pocket Odyssey", "Game Boy Advance", "Plataforma", 2003],
  ["Velocity 64", "Nintendo 64", "Corrida", 1997],
].map((d, i) => ({
  id: "demo-" + i,
  title: d[0],
  platform: d[1],
  genre: d[2],
  year: d[3],
  region: "World",
  language: "—",
  format: "—",
  size: "—",
  description:
    "Este é um exemplo visual do RetroVault. Cadastre seus próprios jogos no painel administrativo para substituir esta prévia.",
  featured: i === 0,
  link: "",
  demoCover: "/assets/demo-" + i + ".svg",
}));
function favCount() {
  $("fav-count").textContent = [...favorites].filter((id) =>
    games.some((g) => g.id === id),
  ).length;
}
function platformRender() {
  const counts = new Map();
  games.forEach((g) =>
    counts.set(g.platform, (counts.get(g.platform) || 0) + 1),
  );
  $("platform-list").innerHTML =
    `<button class="platform-btn ${!activePlatform ? "selected" : ""}" data-platform="">Todos os consoles <span>${games.length}</span></button>` +
    platforms
      .filter((p) => counts.has(p))
      .map(
        (p) =>
          `<button class="platform-btn ${activePlatform === p ? "selected" : ""}" data-platform="${esc(p)}">${esc(p)} <span>${counts.get(p)}</span></button>`,
      )
      .join("");
}
function render() {
  platformRender();
  favCount();
  const q = $("search").value.toLocaleLowerCase("pt-BR").trim();
  let filtered = games.filter(
    (g) =>
      (!activePlatform || g.platform === activePlatform) &&
      (!$("genre").value || g.genre === $("genre").value) &&
      (!onlyFavorites || favorites.has(g.id)) &&
      (!q ||
        [g.title, g.platform, g.genre, g.description]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(q)),
  );
  if ($("sort").value === "title")
    filtered.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  else if ($("sort").value === "year") filtered.sort((a, b) => b.year - a.year);
  else
    filtered.sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 9));
  page = Math.min(page, pages);
  $("total-count").textContent = isDemo
    ? "PRÉVIA VISUAL"
    : `${games.length} JOGOS NO ACERVO`;
  $("result-label").textContent =
    `${filtered.length} ${filtered.length === 1 ? "jogo encontrado" : "jogos encontrados"}${onlyFavorites ? " · favoritos" : ""}`;
  $("game-grid").innerHTML = filtered.length
    ? filtered
        .slice((page - 1) * 9, page * 9)
        .map(
          (g) =>
            `<article class="game-card"><div class="cover-wrap"><button class="cover-button" data-details="${esc(g.id)}" aria-label="Ver detalhes de ${esc(g.title)}"><img src="${esc(coverUrl(g))}" alt="Capa de ${esc(g.title)}" loading="lazy"></button>${isDemo ? '<span class="cover-tag">EXEMPLO</span>' : g.featured ? '<span class="cover-tag">★ DESTAQUE</span>' : ""}<button class="fav-button ${favorites.has(g.id) ? "selected" : ""}" data-fav="${esc(g.id)}" aria-label="Favoritar ${esc(g.title)}" aria-pressed="${favorites.has(g.id)}">${favorites.has(g.id) ? "♥" : "♡"}</button></div><div class="card-copy"><span class="card-platform">${esc(g.platform)} <span>${g.year}</span></span><h3><button data-details="${esc(g.id)}">${esc(g.title)}</button></h3><div class="card-meta"><span>${esc(g.genre)}</span><span>${esc(g.region)}${g.size && g.size !== "—" ? " · " + esc(g.size) : ""}</span></div><button class="card-cta" data-details="${esc(g.id)}">${isDemo ? "VER PRÉVIA" : "VER JOGO & DOWNLOAD"} <span>↗</span></button></div></article>`,
        )
        .join("")
    : '<div class="empty-state"><span>◌</span><h3>Nenhum jogo por aqui.</h3><p>Tente outro console, outra busca ou marque seus favoritos.</p><button class="btn btn-orange" id="empty-clear">LIMPAR FILTROS</button></div>';
  $("pagination").innerHTML =
    pages > 1
      ? `<button data-step="-1" ${page === 1 ? "disabled" : ""}>← Anterior</button><span>PÁGINA ${page} DE ${pages}</span><button data-step="1" ${page === pages ? "disabled" : ""}>Próxima →</button>`
      : "";
  fallbackImages();
}
function details(id) {
  const g = games.find((x) => x.id === id);
  if (!g) return;
  const url = driveDownload(g.link);
  $("game-details").innerHTML =
    `<div class="details-grid"><img class="detail-cover" src="${esc(coverUrl(g))}" alt="Capa de ${esc(g.title)}"><div><div class="kicker">${esc(g.platform)} · ${g.year}</div><h2>${esc(g.title)}</h2><div class="detail-tags"><span>${esc(g.genre)}</span><span>${esc(g.region || "World")}</span><span>${esc(g.language || "Não informado")}</span></div><p class="game-description">${esc(g.description || "Uma nova memória espera por você.")}</p><dl><div><dt>FORMATO</dt><dd>${esc(g.format || "—")}</dd></div><div><dt>TAMANHO</dt><dd>${esc(g.size || "Não informado")}</dd></div></dl>${url ? `<a class="btn btn-orange w-100" href="${esc(url)}" target="_blank" rel="noopener noreferrer">BAIXAR NO DRIVE ↓</a><a class="original-link" href="${esc(g.link)}" target="_blank" rel="noopener noreferrer">Abrir link original ↗</a><small class="download-hint">O download abre no serviço onde o arquivo foi compartilhado. Arquivos grandes podem pedir confirmação.</small>` : '<div class="notice">Prévia visual: cadastre um jogo e seu link no admin para habilitar o download.</div>'}</div></div>`;
  fallbackImages();
  $("game-dialog").showModal();
}
function clear() {
  activePlatform = "";
  onlyFavorites = false;
  $("favorites").setAttribute("aria-pressed", "false");
  $("favorites").classList.remove("selected");
  $("search").value = "";
  $("genre").value = "";
  page = 1;
  render();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-platform")) {
    activePlatform = b.dataset.platform;
    page = 1;
    render();
  }
  if (b.dataset.fav) {
    const id = b.dataset.fav;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    try {
      localStorage.setItem(
        "retrovault-favorites",
        JSON.stringify([...favorites]),
      );
    } catch {}
    render();
  }
  if (b.dataset.details) details(b.dataset.details);
  if (b.dataset.step) {
    page += Number(b.dataset.step);
    render();
    $("catalog").scrollIntoView({ behavior: "smooth" });
  }
  if (b.id === "empty-clear") clear();
});
$("search").oninput = () => {
  page = 1;
  render();
};
$("genre").onchange = $("sort").onchange = () => {
  page = 1;
  render();
};
$("clear-filters").onclick = clear;
$("favorites").onclick = () => {
  onlyFavorites = !onlyFavorites;
  $("favorites").setAttribute("aria-pressed", String(onlyFavorites));
  $("favorites").classList.toggle("selected", onlyFavorites);
  page = 1;
  render();
  $("catalog").scrollIntoView({ behavior: "smooth" });
};
$("close-dialog").onclick = () => $("game-dialog").close();
$("game-dialog").addEventListener("click", (e) => {
  if (e.target === $("game-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
async function load() {
  try {
    const c = await api("/api/catalog");
    if (c.revision !== lastRevision) {
      lastRevision = c.revision;
      isDemo = c.games.length === 0;
      games = isDemo ? demos : c.games;
      platforms = c.platforms;
      $("genre").innerHTML =
        '<option value="">Todos os gêneros</option>' +
        c.genres.map((g) => `<option>${esc(g)}</option>`).join("");
      message(
        "catalog-notice",
        isDemo
          ? "Seu acervo está pronto para começar. Os jogos abaixo são exemplos visuais, sem arquivos de download. Cadastre seus jogos na área admin."
          : "",
      );
      render();
    } else if (!isDemo) message("catalog-notice", "");
  } catch (e) {
    message(
      "catalog-notice",
      "Não foi possível carregar o acervo. Verifique se o servidor está aberto e tente recarregar.",
    );
  }
}
load();
setInterval(() => {
  if (!document.hidden) load();
}, 15000);
window.addEventListener("focus", load);
