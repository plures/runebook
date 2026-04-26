// Tests for canvas store (derived from canvas-praxis)

import { describe, it, expect, beforeEach } from "vitest";
import {
  canvasStore,
  nodeDataStore,
  updateNodeData,
  getNodeInputData,
} from "../canvas";
import { canvasEngine } from "../canvas-praxis";
import type { CanvasNode, Connection } from "../../types/canvas";

const makeTextNode = (id: string): CanvasNode => ({
  id,
  type: "text",
  position: { x: 0, y: 0 },
  label: `Node ${id}`,
  content: "",
  inputs: [],
  outputs: [],
});

describe("canvasStore", () => {
  beforeEach(() => {
    // Use canvasStore.clear() so praxisStore.currentState is reset via dispatch
    canvasStore.clear();
  });

  it("should subscribe and receive canvas updates", () => {
    const updates: any[] = [];
    const unsub = canvasStore.subscribe((canvas) => updates.push(canvas));
    canvasStore.addNode(makeTextNode("n1"));
    unsub();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1].nodes[0].id).toBe("n1");
  });

  it("should set canvas via loadCanvas", () => {
    const newCanvas = {
      id: "loaded",
      name: "Loaded Canvas",
      description: "",
      nodes: [],
      connections: [],
      version: "1.0.0",
    };
    canvasStore.set(newCanvas);
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].id).toBe("loaded");
  });

  it("should add node via canvasStore.addNode", () => {
    canvasStore.addNode(makeTextNode("n1"));
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].nodes.some((n: CanvasNode) => n.id === "n1")).toBe(true);
  });

  it("should remove node via canvasStore.removeNode", () => {
    canvasStore.addNode(makeTextNode("n1"));
    canvasStore.removeNode("n1");
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].nodes).toHaveLength(0);
  });

  it("should update node via canvasStore.updateNode", () => {
    canvasStore.addNode(makeTextNode("n1"));
    canvasStore.updateNode("n1", { label: "Updated" });
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].nodes[0].label).toBe("Updated");
  });

  it("should update node position", () => {
    canvasStore.addNode(makeTextNode("n1"));
    canvasStore.updateNodePosition("n1", 50, 75);
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].nodes[0].position).toEqual({ x: 50, y: 75 });
  });

  it("should add and remove connections", () => {
    const conn: Connection = {
      from: "n1",
      to: "n2",
      fromPort: "out",
      toPort: "in",
    };
    canvasStore.addConnection(conn);
    canvasStore.removeConnection("n1", "n2", "out", "in");
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].connections).toHaveLength(0);
  });

  it("should clear the canvas", () => {
    canvasStore.addNode(makeTextNode("n1"));
    canvasStore.clear();
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].nodes).toHaveLength(0);
  });
});

describe("nodeDataStore", () => {
  beforeEach(() => {
    canvasStore.clear();
  });

  it("should subscribe and receive nodeData updates", () => {
    const updates: any[] = [];
    const unsub = nodeDataStore.subscribe((data) => updates.push(data));
    updateNodeData("n1", "out", 42);
    unsub();
    expect(updates[updates.length - 1]["n1:out"]).toBe(42);
  });

  it("should allow setting nodeData directly (non-reactive path)", () => {
    // nodeDataStore.set mutates a context clone (does not persist to engine state)
    // This is a best-effort compatibility shim - just verify it does not throw
    expect(() => nodeDataStore.set({ "n1:out": "hello" })).not.toThrow();
  });

  it("should allow updating nodeData via function (non-reactive path)", () => {
    // nodeDataStore.update also mutates a context clone without persisting
    expect(() =>
      nodeDataStore.update((data) => ({ ...data, "n2:out": 2 })),
    ).not.toThrow();
  });
});

describe("updateNodeData helper", () => {
  beforeEach(() => {
    canvasStore.clear();
  });

  it("should update node output data", () => {
    updateNodeData("n1", "port1", "data");
    expect(canvasEngine.getContext().nodeData["n1:port1"]).toBe("data");
  });
});

describe("getNodeInputData helper", () => {
  beforeEach(() => {
    canvasStore.clear();
  });

  it("should return data from the connected source", () => {
    canvasStore.addNode(makeTextNode("n1"));
    canvasStore.addNode(makeTextNode("n2"));
    canvasStore.addConnection({
      from: "n1",
      to: "n2",
      fromPort: "out",
      toPort: "in",
    });
    updateNodeData("n1", "out", "value");
    const result = getNodeInputData(
      "n2",
      "in",
      canvasEngine.getContext().canvas.connections,
      canvasEngine.getContext().nodeData,
    );
    expect(result).toBe("value");
  });

  it("should return undefined when no connection exists", () => {
    const result = getNodeInputData("n2", "in", [], {});
    expect(result).toBeUndefined();
  });
});

describe("makeConnectionId", () => {
  it("should generate a handle-based ID", async () => {
    const { makeConnectionId } = await import("../canvas");
    expect(makeConnectionId("n1", "out", "n2", "in")).toBe("e-n1-out-n2-in");
  });

  it("should produce distinct IDs for different port combinations", async () => {
    const { makeConnectionId } = await import("../canvas");
    const id1 = makeConnectionId("n1", "out", "n2", "in");
    const id2 = makeConnectionId("n1", "out2", "n2", "in");
    const id3 = makeConnectionId("n1", "out", "n2", "in2");
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id2).not.toBe(id3);
  });
});

describe("canvasStore connection deduplication", () => {
  beforeEach(() => {
    canvasStore.clear();
  });

  it("should deduplicate connections with the same endpoints", () => {
    const conn: Connection = {
      from: "n1",
      to: "n2",
      fromPort: "out",
      toPort: "in",
    };
    canvasStore.addConnection(conn);
    canvasStore.addConnection(conn);
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].connections).toHaveLength(1);
  });

  it("should auto-generate a handle-based ID for connections", () => {
    const conn: Connection = {
      from: "n1",
      to: "n2",
      fromPort: "out",
      toPort: "in",
    };
    canvasStore.addConnection(conn);
    const values: any[] = [];
    const unsub = canvasStore.subscribe((c) => values.push(c));
    unsub();
    expect(values[0].connections[0].id).toBe("e-n1-out-n2-in");
  });
});
