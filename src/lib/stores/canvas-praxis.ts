// Praxis-based canvas state management for RuneBook
// Uses Praxis reactive engine for type-safe, testable state management

import {
  createPraxisEngine,
  defineEvent,
  defineRule,
  defineModule,
  PraxisRegistry,
  RuleResult,
} from "@plures/praxis";
import type {
  Canvas,
  CanvasNode,
  Connection,
  SubCanvasNode,
} from "../types/canvas";

/** One entry in the canvas navigation breadcrumb stack. */
export interface CanvasNavEntry {
  /** The parent canvas saved before navigating in. */
  canvas: Canvas;
  /** ID of the sub-canvas node in the parent that was entered. */
  nodeId: string;
  /** Breadcrumb label (usually the sub-canvas node's label). */
  label: string;
}

// Define the canvas context type
export interface CanvasContext {
  canvas: Canvas;
  nodeData: Record<string, any>; // Node output data: `${nodeId}:${portId}` -> data
  /** Navigation stack: empty = root canvas is active. */
  navStack: CanvasNavEntry[];
}

// Define events for canvas operations
export const AddNodeEvent = defineEvent<"ADD_NODE", { node: CanvasNode }>(
  "ADD_NODE",
);
export const RemoveNodeEvent = defineEvent<"REMOVE_NODE", { nodeId: string }>(
  "REMOVE_NODE",
);
export const UpdateNodeEvent = defineEvent<
  "UPDATE_NODE",
  { nodeId: string; updates: Partial<CanvasNode> }
>("UPDATE_NODE");
export const UpdateNodePositionEvent = defineEvent<
  "UPDATE_NODE_POSITION",
  { nodeId: string; x: number; y: number }
>("UPDATE_NODE_POSITION");
export const AddConnectionEvent = defineEvent<
  "ADD_CONNECTION",
  { connection: Connection }
>("ADD_CONNECTION");
export const RemoveConnectionEvent = defineEvent<
  "REMOVE_CONNECTION",
  { from: string; to: string; fromPort: string; toPort: string }
>("REMOVE_CONNECTION");
export const LoadCanvasEvent = defineEvent<"LOAD_CANVAS", { canvas: Canvas }>(
  "LOAD_CANVAS",
);
export const ClearCanvasEvent = defineEvent<"CLEAR_CANVAS", {}>("CLEAR_CANVAS");
export const UpdateNodeDataEvent = defineEvent<
  "UPDATE_NODE_DATA",
  { nodeId: string; portId: string; data: any }
>("UPDATE_NODE_DATA");
export const NavigateIntoSubCanvasEvent = defineEvent<
  "NAVIGATE_INTO_SUB_CANVAS",
  { nodeId: string; label: string }
>("NAVIGATE_INTO_SUB_CANVAS");
export const NavigateUpEvent = defineEvent<"NAVIGATE_UP", {}>("NAVIGATE_UP");

/**
 * Generate a deterministic, handle-based edge ID that prevents ID collisions
 * when the same two nodes are connected on different ports.
 *
 * Format: `e-${from}-${fromPort}-${to}-${toPort}`
 * Example: `e-node1-stdout-node2-input`
 */
export function makeConnectionId(
  from: string,
  fromPort: string,
  to: string,
  toPort: string,
): string {
  return `e-${from}-${fromPort}-${to}-${toPort}`;
}

// Define rules for canvas operations using RuleResult typed returns
const addNodeRule = defineRule<CanvasContext>({
  id: "canvas.addNode",
  description: "Add a new node to the canvas",
  eventTypes: "ADD_NODE",
  impl: (state, events) => {
    const evt = events.find(AddNodeEvent.is);
    if (!evt) return RuleResult.skip("no ADD_NODE event");
    state.context.canvas.nodes.push(evt.payload.node);
    return RuleResult.noop("node added");
  },
});

const removeNodeRule = defineRule<CanvasContext>({
  id: "canvas.removeNode",
  description: "Remove a node from the canvas",
  eventTypes: "REMOVE_NODE",
  impl: (state, events) => {
    const evt = events.find(RemoveNodeEvent.is);
    if (!evt) return RuleResult.skip("no REMOVE_NODE event");

    const { nodeId } = evt.payload;
    state.context.canvas.nodes = state.context.canvas.nodes.filter(
      (n) => n.id !== nodeId,
    );
    state.context.canvas.connections = state.context.canvas.connections.filter(
      (c) => c.from !== nodeId && c.to !== nodeId,
    );

    // Remove node data
    const prefix = `${nodeId}:`;
    state.context.nodeData = Object.fromEntries(
      Object.entries(state.context.nodeData).filter(
        ([key]) => !key.startsWith(prefix),
      ),
    );

    return RuleResult.noop("node removed");
  },
});

