const { test } = require("node:test"),
  assert = require("node:assert/strict");
test("Supabase: dados sobrevivem ao reinício, capas remotas e login HTTPS", async () => {
  const nativeFetch = global.fetch,
    rows = new Map(),
    uploads = new Map();
  Object.assign(process.env, {
    NODE_ENV: "production",
    PUBLIC_URL: "https://retrovaultps2.onrender.com",
    SUPABASE_URL: "https://unit-test.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_test_only",
    RETRO_ADMIN_PASSWORD: "Senha-apenas-de-teste-2026",
  });
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (u.origin !== "https://unit-test.supabase.co")
      return nativeFetch(url, options);
    assert.equal(options.headers.apikey, "sb_secret_test_only");
    assert.equal(options.headers.Authorization, undefined);
    if (u.pathname === "/rest/v1/retrovault_state") {
      if (options.method === "POST") {
        const row = JSON.parse(options.body);
        rows.set(row.key, structuredClone(row.value));
        return new Response(null, { status: 204 });
      }
      const key = u.searchParams.get("key").slice(3);
      return Response.json(
        rows.has(key) ? [{ value: structuredClone(rows.get(key)) }] : [],
      );
    }
    if (u.pathname.startsWith("/storage/v1/object/retrovault-covers/")) {
      assert.equal(options.headers["Content-Type"], "image/png");
      uploads.set(u.pathname, Buffer.from(options.body));
      return Response.json({ Key: u.pathname });
    }
    throw Error("Rota Supabase inesperada");
  };
  let app;
  try {
    app = require("../server/server");
    await app.initializeAdmin();
    assert.equal(rows.has("admin"), true);
    assert.equal(
      JSON.stringify(rows.get("admin")).includes(
        process.env.RETRO_ADMIN_PASSWORD,
      ),
      false,
    );
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    let base = `http://127.0.0.1:${app.server.address().port}`,
      cookie = "";
    async function req(
      route,
      method = "GET",
      data,
      origin = process.env.PUBLIC_URL,
    ) {
      const r = await nativeFetch(base + route, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return {
        status: r.status,
        data: await r.json(),
        cookie: r.headers.get("set-cookie"),
      };
    }
    assert.equal((await req("/api/health")).status, 200);
    assert.equal(
      (await req("/api/setup", "POST", { password: "Outro-admin-2026" }))
        .status,
      403,
    );
    assert.equal(
      (
        await req(
          "/api/login",
          "POST",
          { password: process.env.RETRO_ADMIN_PASSWORD },
          "https://evil.example",
        )
      ).status,
      403,
    );
    const login = await req("/api/login", "POST", {
      password: process.env.RETRO_ADMIN_PASSWORD,
    });
    assert.equal(login.status, 200);
    assert.ok(login.cookie.includes("; Secure"));
    cookie = login.cookie.split(";")[0];
    const image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    const uploaded = await req("/api/covers", "POST", {
      data: "data:image/png;base64," + image,
    });
    assert.equal(uploaded.status, 201);
    assert.ok(
      uploaded.data.url.startsWith(
        "https://unit-test.supabase.co/storage/v1/object/public/retrovault-covers/",
      ),
    );
    assert.equal(uploads.size, 1);
    const game = {
      title: "Teste online",
      platform: "PlayStation 2",
      genre: "Ação",
      year: 2002,
      region: "USA",
      language: "PT-BR",
      size: "1 GB",
      format: "ISO",
      description: "Teste",
      link: "https://drive.google.com/file/d/example/view",
      cover: uploaded.data.url,
      published: true,
      featured: false,
    };
    assert.equal(
      (await req("/api/games", "POST", { revision: 0, game })).status,
      200,
    );
    assert.equal(rows.get("catalog").games[0].title, game.title);
    await new Promise((r) => app.server.close(r));
    delete require.cache[require.resolve("../server/server")];
    app = require("../server/server");
    delete process.env.RETRO_ADMIN_PASSWORD;
    await app.initializeAdmin();
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${app.server.address().port}`;
    assert.equal((await req("/api/admin/catalog")).status, 401);
    const publicData = await req("/api/catalog");
    assert.equal(publicData.data.games[0].title, game.title);
    assert.equal(JSON.stringify(publicData.data).includes("sb_secret_"), false);
    const newLogin = await req("/api/login", "POST", {
      password: "Senha-apenas-de-teste-2026",
    });
    assert.equal(newLogin.status, 200);
    cookie = newLogin.cookie.split(";")[0];
    const logout = await req("/api/logout", "POST", {});
    assert.ok(logout.cookie.includes("; Secure"));
  } finally {
    if (app?.server.listening) await new Promise((r) => app.server.close(r));
    global.fetch = nativeFetch;
  }
});

test("configuração incompleta ou chave pública não ativa armazenamento online", () => {
  const {
    configuredStore,
    createSupabaseStore,
  } = require("../server/supabase");
  assert.throws(() =>
    configuredStore({ SUPABASE_URL: "https://test.supabase.co" }),
  );
  assert.throws(() =>
    createSupabaseStore({
      url: "https://test.supabase.co",
      key: "sb_publishable_test",
    }),
  );
});
