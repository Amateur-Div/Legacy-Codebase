import { enrichGraphSemantics } from "../api/lib/analyzer/enrichGraphSemantics";

const smallGraph = {
  nodes: [
    { id: "file::a", type: "file" },
    {
      id: "n1",
      type: "function",
      name: "foo",
      code: "function foo(){ if(x) return 1; for(let i=0;i<10;i++){} }",
    },
    { id: "n2", type: "statement", code: "const x = 1" },
  ],
  edges: [
    { id: "file::a->n1", from: "file::a", to: "n1" },
    { id: "n1->n2", from: "n1", to: "n2" },
  ],
};

test("enrich small graph", () => {
  const enriched = enrichGraphSemantics(smallGraph as any);
  const n1 = enriched.nodes.find((n) => n.id === "n1")!;
  expect(n1.semantic).toBeDefined();
  expect(typeof n1.semantic!.complexity).toBe("number");
  expect(typeof n1.semantic!.importance).toBe("number");
  expect(n1.semantic!.dead).toBe(false);
});
