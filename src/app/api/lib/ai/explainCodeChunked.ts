import { spawn } from "child_process";

const OLLAMA_PATH =
  "C:\\Users\\ACER\\AppData\\Local\\Programs\\Ollama\\ollama.exe";
const MODEL = "llama3.2:1b";

function chunkCode(code: string, maxLines = 80): string[] {
  const lines = code.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (current.length >= maxLines) {
      chunks.push(current.join("\n"));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

async function queryOllama(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    let output = "";
    const proc = spawn(OLLAMA_PATH, ["run", MODEL], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdout.on("data", (data) => (output += data.toString()));
    proc.stderr.on("data", (err) =>
      console.error("Ollama stderr:", err.toString())
    );
    proc.on("error", (err) => resolve("⚠ Ollama failed: " + err.message));
    proc.on("close", () => resolve(output.trim()));

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export async function explainCodeChunked(code: string): Promise<string> {
  const chunks = chunkCode(code);
  if (chunks.length === 0) return "No code provided.";

  let explanations: string[] = [];
  let i = 1;

  for (const chunk of chunks) {
    const prompt = `Explain the following JavaScript/TypeScript code in simple technical language:\n\n${chunk}\n\nSummary for part ${i}/${chunks.length}:`;
    const part = await queryOllama(prompt);
    explanations.push(`### Part ${i}\n${part}`);
    i++;
  }

  const summaryPrompt = `Merge and summarize the following code explanations into one cohesive explanation:\n\n${explanations.join(
    "\n\n"
  )}`;
  const merged = await queryOllama(summaryPrompt);

  return merged || explanations.join("\n\n");
}
