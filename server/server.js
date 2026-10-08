const http = require("node:http"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const platforms = [
  "PlayStation 1",
  "PlayStation 2",
  "PSP",
  "Super Nintendo",
  "Nintendo 64",
  "Game Boy Advance",
  "Mega Drive",
  "Dreamcast",
  "GameCube",
  "Nintendo DS",
  "NES",
  "Outro",
];
const genres = [
  "Ação",
  "Aventura",
  "RPG",
  "Corrida",
  "Luta",
  "Esporte",
  "Puzzle",
  "Plataforma",
  "Estratégia",
  "Outro",
];
const base = path.resolve(__dirname, ".."),
  dataDir = process.env.RETRO_DATA_DIR || path.join(base, "dados"),
  catalogPath = path.join(dataDir, "catalogo.txt"),
  authPath = path.join(dataDir, "admin.txt");
const sessions = new Map(),
  attempts = new Map();
let queue = Promise.resolve();
async function read(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
async function atomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.copyFile(file, file + ".bak");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await fs.writeFile(file + ".tmp", JSON.stringify(value, null, 2), "utf8");
  await fs.rename(file + ".tmp", file);
}
function locked(fn) {
  const result = queue.catch(() => {}).then(fn);
  queue = result;
  return result;
}
async function catalog() {
  await queue.catch(() => {});
  return read(catalogPath, { revision: 0, games: [] });
}
function hash(pass, salt) {
  return crypto.scryptSync(pass, salt, 64).toString("hex");
}
function token(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("retro_session="))
    ?.slice(14);
}
function authorized(req) {
  const t = token(req),
    s = sessions.get(t);
  if (s && s.expires > Date.now()) return true;
  if (t) sessions.delete(t);
  return false;
}
function createSession(res) {
  for (const [key, s] of sessions)
    if (s.expires < Date.now()) sessions.delete(key);
  const t = crypto.randomBytes(32).toString("hex");
  sessions.set(t, { expires: Date.now() + 8 * 3600000 });
  res.setHeader(
    "Set-Cookie",
    `retro_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
  );
}
function webUrl(value) {
  if (!value) return "";
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    value.length > 2000
  )
    throw Error("Use um link HTTPS válido.");
  return u.href;
}
function game(input, id, old) {
  const str = (key, max, required = false) => {
    if (typeof input[key] !== "string") throw Error("Campo inválido: " + key);
    const v = input[key].trim();
    if (v.length > max || (required && !v))
      throw Error("Preencha corretamente: " + key);
    return v;
  };
  const title = str("title", 100, true),
    platform = str("platform", 50, true),
    genre = str("genre", 40, true);
  if (!platforms.includes(platform) || !genres.includes(genre))
    throw Error("Console ou gênero inválido.");
  let year = Number(input.year);
  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > new Date().getFullYear() + 1
  )
    throw Error("Ano inválido.");
  const link = webUrl(str("link", 2000));
  if (input.published && !link)
    throw Error("Adicione um link de download para publicar.");
  const cover = str("cover", 2000);
  if (cover && !/^\/covers\/[a-f0-9-]+\.(png|jpg|webp)$/.test(cover))
    webUrl(cover);
  if (
    typeof input.published !== "boolean" ||
    typeof input.featured !== "boolean"
  )
    throw Error("Status inválido.");
  return {
    id,
    title,
    platform,
    genre,
    year,
    region: str("region", 30),
    language: str("language", 40),
    size: str("size", 30),
    format: str("format", 20),
    description: str("description", 5000),
    link,
    cover,
    published: input.published,
    featured: input.featured,
    createdAt: old?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
async function body(req) {
  let chunks = [],
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 4500000) {
      const e = Error("Arquivo muito grande.");
      e.status = 413;
      throw e;
    }
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const e = Error("Dados inválidos.");
    e.status = 400;
    throw e;
  }
}
const server = http.createServer(async (req, res) => {
  const send = (status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  );
  try {
    const url = new URL(req.url, "http://localhost"),
      route = url.pathname;
    if (route.startsWith("/api/")) {
      if (!["GET", "POST", "PUT", "DELETE"].includes(req.method))
        return send(405, { error: "Método não permitido." });
      if (
        req.method !== "GET" &&
        (!req.headers.origin ||
          req.headers.origin !== `http://${req.headers.host}`)
      )
        return send(403, { error: "Origem não autorizada." });
      if (route === "/api/catalog" && req.method === "GET") {
        const c = await catalog();
        return send(200, {
          revision: c.revision,
          games: c.games.filter((g) => g.published),
          platforms,
          genres,
        });
      }
      if (route === "/api/status" && req.method === "GET")
        return send(200, {
          configured: !!(await read(authPath, null)),
          authenticated: authorized(req),
        });
      if (route === "/api/setup" && req.method === "POST") {
        if (
          !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
            req.socket.remoteAddress,
          )
        )
          return send(403, { error: "Configure o admin neste PC." });
        const b = await body(req);
        if (
          typeof b.password !== "string" ||
          b.password.length < 10 ||
          b.password.length > 128
        )
          return send(400, {
            error: "A senha precisa ter de 10 a 128 caracteres.",
          });
        const created = await locked(async () => {
          if (await read(authPath, null)) return false;
          const salt = crypto.randomBytes(16).toString("hex");
          await atomic(authPath, { salt, hash: hash(b.password, salt) });
          return true;
        });
        if (!created)
          return send(409, { error: "Administrador já configurado." });
        createSession(res);
        return send(201, { ok: true });
      }
      if (route === "/api/login" && req.method === "POST") {
        const address = req.socket.remoteAddress;
        let a = attempts.get(address);
        if (!a || a.until < Date.now()) {
          a = { count: 0, until: Date.now() + 15 * 60000 };
          attempts.set(address, a);
        }
        if (a.count >= 8)
          return send(429, { error: "Muitas tentativas. Aguarde 15 minutos." });
        const b = await body(req),
          credentials = await read(authPath, null);
        if (!credentials) return send(409, { error: "Crie a senha primeiro." });
        if (typeof b.password !== "string" || b.password.length > 128)
          return send(400, { error: "Senha inválida." });
        a.count++;
        const actual = Buffer.from(hash(b.password, credentials.salt), "hex"),
          expected = Buffer.from(credentials.hash, "hex");
        if (!crypto.timingSafeEqual(actual, expected))
          return send(401, { error: "Senha incorreta." });
        attempts.delete(address);
        createSession(res);
        return send(200, { ok: true });
      }
      if (!authorized(req))
        return send(401, { error: "Entre no painel para continuar." });
      if (route === "/api/logout" && req.method === "POST") {
        sessions.delete(token(req));
        res.setHeader(
          "Set-Cookie",
          "retro_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return send(200, { ok: true });
      }
      if (route === "/api/admin/catalog" && req.method === "GET") {
        const c = await catalog();
        return send(200, { ...c, platforms, genres });
      }
      if (route === "/api/password" && req.method === "PUT") {
        const b = await body(req),
          c = await read(authPath, null);
        if (
          typeof b.current !== "string" ||
          b.current.length > 128 ||
          !crypto.timingSafeEqual(
            Buffer.from(hash(b.current, c.salt), "hex"),
            Buffer.from(c.hash, "hex"),
          )
        )
          return send(400, { error: "Senha atual incorreta." });
        if (
          typeof b.password !== "string" ||
          b.password.length < 10 ||
          b.password.length > 128
        )
          return send(400, {
            error: "A nova senha deve ter de 10 a 128 caracteres.",
          });
        const salt = crypto.randomBytes(16).toString("hex");
        await locked(() =>
          atomic(authPath, { salt, hash: hash(b.password, salt) }),
        );
        sessions.clear();
        createSession(res);
        return send(200, { ok: true });
      }
      if (route === "/api/covers" && req.method === "POST") {
        const b = await body(req);
        if (typeof b.data !== "string")
          return send(400, { error: "Imagem inválida." });
        const match =
          /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.data);
        if (!match) return send(400, { error: "Use PNG, JPG ou WebP." });
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.length > 3000000)
          return send(413, { error: "A capa deve ter até 3 MB." });
        const type = match[1];
        const ok =
          type === "png"
            ? buffer
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : type === "jpeg"
              ? buffer[0] === 255 && buffer[1] === 216
              : buffer.toString("ascii", 0, 4) === "RIFF" &&
                buffer.toString("ascii", 8, 12) === "WEBP";
        if (!ok)
          return send(400, {
            error: "Formato da imagem não corresponde ao arquivo.",
          });
        const file =
          crypto.randomUUID() + "." + (type === "jpeg" ? "jpg" : type);
        await fs.mkdir(path.join(dataDir, "covers"), { recursive: true });
        await fs.writeFile(path.join(dataDir, "covers", file), buffer);
        return send(201, { url: "/covers/" + file });
      }
      const match = /^\/api\/games\/([a-f0-9-]+)$/.exec(route);
      if (
        (route === "/api/games" && req.method === "POST") ||
        (match && ["PUT", "DELETE"].includes(req.method))
      ) {
        const b = await body(req);
        let result;
        await locked(async () => {
          const c = await read(catalogPath, { revision: 0, games: [] });
          if (b.revision !== c.revision) {
            const e = Error(
              "O catálogo mudou em outra aba. Atualize o painel e tente novamente.",
            );
            e.status = 409;
            throw e;
          }
          const id = match?.[1] || crypto.randomUUID(),
            idx = c.games.findIndex((g) => g.id === id);
          if (match && idx < 0) {
            const e = Error("Jogo não encontrado.");
            e.status = 404;
            throw e;
          }
          if (req.method === "DELETE") c.games.splice(idx, 1);
          else {
            let g;
            try {
              g = game(b.game, id, c.games[idx]);
            } catch (e) {
              e.status = 400;
              throw e;
            }
            if (idx < 0) c.games.unshift(g);
            else c.games[idx] = g;
          }
          c.revision++;
          await atomic(catalogPath, c);
          result = c;
        });
        return send(200, result);
      }
      return send(404, { error: "Rota não encontrada." });
    }
    if (req.method !== "GET")
      return send(405, { error: "Método não permitido." });
    let target;
    if (/^\/covers\/[a-f0-9-]+\.(jpg|png|webp)$/.test(route))
      target = path.join(dataDir, route);
    else {
      const mapped =
        route === "/admin" || route === "/admin/"
          ? "/admin.html"
          : route === "/"
            ? "/index.html"
            : route;
      target = path.resolve(base, "public", "." + decodeURIComponent(mapped));
      if (!target.startsWith(path.join(base, "public") + path.sep))
        return send(403, { error: "Acesso negado." });
    }
    const buffer = await fs.readFile(target),
      type =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
        }[path.extname(target)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(buffer);
  } catch (e) {
    send(e.status || (e.code === "ENOENT" ? 404 : 500), {
      error: e.status
        ? e.message
        : e.code === "ENOENT"
          ? "Não encontrado."
          : "Não foi possível acessar os dados. Verifique as permissões e os arquivos.",
    });
  }
});
module.exports = { server, game };
