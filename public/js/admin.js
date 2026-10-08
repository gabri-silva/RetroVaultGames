let configured = false,
  catalog = { revision: 0, games: [] },
  platforms = [],
  genres = [],
  editing = "",
  uploadedCover = "",
  busy = false,
  dirty = false;
async function status() {
  try {
    const s = await api("/api/status");
    configured = s.configured;
    $("auth-panel").hidden = s.authenticated;
    $("admin-panel").hidden = !s.authenticated;
    $("logout").hidden = !s.authenticated;
    if (!configured) {
      $("auth-title").innerHTML = "O primeiro<br><em>press start.</em>";
      $("auth-copy").textContent =
        "Crie sua senha de administrador. Use pelo menos 10 caracteres.";
      $("auth-submit").textContent = "CRIAR ADMINISTRADOR →";
      $("confirm-group").hidden = false;
      $("password").minLength = 10;
      $("password").autocomplete = "new-password";
    } else {
      $("auth-title").innerHTML = "Sua sala<br>de <em>controle.</em>";
      $("auth-copy").textContent =
        "Entre com sua senha para gerenciar o acervo.";
      $("auth-submit").textContent = "ENTRAR →";
      $("confirm-group").hidden = true;
      $("password").minLength = 1;
      $("password").autocomplete = "current-password";
    }
    if (s.authenticated) await load();
  } catch (e) {
    message("admin-notice", e.message);
  }
}
async function load() {
  const c = await api("/api/admin/catalog");
  catalog = c;
  platforms = c.platforms;
  genres = c.genres;
  const p = $("platform").value,
    g = $("game-genre").value;
  $("platform").innerHTML = platforms
    .map((x) => `<option>${esc(x)}</option>`)
    .join("");
  $("game-genre").innerHTML = genres
    .map((x) => `<option>${esc(x)}</option>`)
    .join("");
  if (platforms.includes(p)) $("platform").value = p;
  if (genres.includes(g)) $("game-genre").value = g;
  render();
}
function render() {
  $("stat-total").textContent = catalog.games.length;
  $("stat-published").textContent = catalog.games.filter(
    (g) => g.published,
  ).length;
  $("stat-drafts").textContent = catalog.games.filter(
    (g) => !g.published,
  ).length;
  const q = $("admin-search").value.toLowerCase();
  const list = catalog.games.filter((g) =>
    (g.title + " " + g.platform).toLowerCase().includes(q),
  );
  $("admin-list").innerHTML = list.length
    ? list
        .map(
          (g) =>
            `<article class="admin-game"><img src="${esc(coverUrl(g))}" alt="Capa de ${esc(g.title)}"><div class="admin-game-info"><span class="status-tag ${g.published ? "published" : ""}">${g.published ? "PUBLICADO" : "RASCUNHO"}${g.featured ? " · ★" : ""}</span><h3>${esc(g.title)}</h3><small>${esc(g.platform)} · ${g.year}</small><div class="admin-game-actions"><button data-edit="${esc(g.id)}">Editar</button><button data-toggle="${esc(g.id)}">${g.published ? "Despublicar" : "Publicar"}</button><button data-delete="${esc(g.id)}">Excluir</button></div></div></article>`,
        )
        .join("")
    : '<div class="empty-state"><span>▣</span><h3>Seu acervo começa aqui.</h3><p>Cadastre o primeiro jogo no formulário ao lado.</p></div>';
  fallbackImages();
}
function reset() {
  editing = "";
  uploadedCover = "";
  $("game-form").reset();
  $("game-id").value = "";
  $("cover-file").value = "";
  $("cover-preview").src = "/assets/cover-default.svg";
  $("editor-title").textContent = "Novo jogo";
  $("save-game").textContent = "SALVAR JOGO →";
  dirty = false;
}
function edit(id) {
  if (dirty && !confirm("Descartar alterações do formulário?")) return;
  const g = catalog.games.find((x) => x.id === id);
  if (!g) return;
  editing = id;
  uploadedCover = g.cover?.startsWith("/covers/") ? g.cover : "";
  for (const k of [
    "title",
    "platform",
    "year",
    "region",
    "language",
    "size",
    "format",
    "description",
    "link",
  ])
    $(k).value = g[k] || "";
  $("game-genre").value = g.genre;
  $("cover").value = uploadedCover ? "" : g.cover || "";
  $("published").checked = g.published;
  $("featured").checked = g.featured;
  $("cover-preview").src = coverUrl(g);
  $("editor-title").textContent = "Editar jogo";
  $("save-game").textContent = "SALVAR ALTERAÇÕES →";
  $("game-id").value = id;
  dirty = false;
  $("game-form").scrollIntoView({ behavior: "smooth", block: "start" });
  $("title").focus();
}
async function fail(e) {
  message("admin-notice", e.message);
  if (e.status === 401) {
    dirty = false;
    await status();
  }
  if (e.status === 409) await load();
  $("admin-notice").scrollIntoView({ behavior: "smooth", block: "center" });
}
function setBusy(value) {
  busy = value;
  document
    .querySelectorAll("#game-form button,#cover-file,#new-game,#cancel-edit")
    .forEach((b) => (b.disabled = value));
}
$("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!configured && $("password").value !== $("confirm-password").value)
    return message("admin-notice", "As senhas não coincidem.");
  $("auth-submit").disabled = true;
  try {
    await api(configured ? "/api/login" : "/api/setup", {
      method: "POST",
      body: JSON.stringify({ password: $("password").value }),
    });
    $("auth-form").reset();
    message("admin-notice", "");
    await status();
  } catch (e) {
    message("admin-notice", e.message);
  } finally {
    $("auth-submit").disabled = false;
  }
};
$("logout").onclick = async () => {
  if (dirty && !confirm("Sair e descartar alterações não salvas?")) return;
  try {
    await api("/api/logout", { method: "POST", body: "{}" });
    reset();
    await status();
  } catch (e) {
    fail(e);
  }
};
$("game-form").addEventListener("input", () => (dirty = true));
$("game-form").onsubmit = async (e) => {
  e.preventDefault();
  if (busy) return;
  setBusy(true);
  try {
    const g = {};
    for (const k of [
      "title",
      "platform",
      "region",
      "language",
      "size",
      "format",
      "description",
      "link",
    ])
      g[k] = $(k).value;
    g.genre = $("game-genre").value;
    g.year = Number($("year").value);
    g.cover = uploadedCover || $("cover").value;
    g.published = $("published").checked;
    g.featured = $("featured").checked;
    if (g.published && !g.link)
      throw Error("Adicione o link do Drive antes de publicar.");
    await api(editing ? "/api/games/" + editing : "/api/games", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({ revision: catalog.revision, game: g }),
    });
    reset();
    await load();
    message(
      "admin-notice",
      g.published
        ? "Jogo salvo e publicado! Ele já está disponível no cliente."
        : "Rascunho salvo. Marque “Publicar no catálogo” quando estiver pronto.",
    );
  } catch (e) {
    await fail(e);
  } finally {
    setBusy(false);
  }
};
$("cover-file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
    f.size > 3000000
  ) {
    e.target.value = "";
    return message(
      "admin-notice",
      "Use uma capa PNG, JPG ou WebP de até 3 MB.",
    );
  }
  setBusy(true);
  try {
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    const result = await api("/api/covers", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    uploadedCover = result.url;
    $("cover").value = "";
    $("cover-preview").src = uploadedCover;
    dirty = true;
    message(
      "admin-notice",
      "Capa enviada. Salve o jogo para associá-la ao cadastro.",
    );
  } catch (e) {
    await fail(e);
  } finally {
    setBusy(false);
  }
};
$("cover").oninput = () => {
  uploadedCover = "";
  $("cover-preview").src = coverUrl({ cover: $("cover").value });
  fallbackImages();
};
$("remove-cover").onclick = () => {
  uploadedCover = "";
  $("cover").value = "";
  $("cover-file").value = "";
  $("cover-preview").src = "/assets/cover-default.svg";
  dirty = true;
};
$("admin-list").onclick = async (e) => {
  const b = e.target.closest("button");
  if (!b || busy) return;
  if (b.dataset.edit) return edit(b.dataset.edit);
  const id = b.dataset.delete || b.dataset.toggle,
    g = catalog.games.find((x) => x.id === id);
  if (!g) return;
  if (b.dataset.delete && !confirm(`Excluir “${g.title}” do acervo?`)) return;
  setBusy(true);
  try {
    await api("/api/games/" + id, {
      method: b.dataset.delete ? "DELETE" : "PUT",
      body: JSON.stringify({
        revision: catalog.revision,
        game: { ...g, published: !g.published },
      }),
    });
    if (editing === id) reset();
    await load();
    message(
      "admin-notice",
      b.dataset.delete ? "Jogo excluído." : "Publicação atualizada.",
    );
  } catch (e) {
    await fail(e);
  } finally {
    setBusy(false);
  }
};
$("new-game").onclick = $("cancel-edit").onclick = () => {
  if (dirty && !confirm("Descartar alterações não salvas?")) return;
  reset();
  $("title").focus();
  $("game-form").scrollIntoView({ behavior: "smooth" });
};
$("admin-search").oninput = render;
$("refresh").onclick = () => load().catch(fail);
$("export-catalog").onclick = () => {
  const a = document.createElement("a"),
    u = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { revision: catalog.revision, games: catalog.games },
            null,
            2,
          ),
        ],
        { type: "text/plain" },
      ),
    );
  a.href = u;
  a.download =
    "retrovault-catalogo-" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
$("password-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("/api/password", {
      method: "PUT",
      body: JSON.stringify({
        current: $("current-password").value,
        password: $("new-password").value,
      }),
    });
    $("password-form").reset();
    message(
      "admin-notice",
      "Senha atualizada. As outras sessões foram encerradas.",
    );
  } catch (e) {
    await fail(e);
  }
};
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
status();
