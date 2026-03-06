const MODEL = "qwen2.5-coder:1.5b";

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
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
      }),
    });

    const data = await res.json();
    console.log("Data from queryOllama : ", data);

    return data.response?.trim() || "";
  } catch (err: any) {
    return "⚠ Ollama API error: " + err.message;
  }
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
    "\n\n",
  )}`;
  const merged = await queryOllama(summaryPrompt);

  return merged || explanations.join("\n\n");
}
