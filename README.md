```
 _    ___ __        _____           _       __ 
| |  / (_) /_  ___ / ___/__________(_)___  / /_
| | / / / __ \/ _ \\__ \/ ___/ ___/ / __ \/ __/
| |/ / / /_/ /  __/__/ / /__/ /  / / /_/ / /_  
|___/_/_.___/\___/____/\___/_/  /_/ .___/\__/  
                                 /_/           
```

# 🌊 VibeScript

> **Code is dead. Vibes are forever.** 

VibeScript is the **world’s first prompt-driven, component-based, full-stack, AI-powered, vibe-oriented programming language**.

You don’t write code. You write *vibes*.  
VibeScript compiles your vibes into production-ready HTML/CSS/JS using an LLM, caches the results, and serves them like a normal website.  

It’s like React, but instead of JSX, you just say:

```
component Navbar:
    "A minimalistic navbar with a logo on the left and a glowing 'Sign Up' button on the right."
```

---

## ✨ Features

- **🧠 AI-Driven Compilation** – Your code is literally just English prompts. The AI does the rest.
- **📦 Component-Based** – Break your vibes into reusable components.
- **🔄 Recursive Nesting** – Components can contain other components, infinitely deep.
- **⚡ Hot Reload** – Save your `.vibe` file, and your browser updates instantly.
- **🎭 Build Overlay** – Shows a “✨ Building vibes…” overlay while the AI thinks.
- **🚀 One-Command Deploy** – Deploy to Vercel with `--deploy`.
- **🛡️ Prompt Caching** – Change one component without regenerating the whole site.
- **🧘 Zero Learning Curve** – If you can describe it, you can ship it.
- **🧠 Model Selection** – Choose your OpenAI LLM for generation.
- **⚙️ Config File Support** – Set defaults in `vibe.config.json`.

---

## 📦 Installation

```bash
npm install -g vibescript
```

You’ll also need an **OpenAI API key**:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

---

## 🛠 Usage

### Create a `.vibe` file

```vibescript
component NavButton:
    "A glowing button that says 'Sign Up' in TailwindCSS."

component Navbar:
    "A minimalistic navbar with a logo on the left and the NavButton on the right."

component HeroSection:
    "Big bold headline saying 'Welcome to the Vibe'. Background is a gradient from pink to purple. Add a call-to-action button."

page HomePage:
    Navbar
    HeroSection
```

---

### Build Once

```bash
vibe App.vibe
```

Outputs HTML to `dist/`.

---

### Hot Reload (Dev Mode)

```bash
vibe App.vibe --watch
```

- Starts a dev server at `http://localhost:3000`
- Injects a live reload script into your HTML
- Shows a **"✨ Building vibes..."** overlay while the AI generates
- Reloads automatically when done

---

### Deploy to Vercel

```bash
vibe App.vibe --deploy
```

This will:
1. Build your vibes
2. Deploy `dist/` to Vercel
3. Make you feel like a 10x developer

---

## 🧩 Nested Components

VibeScript supports **recursive nesting**.  
Example:

```vibescript
component Icon:
    "A small SVG star icon."

component NavButton:
    "A glowing button that says 'Sign Up' with the Icon inside."

component Navbar:
    "A minimalistic navbar with a logo on the left and the NavButton on the right."

page HomePage:
    Navbar
```

The compiler will:
- Generate `Icon`
- Inject it into `NavButton`
- Inject `NavButton` into `Navbar`
- Inject `Navbar` into your page
- Ship it

---

## 🧠 Choosing Your OpenAI Model

VibeScript lets you choose which OpenAI LLM to use for generating your vibes.

### Available Models:
- `gpt-4o` – High-quality, multimodal reasoning model.
- `gpt-4o-mini` – Cheaper, faster version of GPT-4o. *(default)*
- `gpt-4-turbo` – Optimized GPT-4 for speed and cost.
- `gpt-3.5-turbo` – Fast, inexpensive, good for simple components.
- `o1-preview` – Reasoning-focused preview model.
- `o1-mini` – Smaller reasoning model for quick builds.

### Example:
```bash
vibe App.vibe --model gpt-4o
```

This will:
- Use `gpt-4o` for all component generation
- Cache results separately per model (so switching models won’t overwrite previous cache)
- Allow you to experiment with speed vs quality trade-offs

---

## ⚙️ Configuration

VibeScript can be configured via:
1. **Command-line flags** (e.g., `--model gpt-4o`)
2. **Optional config file** (`vibe.config.json`)

### Example `vibe.config.json`
```json
{
  "model": "gpt-4o",
  "port": 4000
}
```

- `model` – Default OpenAI model to use for component generation.
- `port` – Port for the dev server in `--watch` mode.

### Priority:
1. Command-line flags (highest priority)
2. `vibe.config.json`
3. Built-in defaults (`gpt-4o-mini` for model, `3000` for port)

### Example Usage:
```bash
# Uses model from config file
vibe App.vibe --watch

# Overrides config file
vibe App.vibe --model gpt-4o-mini --port 5000
```

---

## ⚙️ How It Works (Totally Serious Technical Explanation)

1. **Prompt Parsing** – VibeScript reads your `.vibe` file and extracts components and pages.
2. **Hashing & Caching** – Each prompt is hashed. If unchanged, it’s pulled from `.vibecache.json`.
3. **AI Compilation** – Prompts are sent to an LLM (e.g., GPT-4o-mini) to generate HTML/CSS/JS.
4. **Recursive Resolution** – If a component references another, it’s resolved first.
5. **Assembly** – Components are stitched together into full HTML pages.
6. **Live Reload** – A WebSocket server pushes reload events to your browser.
7. **Deployment** – `--deploy` sends your vibes to Vercel.

---

## 🛡 Requirements

- Node.js 18+
- An OpenAI API key
- A willingness to let AI decide your design choices

---

## 🏆 Why Use VibeScript?

- You hate typing `div` tags.
- You believe “design is just vibes”.
- You want to feel like a **10x developer** without actually learning anything.
- You want to deploy a site in 5 minutes and spend the rest of the day tweeting about it.