const updateNodeRule = defineRule<CanvasContext>({
  id: "canvas.updateNode",
  description: "Update a node's properties",
  eventTypes: "UPDATE_NODE",
  impl: (state, events) => {
    const evt = events.find(UpdateNodeEvent.is);
    if (!evt) return RuleResult.skip("no UPDATE_NODE event");

    const { nodeId, updates } = evt.payload;
    const nodeIndex = state.context.canvas.nodes.findIndex(
      (n) => n.id === nodeId,
    );
    if (nodeIndex !== -1) {
      state.context.canvas.nodes[nodeIndex] = {
        ...state.context.canvas.nodes[nodeIndex],
        ...updates,
      } as CanvasNode;
    }

    return RuleResult.noop("node updated");
  },
});

const updateNodePositionRule = defineRule<CanvasContext>({
  id: "canvas.updateNodePosition",
  description: "Update a node's position",
  eventTypes: "UPDATE_NODE_POSITION",
  impl: (state, events) => {
    const evt = events.find(UpdateNodePositionEvent.is);
    if (!evt) return RuleResult.skip("no UPDATE_NODE_POSITION event");

    const { nodeId, x, y } = evt.payload;
    const nodeIndex = state.context.canvas.nodes.findIndex(
      (n) => n.id === nodeId,
    );
    if (nodeIndex !== -1) {
      state.context.canvas.nodes[nodeIndex].position = { x, y };
    }

    return RuleResult.noop("node position updated");
  },
});

const addConnectionRule = defineRule<CanvasContext>({
  id: "canvas.addConnection",
  description: "Add a connection between nodes",
  eventTypes: "ADD_CONNECTION",
  impl: (state, events) => {
    const evt = events.find(AddConnectionEvent.is);
    if (!evt) return RuleResult.skip("no ADD_CONNECTION event");

    const conn = evt.payload.connection;
    // Auto-generate a handle-based ID when not provided
    const id =
      conn.id ??
      makeConnectionId(conn.from, conn.fromPort, conn.to, conn.toPort);
    const connection = { ...conn, id };

    // Deduplicate: skip if a connection with the same endpoints already exists
    const duplicate = state.context.canvas.connections.some(
      (c) =>
        c.from === connection.from &&
        c.to === connection.to &&
        c.fromPort === connection.fromPort &&
        c.toPort === connection.toPort,
    );
    if (!duplicate) {
      state.context.canvas.connections.push(connection);
    }

    return RuleResult.noop("connection added");
  },
});

const removeConnectionRule = defineRule<CanvasContext>({
  id: "canvas.removeConnection",
  description: "Remove a connection",
  eventTypes: "REMOVE_CONNECTION",
  impl: (state, events) => {
    const evt = events.find(RemoveConnectionEvent.is);
    if (!evt) return RuleResult.skip("no REMOVE_CONNECTION event");

    const { from, to, fromPort, toPort } = evt.payload;
    state.context.canvas.connections = state.context.canvas.connections.filter(
      (c) =>
        !(
          c.from === from &&
          c.to === to &&
          c.fromPort === fromPort &&
          c.toPort === toPort
        ),
    );

    return RuleResult.noop("connection removed");
  },
});

const loadCanvasRule = defineRule<CanvasContext>({
  id: "canvas.loadCanvas",
  description: "Load a canvas from data",
  eventTypes: "LOAD_CANVAS",
  impl: (state, events) => {
    const evt = events.find(LoadCanvasEvent.is);
    if (!evt) return RuleResult.skip("no LOAD_CANVAS event");

    state.context.canvas = evt.payload.canvas;
    state.context.navStack = [];
    return RuleResult.noop("canvas loaded");
  },
});

const clearCanvasRule = defineRule<CanvasContext>({
  id: "canvas.clearCanvas",
  description: "Clear the canvas",
  eventTypes: "CLEAR_CANVAS",
  impl: (state, events) => {
    const evt = events.find(ClearCanvasEvent.is);
    if (!evt) return RuleResult.skip("no CLEAR_CANVAS event");

    state.context.canvas = {
      id: "default",
      name: "Untitled Canvas",
      description: "",
      nodes: [],
      connections: [],
      version: "1.0.0",
    };
    state.context.nodeData = {};
    state.context.navStack = [];

    return RuleResult.noop("canvas cleared");
  },
});

const updateNodeDataRule = defineRule<CanvasContext>({
  id: "canvas.updateNodeData",
  description: "Update node output data",
  eventTypes: "UPDATE_NODE_DATA",
  impl: (state, events) => {
    const evt = events.find(UpdateNodeDataEvent.is);
    if (!evt) return RuleResult.skip("no UPDATE_NODE_DATA event");

    const { nodeId, portId, data } = evt.payload;
    state.context.nodeData[`${nodeId}:${portId}`] = data;

    return RuleResult.noop("node data updated");
  },
});

const navigateIntoSubCanvasRule = defineRule<CanvasContext>({
  id: "canvas.navigateIntoSubCanvas",
  description:
    "Navigate into a sub-canvas node, pushing the current canvas to the nav stack",
  eventTypes: "NAVIGATE_INTO_SUB_CANVAS",
  impl: (state, events) => {
    const evt = events.find(NavigateIntoSubCanvasEvent.is);
    if (!evt) return RuleResult.skip("no NAVIGATE_INTO_SUB_CANVAS event");

    const { nodeId, label } = evt.payload;
    const node = state.context.canvas.nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== "sub-canvas")
      return RuleResult.skip("not a sub-canvas node");

    // Push current canvas onto the stack and descend into the children canvas.
    state.context.navStack.push({
      canvas: state.context.canvas,
      nodeId,
      label,
    });
    state.context.canvas = (node as SubCanvasNode).children;
    state.context.nodeData = {};

    return RuleResult.noop("navigated into sub-canvas");
  },
});

