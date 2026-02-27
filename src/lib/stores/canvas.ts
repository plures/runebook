// Re-export the praxis-based canvas store for backward compatibility
// This maintains the same API while using Praxis reactive engine underneath

import {
  canvasEngine,
  type CanvasContext,
  AddNodeEvent,
  RemoveNodeEvent,
  UpdateNodeEvent,
  UpdateNodePositionEvent,
  AddConnectionEvent,
  RemoveConnectionEvent,
  LoadCanvasEvent,
  ClearCanvasEvent,
  UpdateNodeDataEvent,
} from './canvas-praxis';
import { createPraxisStore } from '@plures/praxis/svelte';
import type { Canvas, CanvasNode, Connection } from '../types/canvas';

// Create a Svelte store from the praxis engine.
// All mutations go through praxisStore.dispatch() so that subscribers are
// notified both in Svelte component contexts and in plain Node/test environments.
const praxisStore = createPraxisStore<CanvasContext>(canvasEngine);

// Create a derived store for just the canvas
export const canvasStore = {
  subscribe: (fn: (value: Canvas) => void) => {
    return praxisStore.subscribe((state) => {
      fn(state.context.canvas);
    });
  },
  set: (canvas: Canvas) => praxisStore.dispatch([LoadCanvasEvent.create({ canvas })]),
  addNode: (node: CanvasNode) => praxisStore.dispatch([AddNodeEvent.create({ node })]),
  removeNode: (nodeId: string) => praxisStore.dispatch([RemoveNodeEvent.create({ nodeId })]),
  updateNode: (nodeId: string, updates: Partial<CanvasNode>) => praxisStore.dispatch([UpdateNodeEvent.create({ nodeId, updates })]),
  updateNodePosition: (nodeId: string, x: number, y: number) => praxisStore.dispatch([UpdateNodePositionEvent.create({ nodeId, x, y })]),
  addConnection: (connection: Connection) => praxisStore.dispatch([AddConnectionEvent.create({ connection })]),
  removeConnection: (from: string, to: string, fromPort: string, toPort: string) => praxisStore.dispatch([RemoveConnectionEvent.create({ from, to, fromPort, toPort })]),
  loadCanvas: (canvas: Canvas) => praxisStore.dispatch([LoadCanvasEvent.create({ canvas })]),
  clear: () => praxisStore.dispatch([ClearCanvasEvent.create({})]),
};

// Create a derived store for node data
export const nodeDataStore = {
  subscribe: (fn: (value: Record<string, any>) => void) => {
    return praxisStore.subscribe((state) => {
      fn(state.context.nodeData);
    });
  },
  set: (data: Record<string, any>) => {
    // Not typically used, but provided for compatibility
    const context = canvasEngine.getContext();
    context.nodeData = data;
  },
  update: (fn: (value: Record<string, any>) => Record<string, any>) => {
    const context = canvasEngine.getContext();
    context.nodeData = fn(context.nodeData);
  }
};

// Helper to update node output data
export function updateNodeData(nodeId: string, portId: string, data: any) {
  praxisStore.dispatch([UpdateNodeDataEvent.create({ nodeId, portId, data })]);
}

// Helper to get node input data from connections
export function getNodeInputData(nodeId: string, portId: string, connections: Connection[], nodeData: Record<string, any>) {
  const connection = connections.find(c => c.to === nodeId && c.toPort === portId);
  if (connection) {
    return nodeData[`${connection.from}:${connection.fromPort}`];
  }
  return undefined;
}
