import { describe, expect, it } from "vitest";
import { enrichGraphSemantics } from "../enrichGraphSemantics";
import { FlowGraph } from "../types";

describe("enrichGraphSemantics", () => {
  it("detects the controller layer from the file path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "userController.ts",
          file: "src/controller/userController.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("controller");
  });

  it("detects the service layer from the file path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "userService.ts",
          file: "src/service/userService.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("service");
  });

  it("detects the repository layer from the file path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "userRepository.ts",
          file: "src/repository/userRepository.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("repository");
  });

  it("detects the model layer from a schema path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "userSchema.ts",
          file: "src/schema/userSchema.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("model");
  });

  it("detects the library layer from a lib path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "auth.ts",
          file: "src/lib/auth.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("library");
  });

  it("falls back to module for an unrecognized path", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "Button.tsx",
          file: "src/components/Button.tsx",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    expect(result.nodes[0].meta?.layer).toBe("module");
  });

  it("calculates normalized importance from graph degree", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          name: "entry.ts",
          file: "src/entry.ts",
        },
        {
          id: "B",
          type: "file",
          name: "shared.ts",
          file: "src/shared.ts",
        },
        {
          id: "C",
          type: "file",
          name: "consumer.ts",
          file: "src/consumer.ts",
        },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
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

    const result = enrichGraphSemantics(graph);

    const entry = result.nodes.find((node) => node.id === "A")!;
    const shared = result.nodes.find((node) => node.id === "B")!;
    const consumer = result.nodes.find((node) => node.id === "C")!;

    expect(shared.semantic?.importance).toBe(1);
    expect(entry.semantic?.importance).toBe(0.5);
    expect(consumer.semantic?.importance).toBe(0.5);
  });

  it("assigns higher complexity to code with more control-flow constructs", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "simple",
          type: "file",
          name: "simple.ts",
          file: "src/simple.ts",
          code: `
            export function simple(value: number) {
              return value;
            }
          `,
        },
        {
          id: "complex",
          type: "file",
          name: "complex.ts",
          file: "src/complex.ts",
          code: `
            export function complex(value: number) {
              if (value > 10) {
                for (let i = 0; i < value; i++) {
                  if (i % 2 === 0) {
                    return i;
                  }
                }
              }

              return 0;
            }
          `,
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    const simple = result.nodes.find((node) => node.id === "simple")!;
    const complex = result.nodes.find((node) => node.id === "complex")!;

    expect(complex.semantic?.complexity).toBeGreaterThan(
      simple.semantic?.complexity ?? 0,
    );
  });

  it("records incoming and outgoing connectivity separately", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          file: "src/a.ts",
        },
        {
          id: "B",
          type: "file",
          file: "src/b.ts",
        },
        {
          id: "C",
          type: "file",
          file: "src/c.ts",
        },
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

    const result = enrichGraphSemantics(graph);

    const nodeB = result.nodes.find((node) => node.id === "B")!;

    expect(nodeB.semantic?.connectivity).toEqual({
      inDegree: 1,
      outDegree: 1,
      totalDegree: 2,
      score: 1,
    });
  });

  it("assigns zero connectivity to an isolated node", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          file: "src/a.ts",
        },
        {
          id: "B",
          type: "file",
          file: "src/b.ts",
        },
      ],
      edges: [],
    };

    const result = enrichGraphSemantics(graph);

    const nodeA = result.nodes.find((node) => node.id === "A")!;

    expect(nodeA.semantic?.connectivity).toEqual({
      inDegree: 0,
      outDegree: 0,
      totalDegree: 0,
      score: 0,
    });
  });

  it("uses the highest total degree as the connectivity score baseline", () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: "A",
          type: "file",
          file: "src/a.ts",
        },
        {
          id: "B",
          type: "file",
          file: "src/b.ts",
        },
        {
          id: "C",
          type: "file",
          file: "src/c.ts",
        },
        {
          id: "D",
          type: "file",
          file: "src/d.ts",
        },
      ],
      edges: [
        {
          id: "A-B",
          from: "A",
          to: "B",
          label: "imports",
        },
        {
          id: "C-B",
          from: "C",
          to: "B",
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

    const result = enrichGraphSemantics(graph);

    const nodeA = result.nodes.find((node) => node.id === "A")!;
    const nodeB = result.nodes.find((node) => node.id === "B")!;

    expect(nodeB.semantic?.connectivity?.totalDegree).toBe(3);
    expect(nodeB.semantic?.connectivity?.score).toBe(1);

    expect(nodeA.semantic?.connectivity?.totalDegree).toBe(1);
    expect(nodeA.semantic?.connectivity?.score).toBe(1 / 3);
  });
});
