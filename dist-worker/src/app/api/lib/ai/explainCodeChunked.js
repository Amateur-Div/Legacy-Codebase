"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainCodeChunked = explainCodeChunked;
const MODEL = "qwen2.5:0.5b";
function chunkCode(code, maxLines = 80) {
    const lines = code.split("\n");
    const chunks = [];
    let current = [];
    for (const line of lines) {
        current.push(line);
        if (current.length >= maxLines) {
            chunks.push(current.join("\n"));
            current = [];
        }
    }
    if (current.length > 0)
        chunks.push(current.join("\n"));
    return chunks;
}
async function queryOllama(prompt) {
    var _a;
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
                keep_alive: "15m",
            }),
        }).catch(() => null);
        if (!res) {
            return "Ollama server is not running.";
        }
        const data = await res.json();
        console.log("Data from queryOllama : ", data);
        return ((_a = data.response) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    }
    catch (err) {
        console.log("Ollama error : ", err);
        return "⚠ Ollama API error: " + err.message;
    }
}
async function explainCodeChunked(code) {
    const chunks = chunkCode(code, 120);
    if (chunks.length === 0)
        return "No code provided.";
    const lines = code.split("\n");
    if (lines.length < 120) {
        const prompt = `Explain the following JS/TS code in simple technical language : ${code} , Explain what it does, its purpose and important logic`;
        return await queryOllama(prompt);
    }
    let explanations = [];
    let i = 1;
    for (const chunk of chunks) {
        const prompt = `Explain the following JavaScript/TypeScript code in simple technical language:\n\n${chunk}\n\nSummary for part ${i}/${chunks.length}:`;
        const part = await queryOllama(prompt);
        explanations.push(`### Part ${i}\n${part}`);
        i++;
    }
    const summaryPrompt = `Merge and summarize the following code explanations into one cohesive explanation:\n\n${explanations.join("\n\n")}`;
    const merged = await queryOllama(summaryPrompt);
    return merged || explanations.join("\n\n");
}
