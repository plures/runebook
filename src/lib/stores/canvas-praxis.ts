// Praxis-based canvas state management for RuneBook
// Uses Praxis reactive engine for type-safe, testable state management

import { createPraxisEngine, defineEvent, defineRule, PraxisRegistry } from '@plures/praxis';
import { createPraxisStore } from '@plures/praxis/svelte';
import type { PraxisState, PraxisEvent } from '@plures/praxis';
import type { Canvas, CanvasNode, Connection } from '../types/canvas';

// Define the canvas context type
export interface CanvasContext {
  canvas: Canvas;
  nodeData: Record<string, any>; // Node output data: `${nodeId}:${portId}` -> data
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

// Define rules for canvas operations
const addNodeRule = defineRule<CanvasContext>({
  id: 'canvas.addNode',
  description: 'Add a new node to the canvas',
  impl: (state, events) => {
    const evt = events.find(AddNodeEvent.is);
    if (!evt) return [];
    
    state.context.canvas.nodes = [...state.context.canvas.nodes, evt.payload.node];
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
    state.context.canvas.nodes = state.context.canvas.nodes.filter(n => n.id !== nodeId);
    state.context.canvas.connections = state.context.canvas.connections.filter(
      c => c.from !== nodeId && c.to !== nodeId
    );
    
    // Remove node data
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
    const nodeIndex = state.context.canvas.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      state.context.canvas.nodes[nodeIndex] = {
        ...state.context.canvas.nodes[nodeIndex],
        ...updates
      } as CanvasNode;
    }
    
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
    const nodeIndex = state.context.canvas.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      state.context.canvas.nodes[nodeIndex].position = { x, y };
    }
    
    return [];
  },
});

const addConnectionRule = defineRule<CanvasContext>({
  id: 'canvas.addConnection',
  description: 'Add a connection between nodes',
  impl: (state, events) => {
    const evt = events.find(AddConnectionEvent.is);
    if (!evt) return [];
    
    state.context.canvas.connections = [...state.context.canvas.connections, evt.payload.connection];
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
    state.context.canvas.connections = state.context.canvas.connections.filter(
      c => !(c.from === from && c.to === to && c.fromPort === fromPort && c.toPort === toPort)
    );
    
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
    nodeData: {}
  },
  registry
});

// Create the Praxis store that properly notifies subscribers
export const canvasPraxisStoreInstance = createPraxisStore<CanvasContext>(canvasEngine);

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
    canvasPraxisStoreInstance.dispatch([AddNodeEvent.create({ node })]);
  },
  
  removeNode: (nodeId: string) => {
    canvasPraxisStoreInstance.dispatch([RemoveNodeEvent.create({ nodeId })]);
  },
  
  updateNode: (nodeId: string, updates: Partial<CanvasNode>) => {
    canvasPraxisStoreInstance.dispatch([UpdateNodeEvent.create({ nodeId, updates })]);
  },
  
  updateNodePosition: (nodeId: string, x: number, y: number) => {
    canvasPraxisStoreInstance.dispatch([UpdateNodePositionEvent.create({ nodeId, x, y })]);
  },
  
  addConnection: (connection: Connection) => {
    canvasPraxisStoreInstance.dispatch([AddConnectionEvent.create({ connection })]);
  },
  
  removeConnection: (from: string, to: string, fromPort: string, toPort: string) => {
    canvasPraxisStoreInstance.dispatch([RemoveConnectionEvent.create({ from, to, fromPort, toPort })]);
  },
  
  loadCanvas: (canvas: Canvas) => {
    canvasPraxisStoreInstance.dispatch([LoadCanvasEvent.create({ canvas })]);
  },
  
  clear: () => {
    canvasPraxisStoreInstance.dispatch([ClearCanvasEvent.create({})]);
  },
  
  updateNodeData: (nodeId: string, portId: string, data: any) => {
    canvasPraxisStoreInstance.dispatch([UpdateNodeDataEvent.create({ nodeId, portId, data })]);
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