const navigateUpRule = defineRule<CanvasContext>({
  id: "canvas.navigateUp",
  description:
    "Navigate back up to the parent canvas, saving any changes back into the sub-canvas node",
  eventTypes: "NAVIGATE_UP",
  impl: (state, events) => {
    const evt = events.find(NavigateUpEvent.is);
    if (!evt) return RuleResult.skip("no NAVIGATE_UP event");
    if (state.context.navStack.length === 0)
      return RuleResult.skip("already at root");

    const entry = state.context.navStack.pop()!;
    const modifiedChildren = state.context.canvas;

    // Write the modified sub-canvas back into the parent node.
    const parentNodeIdx = entry.canvas.nodes.findIndex(
      (n) => n.id === entry.nodeId,
    );
    if (
      parentNodeIdx !== -1 &&
      entry.canvas.nodes[parentNodeIdx].type === "sub-canvas"
    ) {
      (entry.canvas.nodes[parentNodeIdx] as SubCanvasNode).children =
        modifiedChildren;
    }

    state.context.canvas = entry.canvas;
    state.context.nodeData = {};

    return RuleResult.noop("navigated up");
  },
});

// Bundle all canvas rules into a PraxisModule
export const canvasModule = defineModule<CanvasContext>({
  rules: [
    addNodeRule,
    removeNodeRule,
    updateNodeRule,
    updateNodePositionRule,
    addConnectionRule,
    removeConnectionRule,
    loadCanvasRule,
    clearCanvasRule,
    updateNodeDataRule,
    navigateIntoSubCanvasRule,
    navigateUpRule,
  ],
  meta: { name: "canvas", version: "1.0.0" },
});

// Create the registry and register the canvas module
const registry = new PraxisRegistry<CanvasContext>();
registry.registerModule(canvasModule);

// Create the reactive engine with initial state
export const canvasEngine = createPraxisEngine<CanvasContext>({
  initialContext: {
    canvas: {
      id: "default",
      name: "Untitled Canvas",
      description: "",
      nodes: [],
      connections: [],
      version: "1.0.0",
    },
    nodeData: {},
    navStack: [],
  },
  registry,
});

// Export a convenience API that matches the old store interface
export const canvasPraxisStore = {
  // The reactive context - use in Svelte components with $derived
  get context() {
    return canvasEngine.getContext();
  },

  get canvas() {
    return canvasEngine.getContext().canvas;
  },

  get nodeData() {
    return canvasEngine.getContext().nodeData;
  },

  // Actions
  addNode: (node: CanvasNode) => {
    canvasEngine.step([AddNodeEvent.create({ node })]);
  },

  removeNode: (nodeId: string) => {
    canvasEngine.step([RemoveNodeEvent.create({ nodeId })]);
  },

  updateNode: (nodeId: string, updates: Partial<CanvasNode>) => {
    canvasEngine.step([UpdateNodeEvent.create({ nodeId, updates })]);
  },

  updateNodePosition: (nodeId: string, x: number, y: number) => {
    canvasEngine.step([UpdateNodePositionEvent.create({ nodeId, x, y })]);
  },

  addConnection: (connection: Connection) => {
    canvasEngine.step([AddConnectionEvent.create({ connection })]);
  },

  removeConnection: (
    from: string,
    to: string,
    fromPort: string,
    toPort: string,
  ) => {
    canvasEngine.step([
      RemoveConnectionEvent.create({ from, to, fromPort, toPort }),
    ]);
  },

  loadCanvas: (canvas: Canvas) => {
    canvasEngine.step([LoadCanvasEvent.create({ canvas })]);
  },

  clear: () => {
    canvasEngine.step([ClearCanvasEvent.create({})]);
  },

  updateNodeData: (nodeId: string, portId: string, data: any) => {
    canvasEngine.step([UpdateNodeDataEvent.create({ nodeId, portId, data })]);
  },

  navigateInto: (nodeId: string, label: string) => {
    canvasEngine.step([NavigateIntoSubCanvasEvent.create({ nodeId, label })]);
  },

  navigateUp: () => {
    canvasEngine.step([NavigateUpEvent.create({})]);
  },

  get navStack() {
    return canvasEngine.getContext().navStack;
  },

  // Helper to get node input data from connections
  getNodeInputData: (nodeId: string, portId: string) => {
    const context = canvasEngine.getContext();
    const connections = context.canvas.connections;
    const nodeData = context.nodeData;
    const connection = connections.find(
      (c) => c.to === nodeId && c.toPort === portId,
    );
    if (connection) {
      return nodeData[`${connection.from}:${connection.fromPort}`];
    }
    return undefined;
  },
};
