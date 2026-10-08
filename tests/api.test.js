const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path");
test("admin protegido, publicação, persistência e conflitos", async () => {
  const dir = await fs.mkdtemp(path.resolve(__dirname, "..", ".test-data-"));
  process.env.RETRO_DATA_DIR = dir;
  const { server } = require("../server/server");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  async function request(
    route,
    method = "GET",
    value,
    auth = true,
    origin = base,
  ) {
    const r = await fetch(base + route, {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(auth && cookie ? { Cookie: cookie } : {}),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie"),
    };
  }
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + "/admin")).status, 200);
    assert.equal((await request("/api/admin/catalog")).status, 401);
    assert.equal((await request("/dados/admin.txt")).status, 404);
    assert.equal(
      (await request("/api/setup", "POST", { password: "curta" })).status,
      400,
    );
    const setup = await request("/api/setup", "POST", {
      password: "Senha-de-teste-2026",
    });
    assert.equal(setup.status, 201);
    cookie = setup.cookie.split(";")[0];
    assert.equal(
      (await request("/api/setup", "POST", { password: "Outra-senha-2026" }))
        .status,
      409,
    );
    assert.equal(
      (await request("/api/login", "POST", { password: "errada" })).status,
      401,
    );
    const g = {
      title: "Jogo de teste",
      platform: "PlayStation 1",
      genre: "Ação",
      year: 1998,
      region: "USA",
      language: "Português",
      size: "700 MB",
      format: "ISO",
      description: "Teste de publicação",
      link: "https://drive.google.com/file/d/TEST_FILE_ID/view",
      cover: "",
      published: false,
      featured: false,
    };
    assert.equal(
      (await request("/api/games", "POST", { revision: 0, game: g }, false))
        .status,
      401,
    );
    assert.equal(
      (
        await request(
          "/api/games",
          "POST",
          { revision: 0, game: g },
          true,
          "http://evil.example",
        )
      ).status,
      403,
    );
    let created = await request("/api/games", "POST", { revision: 0, game: g });
    assert.equal(created.status, 200);
    assert.equal((await request("/api/catalog")).data.games.length, 0);
    const id = created.data.games[0].id;
    assert.equal(
      (
        await request("/api/games/" + id, "PUT", {
          revision: 1,
          game: { ...g, link: "javascript:alert(1)", published: true },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/api/games/" + id, "PUT", {
          revision: 0,
          game: { ...g, published: true },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/api/games/" + id, "PUT", {
          revision: 1,
          game: { ...g, published: true },
        })
      ).status,
      200,
    );
    assert.equal((await request("/api/catalog")).data.games.length, 1);
    const disk = JSON.parse(
      await fs.readFile(path.join(dir, "catalogo.txt"), "utf8"),
    );
    assert.equal(disk.games[0].published, true);
    assert.ok(await fs.stat(path.join(dir, "catalogo.txt.bak")));
    const auth = await fs.readFile(path.join(dir, "admin.txt"), "utf8");
    assert.equal(auth.includes("Senha-de-teste-2026"), false);
    assert.equal(
      (
        await request("/api/password", "PUT", {
          current: "Senha-de-teste-2026",
          password: "Nova-senha-de-teste",
        })
      ).status,
      200,
    );
    assert.equal((await request("/api/admin/catalog")).status, 401);
    const login = await request("/api/login", "POST", {
      password: "Nova-senha-de-teste",
    });
    assert.equal(login.status, 200);
    cookie = login.cookie.split(";")[0];
    assert.equal(
      (await request("/api/games/" + id, "DELETE", { revision: 2 })).status,
      200,
    );
    assert.equal((await request("/api/catalog")).data.games.length, 0);
    assert.equal((await request("/api/logout", "POST", {})).status, 200);
    assert.equal((await request("/api/admin/catalog")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    assert.ok(
      path
        .resolve(dir)
        .startsWith(path.resolve(__dirname, "..", ".test-data-")),
    );
    await fs.rm(dir, { recursive: true, force: true });
  }
});
