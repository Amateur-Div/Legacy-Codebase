export function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "TypeScript";
    case "tsx":
      return "TypeScript";
    case "js":
      return "JavaScript";
    case "jsx":
      return "JavaScript";
    case "py":
      return "Python";
    case "java":
      return "Java";
    case "rb":
      return "Ruby";
    case "php":
      return "PHP";
    case "cs":
      return "C#";
    case "cpp":
      return "C++";
    case "c":
      return "C";
    case "go":
      return "Go";
    case "rs":
      return "Rust";
    case "swift":
      return "Swift";
    case "kt":
      return "Kotlin";
    case "html":
      return "HTML";
    case "css":
      return "CSS";
    case "json":
      return "JSON";
    case "yml":
    case "yaml":
      return "YAML";
    case "sh":
      return "Shell";
    default:
      return "---";
  }
}

export function getLanguageColor(language: string): string {
  const colorMap: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    HTML: "#e34c26",
    CSS: "#563d7c",
    JSON: "#292929",
    YAML: "#cb171e",
    Shell: "#89e051",
    "Plain Text": "#ccc",
  };

  return colorMap[language] || "#ccc";
}
