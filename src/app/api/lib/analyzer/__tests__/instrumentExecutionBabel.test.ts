import { describe, expect, it } from "vitest";
import { instrumentExecutionBabel } from "../../instrumentExecutionBabel";

describe("instrumentExecutionBabel", () => {
  it("creates a root node for a simple program", () => {
    const result = instrumentExecutionBabel(`
      const x = 1;
    `);

    expect(result.nodes.some((node) => node.id === "root")).toBe(true);

    expect(result.nodes.some((node) => node.type === "statement")).toBe(true);
  });

  it("creates sequential execution edges for statements", () => {
    const result = instrumentExecutionBabel(`
      const a = 1;
      const b = 2;
      const c = 3;
    `);

    const statements = result.nodes.filter((node) => node.type === "statement");

    expect(statements.length).toBe(3);

    expect(
      result.edges.some(
        (edge) =>
          edge.from === statements[0].id &&
          edge.to === statements[1].id &&
          edge.label === "next",
      ),
    ).toBe(true);

    expect(
      result.edges.some(
        (edge) =>
          edge.from === statements[1].id &&
          edge.to === statements[2].id &&
          edge.label === "next",
      ),
    ).toBe(true);
  });

  it("creates an if node with a true branch", () => {
    const result = instrumentExecutionBabel(`
      if (condition) {
        doSomething();
      }
    `);

    expect(result.nodes.some((node) => node.type === "if")).toBe(true);

    expect(result.nodes.some((node) => node.type === "if-true")).toBe(true);

    const ifNode = result.nodes.find((node) => node.type === "if");
    const trueNode = result.nodes.find((node) => node.type === "if-true");

    expect(ifNode).toBeDefined();
    expect(trueNode).toBeDefined();

    expect(
      result.edges.some(
        (edge) =>
          edge.from === ifNode!.id &&
          edge.to === trueNode!.id &&
          edge.label === "true",
      ),
    ).toBe(true);
  });

  it("creates both true and false branches for if/else", () => {
    const result = instrumentExecutionBabel(`
      if (condition) {
        doSomething();
      } else {
        doSomethingElse();
      }
    `);

    const ifNode = result.nodes.find((node) => node.type === "if");
    const trueNode = result.nodes.find((node) => node.type === "if-true");
    const falseNode = result.nodes.find((node) => node.type === "if-false");

    expect(ifNode).toBeDefined();
    expect(trueNode).toBeDefined();
    expect(falseNode).toBeDefined();

    expect(
      result.edges.some(
        (edge) =>
          edge.from === ifNode!.id &&
          edge.to === trueNode!.id &&
          edge.label === "true",
      ),
    ).toBe(true);

    expect(
      result.edges.some(
        (edge) =>
          edge.from === ifNode!.id &&
          edge.to === falseNode!.id &&
          edge.label === "false",
      ),
    ).toBe(true);
  });

  it("creates loop, loop-body, back, and exit edges for a for loop", () => {
    const result = instrumentExecutionBabel(`
    for (let i = 0; i < 3; i++) {
      doSomething(i);
    }
  `);

    const loopNodes = result.nodes.filter((node) => node.type === "loop");

    expect(loopNodes.length).toBeGreaterThanOrEqual(2);

    const loopNode = loopNodes[loopNodes.length - 1];

    const bodyNode = result.nodes.find((node) => node.type === "loop-body");
    const afterLoopNode = result.nodes.find(
      (node) => node.type === "after-loop",
    );

    expect(loopNode).toBeDefined();
    expect(bodyNode).toBeDefined();
    expect(afterLoopNode).toBeDefined();

    expect(
      result.edges.some(
        (edge) =>
          edge.from === loopNode.id &&
          edge.to === bodyNode!.id &&
          edge.label === "body",
      ),
    ).toBe(true);

    expect(
      result.edges.some(
        (edge) =>
          edge.from === loopNode.id &&
          edge.to === afterLoopNode!.id &&
          edge.label === "exit",
      ),
    ).toBe(true);

    expect(
      result.edges.some(
        (edge) => edge.to === loopNode.id && edge.label === "back",
      ),
    ).toBe(true);
  });

  it("supports while loops", () => {
    const result = instrumentExecutionBabel(`
      while (condition) {
        doSomething();
      }
    `);

    expect(result.nodes.some((node) => node.type === "loop")).toBe(true);

    expect(result.nodes.some((node) => node.type === "loop-body")).toBe(true);

    expect(result.nodes.some((node) => node.type === "after-loop")).toBe(true);
  });

  it("creates a function declaration and function entry node", () => {
    const result = instrumentExecutionBabel(`
      function hello() {
        console.log("hello");
      }
    `);

    const functionNodes = result.nodes.filter(
      (node) => node.type === "function",
    );

    expect(functionNodes.length).toBeGreaterThan(0);

    expect(functionNodes.some((node) => node.name === "hello")).toBe(true);

    const entryNode = result.nodes.find((node) => node.type === "fn-entry");

    expect(entryNode).toBeDefined();

    const namedFunction = functionNodes.find((node) => node.name === "hello");

    expect(namedFunction).toBeDefined();

    expect(
      result.edges.some(
        (edge) =>
          edge.from === namedFunction!.id &&
          edge.to === entryNode!.id &&
          edge.label === "entry",
      ),
    ).toBe(true);
  });

  it("represents nested control flow", () => {
    const result = instrumentExecutionBabel(`
      function process() {
        if (condition) {
          for (let i = 0; i < 3; i++) {
            doSomething(i);
          }
        }
      }
    `);

    expect(result.nodes.some((node) => node.type === "function")).toBe(true);

    expect(result.nodes.some((node) => node.type === "if")).toBe(true);

    expect(result.nodes.some((node) => node.type === "loop")).toBe(true);

    expect(result.nodes.some((node) => node.type === "loop-body")).toBe(true);
  });

  it("does not throw on malformed source", () => {
    expect(() =>
      instrumentExecutionBabel(`
        function broken( {
          const x =
      `),
    ).not.toThrow();

    const result = instrumentExecutionBabel(`
      function broken( {
        const x =
    `);

    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("does not create execution nodes for use strict directives", () => {
    const result = instrumentExecutionBabel(`
      "use strict";

      const value = 42;
    `);

    expect(
      result.nodes.some(
        (node) => node.code === '"use strict"' || node.code === "'use strict'",
      ),
    ).toBe(false);

    expect(result.nodes.some((node) => node.type === "statement")).toBe(true);
  });
});
