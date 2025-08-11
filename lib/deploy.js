import { execSync } from "child_process";

export async function deployToVercel() {
  console.log("🚀 Deploying to Vercel...");
  try {
    execSync("npx vercel --prod dist", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ Deployment failed:", err.message);
  }
}