// Entrada Linux/Render: não abre navegador e não escreve dados no disco temporário.
process.env.NODE_ENV = "production";
const { configuredStore } = require("./supabase");
async function main() {
  if (!configuredStore())
    throw Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY no Render.");
  const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (!publicUrl || new URL(publicUrl).protocol !== "https:")
    throw Error(
      "Configure PUBLIC_URL com o endereço HTTPS do site. No Render, RENDER_EXTERNAL_URL é automático.",
    );
  const { server, initializeAdmin } = require("./server");
  await initializeAdmin();
  const port = Number(process.env.PORT || 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("PORT inválida.");
  server.on("error", () => {
    console.error("Não foi possível iniciar o servidor. Verifique a porta.");
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () =>
    console.log("RetroVaultPS2 online · dados no Supabase"),
  );
  let closing = false;
  const stop = () => {
    if (closing) return;
    closing = true;
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
