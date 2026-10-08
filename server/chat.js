const crypto = require("node:crypto"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const colors = [
  "#ffb38c",
  "#8edca9",
  "#8acfff",
  "#d9b2ff",
  "#ffd980",
  "#ffabbc",
  "#9ce5de",
];
// Lista editável. A validação ocorre no servidor, inclusive para nicks.
const forbidden = [
  "puta",
  "puto",
  "porra",
  "caralho",
  "merda",
  "foda",
  "foder",
  "fodase",
  "fdp",
  "pqp",
  "buceta",
  "cuzao",
  "arrombado",
  "viado",
];
function fold(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(
      /[430157$@]/g,
      (c) =>
        ({ 4: "a", 3: "e", 0: "o", 1: "i", 5: "s", 7: "t", $: "s", "@": "a" })[
          c
        ],
    );
}
function prohibited(text) {
  const normalized = fold(text);
  return forbidden.some((word) =>
    new RegExp(
      "(^|[^a-z])" + [...word].join("[\\s._*\\-]*") + "(?=$|[^a-z])",
    ).test(normalized),
  );
}
function links(text) {
  return (
    /(?:https?|ftp|file|data|javascript)\s*:|\bwww\b|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\b|\b\d{1,3}(?:\.\d{1,3}){3}\b|[^\s@]+@[^\s@]+|\[[^\]]*\]\s*\(|<\/?[a-z][^>]*>/i.test(
      text,
    ) ||
    /\b[a-z0-9-]+\s*(?:\[\.\]|\(\.\)|\.|\bponto\b)\s*(?:com|net|org|br|io|gg)\b/i.test(
      text,
    )
  );
}
function clean(value) {
  if (typeof value !== "string") throw invalid("Use apenas texto.");
  return value
    .normalize("NFKC")
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}
function invalid(message, status = 400) {
  const error = Error(message);
  error.status = status;
  return error;
}
function validateMessage(value) {
  const text = clean(value);
  if ([...text].length < 25 || [...text].length > 500)
    throw invalid("A mensagem deve ter de 25 a 500 caracteres.");
  if (links(text))
    throw invalid("Links, e-mails, imagens e marcação não são permitidos.");
  if (prohibited(text))
    throw invalid(
      "Sua mensagem contém uma expressão não permitida. Revise o texto.",
    );
  return text;
}
function validateNick(value) {
  const nick = clean(value);
  if (
    [...nick].length < 3 ||
    [...nick].length > 20 ||
    !/^[\p{L}\p{N} _-]+$/u.test(nick)
  )
    throw invalid(
      "Use um nick de 3 a 20 caracteres: letras, números, espaço, _ ou -.",
    );
  if (prohibited(nick) || links(nick)) throw invalid("Escolha outro nick.");
  return nick;
}
function createChat({ cloud, dataDir, production, body, send }) {
  const participants = new Map(),
    joins = new Map(),
    sessionAge = 2 * 3600000,
    historyAge = 24 * 3600000;
  let queue = Promise.resolve(),
    cache = null,
    cacheUntil = 0;
  const file = path.join(dataDir, "chat.txt");
  const cookie = (token, age) =>
    `retro_chat=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production ? "; Secure" : ""}`;
  function get(req) {
    const token = (req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("retro_chat="))
        ?.slice(11),
      person = participants.get(token);
    if (person && person.expires > Date.now()) return { token, person };
    if (token) participants.delete(token);
    return null;
  }
  function prune() {
    for (const [key, p] of participants)
      if (p.expires < Date.now()) participants.delete(key);
    for (const [key, j] of joins) if (j.until < Date.now()) joins.delete(key);
  }
  const publicPerson = (p) => ({ id: p.id, nick: p.nick, color: p.color });
  async function history() {
    if (cache && cacheUntil > Date.now()) return cache;
    let messages;
    if (cloud) messages = await cloud.chatMessages();
    else {
      try {
        messages = JSON.parse(await fs.readFile(file, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
        messages = [];
      }
    }
    cache = messages
      .filter((m) => Date.parse(m.created_at) > Date.now() - historyAge)
      .slice(-60);
    cacheUntil = Date.now() + 3000;
    return cache;
  }
  async function write(message) {
    if (cloud) {
      await cloud.chatInsert(message);
    } else {
      const list = [...(await history()), message].slice(-60);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(file + ".tmp", JSON.stringify(list, null, 2), "utf8");
      await fs.rename(file + ".tmp", file);
    }
    cache = null;
    cacheUntil = 0;
  }
  return async (req, res, route) => {
    if (route === "/api/chat/session" && req.method === "GET") {
      const p = get(req);
      return send(res, 200, { user: p ? publicPerson(p.person) : null });
    }
    if (route === "/api/chat/join" && req.method === "POST") {
      prune();
      const existing = get(req);
      if (existing)
        return send(res, 200, { user: publicPerson(existing.person) });
      const address = req.socket.remoteAddress;
      let bucket = joins.get(address);
      if (!bucket) {
        bucket = { count: 0, until: Date.now() + 15 * 60000 };
        joins.set(address, bucket);
      }
      if (++bucket.count > 20)
        throw invalid("Muitas entradas. Aguarde 15 minutos.", 429);
      const nick = validateNick((await body(req))?.nick);
      if ([...participants.values()].some((p) => fold(p.nick) === fold(nick)))
        throw invalid("Esse nick está em uso. Escolha outro.", 409);
      if (participants.size >= 500)
        throw invalid("A sala está cheia. Tente mais tarde.", 429);
      const token = crypto.randomBytes(32).toString("hex"),
        person = {
          id: crypto.randomUUID(),
          nick,
          color: colors[crypto.randomInt(colors.length)],
          expires: Date.now() + sessionAge,
          lastSent: 0,
          lastText: "",
        };
      participants.set(token, person);
      res.setHeader("Set-Cookie", cookie(token, 7200));
      return send(res, 201, { user: publicPerson(person) });
    }
    const participant = get(req);
    if (!participant)
      throw invalid("Escolha um nick para entrar no chat.", 401);
    if (route === "/api/chat/messages" && req.method === "GET")
      return send(res, 200, { messages: await history() });
    if (route === "/api/chat/leave" && req.method === "POST") {
      participants.delete(participant.token);
      res.setHeader("Set-Cookie", cookie("", 0));
      return send(res, 200, { ok: true });
    }
    if (route === "/api/chat/messages" && req.method === "POST") {
      const b = await body(req);
      if (!b || typeof b !== "object" || Array.isArray(b))
        throw invalid("Use uma mensagem de texto válida.");
      if (Object.keys(b).some((k) => k !== "text"))
        throw invalid("O chat aceita somente o campo de mensagem de texto.");
      const text = validateMessage(b.text),
        p = participant.person;
      if (Date.now() - p.lastSent < 5000)
        throw invalid("Aguarde 5 segundos entre mensagens.", 429);
      if (p.lastText === text)
        throw invalid("Evite repetir a mesma mensagem.", 429);
      const previousTime = p.lastSent,
        previousText = p.lastText;
      p.lastSent = Date.now();
      p.lastText = text;
      const message = {
        id: crypto.randomUUID(),
        user_id: p.id,
        nick: p.nick,
        color: p.color,
        text,
        created_at: new Date().toISOString(),
      };
      const result = queue.catch(() => {}).then(() => write(message));
      queue = result;
      try {
        await result;
      } catch (e) {
        if (p.lastText === text) {
          p.lastSent = previousTime;
          p.lastText = previousText;
        }
        throw e;
      }
      return send(res, 201, { message });
    }
    throw invalid("Rota não encontrada.", 404);
  };
}
module.exports = { createChat, validateMessage, validateNick };
