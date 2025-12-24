import { analyzeFile } from "../api/lib/analyzer/analyzeFile";

test("analyze simple file", async () => {
  const code = `function add(a,b){ return a+b }
const x = add(1,2);`;
  const graph = await analyzeFile("src/simple.ts", code);
  expect(graph.nodes.length).toBeGreaterThan(0);
  expect(graph.edges.length).toBeGreaterThan(0);
  expect(graph.nodes[0].id).toContain("src/simple.ts");
});
