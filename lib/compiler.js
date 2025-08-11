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
          "You are a code generator. Output only raw HTML/CSS/JS for a website component. Nothing else. Do not include explanations, markdown formatting, or any other text. Just pure HTML/CSS/JS code.",
      },
      { role: "user", content: prompt },
    ],
  });

  let code = res.choices[0].message.content;
  
  // Strip any HTML tags that might have been generated as text
  // This prevents things like <html> tags from appearing in the output
  code = code.replace(/<html[^>]*>|<\/html>|<head[^>]*>|<\/head>|<body[^>]*>|<\/body>/gi, '');
  
  // Remove any markdown code blocks if they exist
  code = code.replace(/```html\s*|\s*```/g, '');
  code = code.replace(/```\s*|\s*```/g, '');
  
  // Trim whitespace
  code = code.trim();
  
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
  const model = config.model || "gpt-4.1-nano";
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
  const pages = [];
  while ((match = pageRegex.exec(src))) {
    const [, pageName, body] = match;
    // Store using a consistent key so we don't lose the page name later
    pages.push({ pageName, body });
  }

  console.log(`📝 Found ${Object.keys(components).length} components and ${pages.length} pages`);

  // Ensure output directory exists and clear out stale HTML files so deletions reflect
  const distDir = "dist";
  fs.mkdirSync(distDir, { recursive: true });
  try {
    for (const fileName of fs.readdirSync(distDir)) {
      if (fileName.toLowerCase().endsWith(".html")) {
        fs.unlinkSync(path.join(distDir, fileName));
      }
    }
  } catch (_) {
    // Best-effort cleanup; continue on error
  }

  for (const page of pages) {
    const { pageName, body } = page;
    console.log(`🔨 Building page: ${pageName}`);
    
    const parts = body
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let resolved = {};
    const htmlParts = [];
    
    for (const part of parts) {
      // Check if this is a component reference or raw text
      if (components[part]) {
        // It's a component reference
        htmlParts.push(await resolveComponent(part, components, model, resolved));
      } else if (part.startsWith('"') && part.endsWith('"')) {
        // It's raw text that should be converted to a component
        const textContent = part.slice(1, -1); // Remove quotes
        console.log(`📝 Converting text to component: "${textContent}"`);
        const tempComponent = await getComponentCode(textContent, model);
        htmlParts.push(tempComponent);
      } else {
        // It's a component reference without quotes
        htmlParts.push(await resolveComponent(part, components, model, resolved));
      }
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
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, `${pageName}.html`), html);
    console.log(`✅ Built dist/${pageName}.html`);
  }
}