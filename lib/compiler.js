import fs from "fs";
import path from "path";
import crypto from "crypto";
const cacheFile = ".vibecache.json";
let cache = {};
if (fs.existsSync(cacheFile)) {
  try {
    const raw = fs.readFileSync(cacheFile, "utf8").trim();
    cache = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("⚠️  Failed to parse .vibecache.json, starting with empty cache.");
    cache = {};
  }
}

function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

async function getOpenAIClient() {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function getComponentCode(prompt, model) {
  const hash = hashPrompt(prompt + model);
  if (cache[hash]) {
    console.log(`✅ Using cached component for: "${prompt}" [${model}]`);
    return cache[hash];
  }

  console.log(`✨ Generating component for: "${prompt}" using ${model}`);
  const openai = await getOpenAIClient();
  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a code generator. Output only raw HTML/CSS/JS for a website component. Nothing else. Do not include explanations.",
      },
      { role: "user", content: prompt },
    ],
  });

  const code = res.choices[0].message.content;
  cache[hash] = code;
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  return code;
}

/**
 * Recursively resolve a component's HTML by:
 * 1. Generating its code from the prompt
 * 2. Detecting any subcomponent placeholders
 * 3. Replacing them with their generated HTML
 */
async function resolveComponent(name, components, model, resolved = {}) {
  if (resolved[name]) return resolved[name];

  if (!components[name]) {
    console.warn(`⚠️ Component "${name}" not found.`);
    return "";
  }

  let html = await getComponentCode(components[name], model);

  // Detect subcomponent references in the prompt text
  const subcomponentNames = Object.keys(components).filter(
    (comp) => comp !== name && html.includes(comp)
  );

  for (const subName of subcomponentNames) {
    const subHTML = await resolveComponent(subName, components, model, resolved);
    // Replace all occurrences of the subcomponent name with its HTML
    const regex = new RegExp(`\\b${subName}\\b`, "g");
    html = html.replace(regex, subHTML);
  }

  resolved[name] = html;
  return html;
}

export async function compileVibeScript(file, config = {}) {
  const model = config.model || "gpt-4o-mini";
  const src = fs.readFileSync(file, "utf8");

  // Parse components
  const componentRegex = /component\s+(\w+):\s+\"([\s\S]*?)\"/g;
  let components = {};
  let match;

  while ((match = componentRegex.exec(src))) {
    const [, name, prompt] = match;
    components[name] = prompt;
  }

  // Parse pages
  const pageRegex = /page\s+(\w+):([\s\S]*?)(?=page|$)/g;
  while ((match = pageRegex.exec(src))) {
    const [, pageName, body] = match;
    const parts = body
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let resolved = {};
    const htmlParts = [];
    for (const part of parts) {
      htmlParts.push(await resolveComponent(part, components, model, resolved));
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${pageName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        ${htmlParts.join("\n")}
      </body>
      </html>
    `;
    fs.mkdirSync("dist", { recursive: true });
    fs.writeFileSync(path.join("dist", `${pageName}.html`), html);
    console.log(`📄 Built dist/${pageName}.html`);
  }
}