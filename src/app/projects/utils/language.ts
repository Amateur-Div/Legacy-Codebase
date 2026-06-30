export const languageMap: Record<string, { name: string; color: string }> = {
  html: { name: "HTML", color: "#e34c26" },
  css: { name: "CSS", color: "#563d7c" },
  scss: { name: "SCSS", color: "#c6538c" },
  txt: { name: "TXT", color: "#777777" },
  js: { name: "JavaScript", color: "#f1e05a" },
  jsx: { name: "JavaScript", color: "#61dafb" },
  ts: { name: "TypeScript", color: "#3178c6" },
  tsx: { name: "TypeScript", color: "#3178c6" },
  json: { name: "JSON", color: "#292929" },
  c: { name: "C", color: "#555555" },
  cs: { name: "C#", color: "#178600" },
  go: { name: "GO", color: "#00ADD8" },
  rs: { name: "Rust", color: "#dea584" },
  php: { name: "PHP", color: "#4F5D95" },
  rb: { name: "Ruby", color: "#701516" },
  swift: { name: "Swift", color: "#ffac45" },
  kt: { name: "Kotlin", color: "#A97BFF" },
  yml: { name: "YAML", color: "#cb171e" },
  yaml: { name: "YAML", color: "#cb171e" },
  sh: { name: "Shell", color: "#89e051" },
  md: { name: "Markdown", color: "#083fa1" },
  py: { name: "Python", color: "#3572A5" },
  java: { name: "Java", color: "#b07219" },
  cpp: { name: "C++", color: "#f34b7d" },
};

export function getLanguage(filePath: string = "") {
  const ext = filePath.split(".").pop()?.toLocaleLowerCase() || "";

  return (
    languageMap[ext] || {
      name: "Text",
      color: "#888",
    }
  );
}
