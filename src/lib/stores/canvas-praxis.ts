// Praxis-based canvas state management for RuneBook
// Uses Praxis reactive engine for type-safe, testable state management

import { createPraxisEngine, defineEvent, defineRule, PraxisRegistry } from '@plures/praxis';
import { createPraxisStore } from '@plures/praxis/svelte';
import type { PraxisState, PraxisEvent } from '@plures/praxis';
import type { Canvas, CanvasNode, Connection, SubCanvasNode } from '../types/canvas';

// Define the canvas context type
export interface CanvasContext {
  canvas: Canvas;
  nodeData: Record<string, any>; // Node output data: `${nodeId}:${portId}` -> data
  /** Navigation path: array of SubCanvasNode IDs from root to current level */
  navigationPath: string[];
}

// ---------------------------------------------------------------------------
// Path-aware canvas helpers
// ---------------------------------------------------------------------------

/** Return the canvas at the given navigation path (or root if path is empty). */
export function getCanvasAtPath(ctx: CanvasContext, path: string[]): Canvas {
  let canvas = ctx.canvas;
  for (const nodeId of path) {
    const node = canvas.nodes.find(n => n.id === nodeId) as SubCanvasNode | undefined;
    if (!node || node.type !== 'sub-canvas') break;
    canvas = node.canvas;
  }
  return canvas;
}

/** Apply a mutation to the canvas at the given navigation path. */
function mutateCanvasAtPath(ctx: CanvasContext, path: string[], mutate: (canvas: Canvas) => void): void {
  if (path.length === 0) {
    mutate(ctx.canvas);
    return;
  }
  const walk = (canvas: Canvas, depth: number): void => {
    if (depth === path.length) {
      mutate(canvas);
      return;
    }
    const idx = canvas.nodes.findIndex(n => n.id === path[depth]);
    const node = canvas.nodes[idx] as SubCanvasNode | undefined;
    if (!node || node.type !== 'sub-canvas') return;
    // Clone the sub-canvas so Praxis reactivity picks up the change
    const subCanvas = { ...node.canvas, nodes: [...node.canvas.nodes], connections: [...node.canvas.connections] };
    walk(subCanvas, depth + 1);
    (canvas.nodes[idx] as SubCanvasNode) = { ...node, canvas: subCanvas };
  };
  walk(ctx.canvas, 0);
}

// Define events for canvas operations
export const AddNodeEvent = defineEvent<'ADD_NODE', { node: CanvasNode }>('ADD_NODE');
export const RemoveNodeEvent = defineEvent<'REMOVE_NODE', { nodeId: string }>('REMOVE_NODE');
export const UpdateNodeEvent = defineEvent<'UPDATE_NODE', { nodeId: string; updates: Partial<CanvasNode> }>('UPDATE_NODE');
export const UpdateNodePositionEvent = defineEvent<'UPDATE_NODE_POSITION', { nodeId: string; x: number; y: number }>('UPDATE_NODE_POSITION');
export const AddConnectionEvent = defineEvent<'ADD_CONNECTION', { connection: Connection }>('ADD_CONNECTION');
export const RemoveConnectionEvent = defineEvent<'REMOVE_CONNECTION', { from: string; to: string; fromPort: string; toPort: string }>('REMOVE_CONNECTION');
export const LoadCanvasEvent = defineEvent<'LOAD_CANVAS', { canvas: Canvas }>('LOAD_CANVAS');
export const ClearCanvasEvent = defineEvent<'CLEAR_CANVAS', {}>('CLEAR_CANVAS');
export const UpdateNodeDataEvent = defineEvent<'UPDATE_NODE_DATA', { nodeId: string; portId: string; data: any }>('UPDATE_NODE_DATA');

