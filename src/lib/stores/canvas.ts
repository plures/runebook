// Re-export the praxis-based canvas store for backward compatibility
// This maintains the same API while using Praxis reactive engine underneath

import { canvasPraxisStore, praxisStoreInternal, canvasEngine, type CanvasContext } from './canvas-praxis';
import type { Canvas, CanvasNode, Connection } from '../types/canvas';

// Use the praxis store from canvas-praxis instead of creating a new one
const praxisStore = praxisStoreInternal;

// Create a derived store for just the canvas
export const canvasStore = {
  subscribe: (fn: (value: Canvas) => void) => {
    return praxisStore.subscribe((state) => {
      fn(state.context.canvas);
    });
  },
  set: (canvas: Canvas) => canvasPraxisStore.loadCanvas(canvas),
  addNode: canvasPraxisStore.addNode,
  removeNode: canvasPraxisStore.removeNode,
  updateNode: canvasPraxisStore.updateNode,
  updateNodePosition: canvasPraxisStore.updateNodePosition,
  addConnection: canvasPraxisStore.addConnection,
  removeConnection: canvasPraxisStore.removeConnection,
  loadCanvas: canvasPraxisStore.loadCanvas,
  clear: canvasPraxisStore.clear
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
  canvasPraxisStore.updateNodeData(nodeId, portId, data);
}

// Helper to get node input data from connections
export function getNodeInputData(nodeId: string, portId: string, connections: Connection[], nodeData: Record<string, any>) {
  const connection = connections.find(c => c.to === nodeId && c.toPort === portId);
  if (connection) {
    return nodeData[`${connection.from}:${connection.fromPort}`];
  }
  return undefined;
}
