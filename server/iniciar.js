const { server } = require("./server"),
  { execFile } = require("node:child_process");
let port = 4320;
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < 4340) {
    port++;
    server.listen(port, "127.0.0.1");
    return;
  }
  console.error("Nao foi possivel iniciar:", e.message);
  process.exitCode = 1;
});
server.once("listening", async () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  console.log(
    "\nRETROVAULT\nCliente: " +
      url +
      "\nAdmin: " +
      url +
      "/admin\n\nMantenha esta janela aberta. Ctrl+C encerra o servidor.",
  );
  try {
    const r = await fetch(url);
    if (!r.ok) throw Error("HTTP " + r.status);
    console.log("Pagina verificada: OK");
    if (process.env.RETRO_NO_BROWSER !== "1")
      execFile(
        "cmd.exe",
        ["/d", "/c", "start", "", url],
        { windowsHide: true },
        (e) => {
          if (e) console.log("Abra o endereco acima manualmente.");
        },
      );
  } catch (e) {
    console.error("Falha na verificacao:", e.message);
  }
});
server.listen(port, "127.0.0.1");