// Navigation events
export const NavigateIntoEvent = defineEvent<'NAVIGATE_INTO', { nodeId: string }>('NAVIGATE_INTO');
export const NavigateOutEvent = defineEvent<'NAVIGATE_OUT', Record<string, never>>('NAVIGATE_OUT');
export const NavigateToRootEvent = defineEvent<'NAVIGATE_TO_ROOT', Record<string, never>>('NAVIGATE_TO_ROOT');

// Define rules for canvas operations
const addNodeRule = defineRule<CanvasContext>({
  id: 'canvas.addNode',
  description: 'Add a new node to the canvas',
  impl: (state, events) => {
    const evt = events.find(AddNodeEvent.is);
    if (!evt) return [];
    
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      canvas.nodes.push(evt.payload.node);
    });
    return [];
  },
});

const removeNodeRule = defineRule<CanvasContext>({
  id: 'canvas.removeNode',
  description: 'Remove a node from the canvas',
  impl: (state, events) => {
    const evt = events.find(RemoveNodeEvent.is);
    if (!evt) return [];
    
    const { nodeId } = evt.payload;
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      canvas.nodes = canvas.nodes.filter(n => n.id !== nodeId);
      canvas.connections = canvas.connections.filter(
        c => c.from !== nodeId && c.to !== nodeId
      );
    });
    
    // Remove node data (always at root-level nodeData)
    const prefix = `${nodeId}:`;
    state.context.nodeData = Object.fromEntries(
      Object.entries(state.context.nodeData).filter(([key]) => !key.startsWith(prefix))
    );
    
    return [];
  },
});

const updateNodeRule = defineRule<CanvasContext>({
  id: 'canvas.updateNode',
  description: 'Update a node\'s properties',
  impl: (state, events) => {
    const evt = events.find(UpdateNodeEvent.is);
    if (!evt) return [];
    
    const { nodeId, updates } = evt.payload;
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      const nodeIndex = canvas.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        canvas.nodes[nodeIndex] = {
          ...canvas.nodes[nodeIndex],
          ...updates
        } as CanvasNode;
      }
    });
    
    return [];
  },
});

const updateNodePositionRule = defineRule<CanvasContext>({
  id: 'canvas.updateNodePosition',
  description: 'Update a node\'s position',
  impl: (state, events) => {
    const evt = events.find(UpdateNodePositionEvent.is);
    if (!evt) return [];
    
    const { nodeId, x, y } = evt.payload;
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      const nodeIndex = canvas.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        canvas.nodes[nodeIndex].position = { x, y };
      }
    });
    
    return [];
  },
});

const addConnectionRule = defineRule<CanvasContext>({
  id: 'canvas.addConnection',
  description: 'Add a connection between nodes',
  impl: (state, events) => {
    const evt = events.find(AddConnectionEvent.is);
    if (!evt) return [];
    
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      canvas.connections.push(evt.payload.connection);
    });
    return [];
  },
});

const removeConnectionRule = defineRule<CanvasContext>({
  id: 'canvas.removeConnection',
  description: 'Remove a connection',
  impl: (state, events) => {
    const evt = events.find(RemoveConnectionEvent.is);
    if (!evt) return [];
    
    const { from, to, fromPort, toPort } = evt.payload;
    mutateCanvasAtPath(state.context, state.context.navigationPath, canvas => {
      canvas.connections = canvas.connections.filter(
        c => !(c.from === from && c.to === to && c.fromPort === fromPort && c.toPort === toPort)
      );
    });
    
    return [];
  },
});

const loadCanvasRule = defineRule<CanvasContext>({
  id: 'canvas.loadCanvas',
  description: 'Load a canvas from data',
  impl: (state, events) => {
    const evt = events.find(LoadCanvasEvent.is);
    if (!evt) return [];
    
    state.context.canvas = evt.payload.canvas;
    state.context.navigationPath = [];
    return [];
  },
});

