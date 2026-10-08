const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { validateMessage, validateNick } = require("../server/chat");
test("moderação: texto mínimo, links, anexos, palavrões e variações", () => {
  assert.throws(() => validateMessage("Mensagem curta"));
  for (const text of [
    "Conheça este endereço https://example.com agora",
    "Veja o conteúdo em example.com para jogar melhor",
    "Meu endereço é usuario@example.com pessoal",
    "Visite example ponto com para obter informações",
    'Eu vou enviar uma imagem <img src="x"> para vocês',
    "Que p0rra de jogo foi aquele ontem à noite",
    "Esse jogo é uma m.e.r.d.a muito grande mesmo",
  ])
    assert.throws(() => validateMessage(text));
  assert.equal(
    validateMessage("Eu adoro jogos de aventura e corridas clássicas."),
    "Eu adoro jogos de aventura e corridas clássicas.",
  );
  assert.equal(validateNick("Player Azul"), "Player Azul");
  assert.throws(() => validateNick("Nick<script>"));
  assert.throws(() => validateNick("P0rra"));
});
test("chat: nick único, identidades do servidor, limites e histórico compartilhado", async () => {
  const dir = await fs.mkdtemp(
    path.resolve(__dirname, "..", ".test-data-chat-"),
  );
  process.env.RETRO_DATA_DIR = dir;
  const { server } = require("../server/server");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function req(route, method = "GET", data, cookie = "", origin = base) {
    const r = await fetch(base + route, {
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
  try {
    assert.equal((await req("/api/chat/messages")).status, 401);
    assert.equal((await req("/api/chat/session")).data.user, null);
    assert.equal(
      (
        await req(
          "/api/chat/join",
          "POST",
          { nick: "PlayerUm" },
          "",
          "https://evil.example",
        )
      ).status,
      403,
    );
    const a = await req("/api/chat/join", "POST", { nick: "PlayerUm" });
    assert.equal(a.status, 201);
    assert.match(a.data.user.color, /^#[a-f0-9]{6}$/i);
    assert.ok(a.cookie.includes("HttpOnly"));
    const ca = a.cookie.split(";")[0];
    assert.equal(
      (await req("/api/chat/join", "POST", { nick: "playerum" })).status,
      409,
    );
    const b = await req("/api/chat/join", "POST", { nick: "PlayerDois" }),
      cb = b.cookie.split(";")[0];
    assert.equal(b.status, 201);
    assert.equal(
      (await req("/api/chat/messages", "POST", { text: "curta" }, ca)).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/api/chat/messages",
          "POST",
          { text: "Veja este link https://example.com para baixar" },
          ca,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/api/chat/messages",
          "POST",
          {
            text: "Eu adoro jogos de aventura e corridas clássicas.",
            image: "arquivo",
          },
          ca,
        )
      ).status,
      400,
    );
    const msg = await req(
      "/api/chat/messages",
      "POST",
      { text: "Eu adoro jogos de aventura e corridas clássicas." },
      ca,
    );
    assert.equal(msg.status, 201);
    assert.equal(msg.data.message.nick, "PlayerUm");
    assert.equal(msg.data.message.color, a.data.user.color);
    assert.equal(
      (
        await req(
          "/api/chat/messages",
          "POST",
          { text: "Também gosto de jogar com meus amigos nas férias." },
          ca,
        )
      ).status,
      429,
    );
    const history = await req("/api/chat/messages", "GET", undefined, cb);
    assert.equal(history.status, 200);
    assert.equal(history.data.messages[0].nick, "PlayerUm");
    assert.equal(history.data.messages[0].user_id, a.data.user.id);
    const disk = JSON.parse(
      await fs.readFile(path.join(dir, "chat.txt"), "utf8"),
    );
    assert.equal(disk.length, 1);
    assert.equal(JSON.stringify(disk).includes("retro_chat="), false);
    assert.equal((await req("/api/chat/leave", "POST", {}, ca)).status, 200);
    assert.equal(
      (await req("/api/chat/messages", "GET", undefined, ca)).status,
      401,
    );
  } finally {
    await new Promise((r) => server.close(r));
    assert.ok(
      path
        .resolve(dir)
        .startsWith(path.resolve(__dirname, "..", ".test-data-chat-")),
    );
    await fs.rm(dir, { recursive: true, force: true });
  }
});
