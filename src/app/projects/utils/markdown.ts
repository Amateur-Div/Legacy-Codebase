export function generateSummary(md: string): string {
  const lines = md.split("\n").filter(Boolean);
  const firstLines = lines.slice(0, 5);

  return (
    firstLines
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .join(" ")
      .slice(0, 300) + "..."
  );
}
