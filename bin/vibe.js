#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { compileVibeScript } from "../lib/compiler.js";
import { watchVibeScript } from "../lib/watcher.js";
import { deployToVercel } from "../lib/deploy.js";

function loadConfig() {
  const configPath = path.resolve("vibe.config.json");
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
      console.error("❌ Failed to parse vibe.config.json:", err.message);
    }
  }
  return {};
}

function printConfig(config) {
  console.log(chalk.cyan.bold("\n🚀 VibeScript Configuration"));
  console.log(chalk.cyan("───────────────────────────"));
  console.log(`${chalk.bold("Model:")} ${config.model}`);
  console.log(`${chalk.bold("Port:")} ${config.port}`);
  console.log(`${chalk.bold("Cache:")} Enabled`);
  console.log();
}

function checkApiKey() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === "") {
    console.error(
      chalk.red.bold("\n❌ Missing OpenAI API Key!") +
        "\n\nPlease set your API key before running VibeScript:\n" +
        chalk.yellow("export OPENAI_API_KEY=\"your_api_key_here\"") +
        "\n\nGet one here: " +
        chalk.blue.underline("https://platform.openai.com/account/api-keys") +
        "\n"
    );
    process.exit(1);
  }
}

const program = new Command();
const fileConfig = loadConfig();

program
  .name("vibe")
  .description("Compile and run VibeScript projects")
  .version("1.3.2");

program
  .argument("<file>", "VibeScript file to compile")
  .option("-w, --watch", "Enable hot reload")
  .option("-d, --deploy", "Deploy to Vercel after build")
  .option(
    "-m, --model <model>",
    "Choose OpenAI model (gpt-5, gpt-4o, gpt-4.1, gpt-4.1-nano, gpt-4.1-mini, o3, o4-mini, gpt-oss-120b, gpt-oss-20b, etc)",
    fileConfig.model || "gpt-4.1-nano"
  )
  .option(
    "-p, --port <port>",
    "Port for dev server",
    fileConfig.port || 3000
  )
  .action(async (file, options) => {
    checkApiKey(); // Check before doing anything

    const config = {
      model: options.model,
      port: options.port,
    };

    printConfig(config);

    if (options.watch) {
      console.log(chalk.blue("🔄 Starting development mode..."));
      await watchVibeScript(file, config);
    } else {
      console.log(chalk.blue("🔨 Building your vibes..."));
      await compileVibeScript(file, config);
      console.log(chalk.green("✅ Build complete! Check the 'dist' folder for your generated files."));
      if (options.deploy) {
        console.log(chalk.blue("🚀 Deploying to Vercel..."));
        await deployToVercel();
      }
    }
  });

program.parse(process.argv);