const clearCanvasRule = defineRule<CanvasContext>({
  id: 'canvas.clearCanvas',
  description: 'Clear the canvas',
  impl: (state, events) => {
    const evt = events.find(ClearCanvasEvent.is);
    if (!evt) return [];
    
    state.context.canvas = {
      id: 'default',
      name: 'Untitled Canvas',
      description: '',
      nodes: [],
      connections: [],
      version: '1.0.0'
    };
    state.context.nodeData = {};
    state.context.navigationPath = [];
    
    return [];
  },
});

const updateNodeDataRule = defineRule<CanvasContext>({
  id: 'canvas.updateNodeData',
  description: 'Update node output data',
  impl: (state, events) => {
    const evt = events.find(UpdateNodeDataEvent.is);
    if (!evt) return [];
    
    const { nodeId, portId, data } = evt.payload;
    state.context.nodeData[`${nodeId}:${portId}`] = data;
    
    return [];
  },
});

const navigateIntoRule = defineRule<CanvasContext>({
  id: 'canvas.navigateInto',
  description: 'Navigate into a sub-canvas node',
  impl: (state, events) => {
    const evt = events.find(NavigateIntoEvent.is);
    if (!evt) return [];
    state.context.navigationPath = [...state.context.navigationPath, evt.payload.nodeId];
    return [];
  },
});

const navigateOutRule = defineRule<CanvasContext>({
  id: 'canvas.navigateOut',
  description: 'Navigate out of the current sub-canvas',
  impl: (state, events) => {
    const evt = events.find(NavigateOutEvent.is);
    if (!evt) return [];
    state.context.navigationPath = state.context.navigationPath.slice(0, -1);
    return [];
  },
});

const navigateToRootRule = defineRule<CanvasContext>({
  id: 'canvas.navigateToRoot',
  description: 'Navigate back to the root canvas',
  impl: (state, events) => {
    const evt = events.find(NavigateToRootEvent.is);
    if (!evt) return [];
    state.context.navigationPath = [];
    return [];
  },
});

// Create the registry and register all rules
const registry = new PraxisRegistry<CanvasContext>();
registry.registerRule(addNodeRule);
registry.registerRule(removeNodeRule);
registry.registerRule(updateNodeRule);
registry.registerRule(updateNodePositionRule);
registry.registerRule(addConnectionRule);
registry.registerRule(removeConnectionRule);
registry.registerRule(loadCanvasRule);
registry.registerRule(clearCanvasRule);
registry.registerRule(updateNodeDataRule);
registry.registerRule(navigateIntoRule);
registry.registerRule(navigateOutRule);
registry.registerRule(navigateToRootRule);

// Create the reactive engine with initial state
export const canvasEngine = createPraxisEngine<CanvasContext>({
  initialContext: {
    canvas: {
      id: 'default',
      name: 'Untitled Canvas',
      description: '',
      nodes: [],
      connections: [],
      version: '1.0.0'
    },
    nodeData: {},
    navigationPath: [],
  },
  registry
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
  
  removeConnection: (from: string, to: string, fromPort: string, toPort: string) => {
    canvasEngine.step([RemoveConnectionEvent.create({ from, to, fromPort, toPort })]);
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
  
  // Navigation
  navigateInto: (nodeId: string) => {
    canvasEngine.step([NavigateIntoEvent.create({ nodeId })]);
  },
  
  navigateOut: () => {
    canvasEngine.step([NavigateOutEvent.create({} as Record<string, never>)]);
  },
  
  navigateToRoot: () => {
    canvasEngine.step([NavigateToRootEvent.create({} as Record<string, never>)]);
  },
  
  get navigationPath() {
    return canvasEngine.getContext().navigationPath;
  },
  
  // Helper to get node input data from connections
  getNodeInputData: (nodeId: string, portId: string) => {
    const context = canvasEngine.getContext();
    const connections = context.canvas.connections;
    const nodeData = context.nodeData;
    const connection = connections.find(c => c.to === nodeId && c.toPort === portId);
    if (connection) {
      return nodeData[`${connection.from}:${connection.fromPort}`];
    }
    return undefined;
  }
};
