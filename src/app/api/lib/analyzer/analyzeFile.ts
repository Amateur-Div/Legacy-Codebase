import { instrumentExecutionBabel } from "../instrumentExecutionBabel";
import { normalizeGraphIds } from "./normalizeGraphIds";
import type { FlowGraph } from "./types";

export async function analyzeFile(
  filePath: string,
  code: string
): Promise<FlowGraph> {
  const raw = instrumentExecutionBabel(code);
  const normalized = normalizeGraphIds(raw, filePath);
  return normalized;
}
