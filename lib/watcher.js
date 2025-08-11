import chokidar from "chokidar";
import { compileVibeScript } from "./compiler.js";
import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";

export async function watchVibeScript(file, config = {}) {
  console.log("👀 Watching for changes with live reload...");

  // Start dev server
  const app = express();
  const distPath = path.resolve("dist");
  app.use(express.static(distPath));

  const port = Number(config.port || 3000);
  const server = app.listen(port, () => {
    console.log(`🌐 Dev server running at http://localhost:${port}`);
  });

  // WebSocket for reload events
  const wss = new WebSocketServer({ server });
  function broadcast(msg) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  }

  // Inject live reload script into HTML files
  function injectLiveReload() {
    const script = `
      <script>
        const ws = new WebSocket("ws://" + location.host);
        ws.onmessage = (event) => {
          if (event.data === "reload") {
            location.reload();
          }
          if (event.data === "building") {
            const overlay = document.createElement("div");
            overlay.id = "vibe-overlay";
            overlay.style.position = "fixed";
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.background = "rgba(0,0,0,0.7)";
            overlay.style.color = "white";
            overlay.style.fontSize = "2rem";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.innerText = "✨ Building vibes...";
            document.body.appendChild(overlay);
          }
          if (event.data === "done") {
            const overlay = document.getElementById("vibe-overlay");
            if (overlay) overlay.remove();
          }
        };
      </script>
    `;

    fs.readdirSync(distPath).forEach((file) => {
      if (file.endsWith(".html")) {
        let html = fs.readFileSync(path.join(distPath, file), "utf8");
        if (!html.includes("vibe-overlay")) {
          html = html.replace("</body>", `${script}</body>`);
          fs.writeFileSync(path.join(distPath, file), html);
        }
      }
    });
  }

  // Initial build
  broadcast("building");
  await compileVibeScript(file, config);
  injectLiveReload();
  broadcast("done");

  // Watch for changes
  chokidar.watch(file).on("change", async () => {
    console.log("♻️ File changed, rebuilding...");
    broadcast("building");
    await compileVibeScript(file, config);
    injectLiveReload();
    broadcast("done");
    broadcast("reload");
  });
}