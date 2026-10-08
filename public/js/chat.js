(() => {
  const el = (id) => document.getElementById(id),
    panel = el("chat-panel");
  let user = null,
    poll = null,
    loading = false,
    joined = false,
    lastIds = "",
    sending = false;
  const notice = (text) => {
    el("chat-notice").textContent = text;
    el("chat-notice").hidden = !text;
  };
  function showUser() {
    el("chat-join").hidden = !!user;
    el("chat-room").hidden = !user;
    el("chat-leave").hidden = !user;
    if (user) {
      el("chat-user").textContent = user.nick;
      el("chat-user").style.color = user.color;
      el("chat-user").style.fontWeight = "700";
    }
  }
  function stop() {
    if (poll) clearInterval(poll);
    poll = null;
  }
  function start() {
    stop();
    poll = setInterval(() => {
      if (!document.hidden && !panel.hidden && user) load();
    }, 5000);
  }
  async function load() {
    if (loading || !user) return;
    loading = true;
    try {
      const data = await api("/api/chat/messages");
      const ids = data.messages.map((m) => m.id).join(",");
      if (ids !== lastIds || !joined) {
        const list = el("chat-messages"),
          nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
        list.replaceChildren();
        for (const m of data.messages) {
          const row = document.createElement("article"),
            head = document.createElement("div"),
            nick = document.createElement("strong"),
            time = document.createElement("time"),
            text = document.createElement("p");
          row.className = "chat-message";
          nick.textContent = m.nick;
          nick.style.color = /^#[a-f0-9]{6}$/i.test(m.color)
            ? m.color
            : "var(--cream)";
          time.textContent = new Date(m.created_at).toLocaleTimeString(
            "pt-BR",
            { hour: "2-digit", minute: "2-digit" },
          );
          time.dateTime = m.created_at;
          text.textContent = m.text;
          head.append(nick, time);
          row.append(head, text);
          list.append(row);
        }
        if (!data.messages.length) {
          const empty = document.createElement("p");
          empty.className = "chat-empty";
          empty.textContent =
            "A conversa começa com você. Qual jogo marcou sua história?";
          list.append(empty);
        }
        if (nearEnd || !joined) list.scrollTop = list.scrollHeight;
        lastIds = ids;
        joined = true;
      }
      notice("");
    } catch (e) {
      notice(e.message);
      if (e.status === 401) {
        user = null;
        showUser();
        stop();
      }
    } finally {
      loading = false;
    }
  }
  async function open() {
    panel.hidden = false;
    el("chat-toggle").setAttribute("aria-expanded", "true");
    el("chat-close").focus();
    try {
      user = (await api("/api/chat/session")).user;
      showUser();
      if (user) {
        joined = false;
        await load();
        start();
      } else el("chat-nick").focus();
    } catch (e) {
      notice(e.message);
    }
  }
  function close() {
    panel.hidden = true;
    el("chat-toggle").setAttribute("aria-expanded", "false");
    stop();
    el("chat-toggle").focus();
  }
  el("chat-toggle").onclick = () => (panel.hidden ? open() : close());
  el("chat-close").onclick = close;
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  el("chat-join").onsubmit = async (e) => {
    e.preventDefault();
    el("chat-enter").disabled = true;
    try {
      user = (
        await api("/api/chat/join", {
          method: "POST",
          body: JSON.stringify({ nick: el("chat-nick").value }),
        })
      ).user;
      showUser();
      joined = false;
      await load();
      start();
      el("chat-text").focus();
    } catch (e) {
      notice(e.message);
    } finally {
      el("chat-enter").disabled = false;
    }
  };
  const count = () => {
    const n = [...el("chat-text").value.trim().replace(/\s+/g, " ")].length;
    el("chat-counter").textContent = `${n}/500 · mínimo 25`;
    el("chat-send").disabled = sending || n < 25 || n > 500;
  };
  el("chat-text").oninput = count;
  el("chat-compose").onsubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    sending = true;
    count();
    try {
      await api("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ text: el("chat-text").value }),
      });
      el("chat-text").value = "";
      joined = false;
      await load();
    } catch (e) {
      notice(e.message);
      if (e.status === 401) {
        user = null;
        showUser();
        stop();
      }
    } finally {
      sending = false;
      count();
    }
  };
  el("chat-leave").onclick = async () => {
    try {
      await api("/api/chat/leave", { method: "POST", body: "{}" });
      user = null;
      joined = false;
      lastIds = "";
      stop();
      showUser();
      notice("");
      el("chat-nick").focus();
    } catch (e) {
      notice(e.message);
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!panel.hidden && user) {
      load();
      start();
    }
  });
  count();
})();
