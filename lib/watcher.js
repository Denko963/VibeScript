import chokidar from "chokidar";
import { compileVibeScript } from "./compiler.js";
import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";

export async function watchVibeScript(file, config = {}) {
  console.log("👀 Watching for changes with live reload...");
  console.log("🔨 Building initial pages...");

  // Start dev server
  const app = express();
  const distPath = path.resolve("dist");

  // Ensure 'dist' directory exists before serving static files or reading from it
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  // Serve static files from 'dist'
  app.use(express.static(distPath));

  // Handle the root path ("/") to serve a default HTML file
  app.get("/", (req, res) => {
    // Get all HTML files in the dist directory
    const htmlFiles = fs
      .readdirSync(distPath)
      .filter((f) => f.endsWith(".html"));

    let targetFile = null;

    // Prioritize 'index.html' if it exists
    if (htmlFiles.includes("index.html")) {
      targetFile = "index.html";
    } else if (htmlFiles.length > 0) {
      // Otherwise, pick the first HTML file found in the directory
      targetFile = htmlFiles[0];
    }

    if (targetFile) {
      console.log(`Serving default page: ${targetFile}`);
      res.sendFile(path.join(distPath, targetFile));
    } else {
      // If no HTML files are found, send a helpful message
      res.status(404).send(
        "<h1>No HTML pages found in 'dist' directory.</h1>" +
          "<p>Please ensure your VibeScript file generates at least one page.</p>"
      );
    }
  });

  const port = Number(config.port || 3000);
  let server;
  let wss;

  // WebSocket for reload events
  function broadcast(msg) {
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(msg);
        }
      });
    }
  }

  // Inject live reload script into HTML files
  function injectLiveReload() {
    const script = `
      <script id="vibe-live-reload">
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
        const filePath = path.join(distPath, file);
        let html = fs.readFileSync(filePath, "utf8");
        // Only inject the script if it's not already present in the HTML
        if (!html.includes('id="vibe-live-reload"')) {
          html = html.replace("</body>", `${script}</body>`);
          fs.writeFileSync(filePath, html);
        }
      }
    });
  }

  // Initial build - do this BEFORE starting the server
  try {
    await compileVibeScript(file, config);
    console.log("✅ Initial build complete!");
    
    // Now start the server after build is done
    server = app.listen(port, () => {
      console.log(`🌐 Dev server running at http://localhost:${port}`);
      console.log("🚀 Ready for development! Open the link above in your browser.");
    });

    // Initialize WebSocket after server is running
    wss = new WebSocketServer({ server });
    
    // Inject live reload and notify clients
    injectLiveReload();
    broadcast("done");
    
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    process.exit(1);
  }

  // Watch for changes
  chokidar.watch(file).on("change", async () => {
    console.log("♻️ File changed, rebuilding...");
    broadcast("building");
    try {
      await compileVibeScript(file, config);
      console.log("✅ Rebuild complete!");
      injectLiveReload(); // Re-inject live reload script if files were re-generated
      broadcast("done");
      broadcast("reload");
    } catch (error) {
      console.error("❌ Rebuild failed:", error.message);
      broadcast("done"); // Remove building overlay even on failure
    }
  });
}