import { analyzeFile } from "../api/lib/analyzer/analyzeFile";
import { mergeFileGraphs } from "../api/lib/analyzer/mergeFileGraph";
import { scanImports } from "../api/lib/analyzer/scanImports";

test("merge two simple files with import", async () => {
  const a = `export function foo(){ return 1 }`;
  const b = `import { foo } from './a'; const x = foo();`;

  const ga = await analyzeFile("src/a.ts", a);
  const gb = await analyzeFile("src/b.ts", b);
  const ia = scanImports(a);
  const ib = scanImports(b);

  const merged = mergeFileGraphs({
    "src/a.ts": { graph: ga, code: a, importExport: ia },
    "src/b.ts": { graph: gb, code: b, importExport: ib },
  });

  expect(
    merged.mergedNodes.some((n) => n.id === "file::src/a.ts")
  ).toBeTruthy();
  expect(
    merged.mergedNodes.some((n) => n.id === "file::src/b.ts")
  ).toBeTruthy();
  expect(merged.mergedEdges.some((e) => e.label === "imports")).toBeTruthy();
});
