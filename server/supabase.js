// Somente o servidor acessa o Supabase. A chave secreta nunca vai ao navegador.
function createSupabaseStore({ url, key, fetchImpl = fetch }) {
  const base = new URL(url);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.pathname !== "/"
  )
    throw Error("SUPABASE_URL deve ser a URL HTTPS do projeto.");
  if (!key?.startsWith("sb_secret_"))
    throw Error(
      "Configure SUPABASE_SECRET_KEY com uma secret key do Supabase.",
    );
  const headers = { apikey: key };
  async function request(route, options = {}) {
    let response;
    try {
      response = await fetchImpl(base.origin + route, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw Error("Supabase indisponível. Verifique a conexão do serviço.");
    }
    if (!response.ok)
      throw Error(
        `Falha no Supabase (HTTP ${response.status}). Verifique a configuração e o SQL inicial.`,
      );
    return response;
  }
  return {
    async read(key, fallback) {
      const query = new URLSearchParams({ key: "eq." + key, select: "value" });
      const data = await (
        await request("/rest/v1/retrovault_state?" + query)
      ).json();
      if (!Array.isArray(data)) throw Error("Resposta inesperada do Supabase.");
      return data.length ? data[0].value : fallback;
    },
    async write(key, value) {
      await request("/rest/v1/retrovault_state?on_conflict=key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ key, value }),
      });
    },
    async uploadCover(name, buffer, type) {
      await request(
        "/storage/v1/object/retrovault-covers/" + encodeURIComponent(name),
        {
          method: "POST",
          headers: {
            "Content-Type": type,
            "x-upsert": "false",
            "cache-control": "3600",
          },
          body: buffer,
        },
      );
      return (
        base.origin +
        "/storage/v1/object/public/retrovault-covers/" +
        encodeURIComponent(name)
      );
    },
  };
}
function configuredStore(env = process.env) {
  if (!env.SUPABASE_URL && !env.SUPABASE_SECRET_KEY) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
    throw Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY juntas.");
  return createSupabaseStore({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SECRET_KEY,
  });
}
module.exports = { createSupabaseStore, configuredStore };
