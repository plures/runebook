// Tests for Praxis runtime — verifies the singleton engine instances and
// convenience helpers work end-to-end with the RuneBook app context.

import { describe, it, expect, beforeEach } from "vitest";
import type { CanvasNode, Connection } from "../../types/canvas";

// Import the runtime helpers under test (module-level singletons; we reset
// state where needed between tests via engine.updateContext()).
import {
  canvasValidationEngine,
  syncValidationNodes,
  validateConnection,
  executionPolicyEngine,
  scheduleExecution,
  componentRegistryEngine,
  requestTerminal,
  releaseTerminal,
  resourceManagementEngine,
} from "../runtime";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  outputs: { id: string; dataType?: string }[] = [],
  inputs: { id: string; dataType?: string }[] = [],
): CanvasNode {
  return {
    id,
    type: "text",
    position: { x: 0, y: 0 },
    label: id,
    content: "",
    inputs: inputs.map((p) => ({
      id: p.id,
      name: p.id,
      type: "input",
      dataType: p.dataType,
    })),
    outputs: outputs.map((p) => ({
      id: p.id,
      name: p.id,
      type: "output",
      dataType: p.dataType,
    })),
  };
}

function makeConn(
  from: string,
  fromPort: string,
  to: string,
  toPort: string,
): Connection {
  return {
    id: `e-${from}-${fromPort}-${to}-${toPort}`,
    from,
    fromPort,
    to,
    toPort,
  };
}

// ---------------------------------------------------------------------------
// canvas-validation runtime helpers
// ---------------------------------------------------------------------------

describe("validateConnection", () => {
  beforeEach(() => {
    canvasValidationEngine.updateContext(() => ({
      nodes: [],
      pendingConnection: null,
      validationResult: null,
    }));
  });

  it("allows a connection when port types are compatible", () => {
    const nodes = [
      makeNode("src", [{ id: "out", dataType: "string" }]),
      makeNode("dst", [], [{ id: "in", dataType: "string" }]),
    ];
    syncValidationNodes(nodes);
    expect(validateConnection("src", "out", "dst", "in")).toBe(true);
  });

  it("rejects a self-loop", () => {
    const nodes = [makeNode("n", [{ id: "out" }], [{ id: "in" }])];
    syncValidationNodes(nodes);
    expect(validateConnection("n", "out", "n", "in")).toBe(false);
  });

  it("rejects a type-mismatched connection", () => {
    const nodes = [
      makeNode("src", [{ id: "out", dataType: "number" }]),
      makeNode("dst", [], [{ id: "in", dataType: "string" }]),
    ];
    syncValidationNodes(nodes);
    expect(validateConnection("src", "out", "dst", "in")).toBe(false);
  });

  it("allows a valid connection after a rejected one on the same engine", () => {
    const nodes = [
      makeNode("src", [{ id: "out", dataType: "string" }]),
      makeNode("dst", [], [{ id: "in", dataType: "string" }]),
    ];
    syncValidationNodes(nodes);
    // First: reject a self-loop
    expect(validateConnection("src", "out", "src", "in")).toBe(false);
    // Second: allow a valid connection (stale state must not block this)
    expect(validateConnection("src", "out", "dst", "in")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scheduleExecution runtime helper
// ---------------------------------------------------------------------------

describe("scheduleExecution", () => {
  it("returns topological order for a linear graph", () => {
    const nodes = [makeNode("n1"), makeNode("n2"), makeNode("n3")];
    const conns = [
      makeConn("n1", "out", "n2", "in"),
      makeConn("n2", "out", "n3", "in"),
    ];
    const order = scheduleExecution(nodes, conns);
    expect(order).toHaveLength(3);
    expect(order.indexOf("n1")).toBeLessThan(order.indexOf("n2"));
    expect(order.indexOf("n2")).toBeLessThan(order.indexOf("n3"));
  });

  it("returns empty array when a cycle exists", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const conns = [
      makeConn("a", "out", "b", "in"),
      makeConn("b", "out", "a", "in"),
    ];
    const order = scheduleExecution(nodes, conns);
    expect(order).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// component-registry — built-in components pre-populated
// ---------------------------------------------------------------------------

describe("componentRegistryEngine", () => {
  it("has the five built-in RuneBook component types registered", () => {
    const components = componentRegistryEngine.getContext().components;
    expect(components["text"]).toBeDefined();
    expect(components["terminal"]).toBeDefined();
    expect(components["input"]).toBeDefined();
    expect(components["display"]).toBeDefined();
    expect(components["transform"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// requestTerminal / releaseTerminal runtime helpers
// ---------------------------------------------------------------------------

describe("requestTerminal / releaseTerminal", () => {
  beforeEach(() => {
    resourceManagementEngine.updateContext((ctx) => ({
      ...ctx,
      terminalCount: 0,
      maxTerminals: 2,
      timedOutNodes: [],
    }));
  });

  it("grants terminals up to the limit and then denies", () => {
    expect(requestTerminal("t1")).toBe(true);
    expect(requestTerminal("t2")).toBe(true);
    expect(requestTerminal("t3")).toBe(false);
  });

  it("frees a slot after releaseTerminal", () => {
    requestTerminal("t1");
    requestTerminal("t2");
    releaseTerminal("t1");
    expect(requestTerminal("t3")).toBe(true);
  });
});
