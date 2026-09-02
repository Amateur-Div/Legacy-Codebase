import { describe, expect, it } from "vitest";
import { findCircularDependencies, findDeadFiles } from "../../impactEngine";

describe("findDeadFiles", () => {
  it("finds unreachable source files from trusted roots", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/lib/a.ts" },
        { id: "C", type: "file", file: "src/lib/b.ts" },
        { id: "D", type: "file", file: "src/lib/dead.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
        {
          id: "B-C",
          from: "B",
          to: "C",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["B", "C", "D"]),
    });

    expect(result).toEqual(["D"]);
  });

  it("does not classify the root itself as dead", () => {
    const graph: any = {
      nodes: [{ id: "A", type: "file", file: "src/app/page.tsx" }],
      edges: [],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["A"]),
    });

    expect(result).toEqual([]);
  });

  it("fails closed when no trusted roots exist", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/lib/a.ts" },
        { id: "B", type: "file", file: "src/lib/b.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(),
      candidateFileIds: new Set(["A", "B"]),
    });

    expect(result).toEqual([]);
  });

  it("does not classify transitively reachable files as dead", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/lib/a.ts" },
        { id: "C", type: "file", file: "src/lib/b.ts" },
        { id: "D", type: "file", file: "src/lib/c.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
        {
          id: "B-C",
          from: "B",
          to: "C",
          label: "imports",
        },
        {
          id: "C-D",
          from: "C",
          to: "D",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["B", "C", "D"]),
    });

    expect(result).toEqual([]);
  });

  it("supports multiple trusted entry points", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/app/admin/page.tsx" },
        { id: "C", type: "file", file: "src/lib/user.ts" },
        { id: "D", type: "file", file: "src/lib/admin.ts" },
        { id: "E", type: "file", file: "src/lib/dead.ts" },
      ],
      edges: [
        {
          id: "A-C",
          from: "A",
          to: "C",
          label: "imports",
        },
        {
          id: "B-D",
          from: "B",
          to: "D",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A", "B"]),
      candidateFileIds: new Set(["C", "D", "E"]),
    });

    expect(result).toEqual(["E"]);
  });

  it("handles cyclic dependencies without classifying reachable files as dead", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/lib/a.ts" },
        { id: "C", type: "file", file: "src/lib/b.ts" },
        { id: "D", type: "file", file: "src/lib/dead.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
        {
          id: "B-C",
          from: "B",
          to: "C",
          label: "imports",
        },
        {
          id: "C-B",
          from: "C",
          to: "B",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["B", "C", "D"]),
    });

    expect(result).toEqual(["D"]);
  });

  it("reports only files included in the candidate set", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/lib/reachable.ts" },
        { id: "C", type: "file", file: "README.md" },
        { id: "D", type: "file", file: "src/generated.ts" },
      ],
      edges: [],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["B"]),
    });

    expect(result).toEqual(["B"]);
  });

  it("treats a dynamically imported file as reachable", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/app/page.tsx" },
        { id: "B", type: "file", file: "src/lib/feature.ts" },
        { id: "C", type: "file", file: "src/lib/dead.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
      ],
    };

    const result = findDeadFiles(graph, {
      entryFileIds: new Set(["A"]),
      candidateFileIds: new Set(["B", "C"]),
    });

    expect(result).toEqual(["C"]);
  });
});

describe("findCircularDependencies", () => {
  it("detects a cycle containing a dynamically imported dependency", () => {
    const graph: any = {
      nodes: [
        { id: "A", type: "file", file: "src/a.ts" },
        { id: "B", type: "file", file: "src/b.ts" },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
        {
          id: "B-A",
          from: "B",
          to: "A",
          label: "imports",
        },
      ],
    };

    const result = findCircularDependencies(graph);

    expect(result).toContainEqual(["A", "B", "A", "A"]);
  });
});
