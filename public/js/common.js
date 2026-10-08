const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const coverUrl = (g) => {
  if (/^\/covers\/[a-f0-9-]+\.(png|jpg|webp)$/.test(g.cover || ""))
    return g.cover;
  try {
    if (new URL(g.cover).protocol === "https:") return g.cover;
  } catch {}
  return g.demoCover || "/assets/cover-default.svg";
};
async function api(route, options = {}) {
  const r = await fetch(route, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await r.json();
  if (!r.ok) {
    const e = Error(data.error || "Não foi possível completar a ação.");
    e.status = r.status;
    throw e;
  }
  return data;
}
function message(id, text) {
  $(id).textContent = text;
  $(id).hidden = !text;
}
function fallbackImages() {
  document.querySelectorAll("img").forEach((img) => {
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/cover-default.svg";
    };
  });
}
function driveDownload(link) {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:") return "";
    if (u.hostname === "drive.google.com") {
      const id =
        u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ||
        u.searchParams.get("id");
      if (id && /^[A-Za-z0-9_-]+$/.test(id)) {
        const out = new URL("https://drive.google.com/uc");
        out.searchParams.set("export", "download");
        out.searchParams.set("id", id);
        const key = u.searchParams.get("resourcekey");
        if (key) out.searchParams.set("resourcekey", key);
        return out.href;
      }
    }
    return u.href;
  } catch {
    return "";
  }
}
