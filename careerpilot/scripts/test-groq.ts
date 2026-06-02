import { loadEnvConfig } from "@next/env";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

loadEnvConfig(process.cwd());

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("GROQ_API_KEY is not set in .env.local");
  process.exit(1);
}

async function main() {
  console.log("Testing Groq with a simple prompt...");
  const groqClient = createGroq({ apiKey });
  const { text } = await generateText({
    model: groqClient("llama-3.3-70b-versatile"),
    prompt: "Say hello",
  });
  console.log("Groq response:");
  console.log(text.trim());
}

main().catch((err) => {
  const detail = err?.status ?? err?.statusCode ?? err?.message ?? String(err);
  console.error(`Groq test failed: ${detail}`);
  process.exit(1);
});
