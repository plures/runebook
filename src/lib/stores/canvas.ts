import { writable, derived, get } from 'svelte/store';
import type { Canvas, CanvasNode, Connection } from '../types/canvas';

// Create the main canvas store
function createCanvasStore() {
  const { subscribe, set, update } = writable<Canvas>({
    id: 'default',
    name: 'Untitled Canvas',
    description: '',
    nodes: [],
    connections: [],
    version: '1.0.0'
  });

  return {
    subscribe,
    set,
    
    // Add a new node to the canvas
    addNode: (node: CanvasNode) => {
      update(canvas => ({
        ...canvas,
        nodes: [...canvas.nodes, node]
      }));
    },

    // Remove a node from the canvas
    removeNode: (nodeId: string) => {
      update(canvas => ({
        ...canvas,
        nodes: canvas.nodes.filter(n => n.id !== nodeId),
        connections: canvas.connections.filter(
          c => c.from !== nodeId && c.to !== nodeId
        )
      }));
    },

    // Update a node's properties
    updateNode: (nodeId: string, updates: Partial<CanvasNode>) => {
      update(canvas => ({
        ...canvas,
        nodes: canvas.nodes.map(n => 
          n.id === nodeId ? { ...n, ...updates } as CanvasNode : n
        )
      }));
    },

    // Update a node's position
    updateNodePosition: (nodeId: string, x: number, y: number) => {
      update(canvas => ({
        ...canvas,
        nodes: canvas.nodes.map(n =>
          n.id === nodeId ? { ...n, position: { x, y } } : n
        )
      }));
    },

    // Add a connection between nodes
    addConnection: (connection: Connection) => {
      update(canvas => ({
        ...canvas,
        connections: [...canvas.connections, connection]
      }));
    },

    // Remove a connection
    removeConnection: (from: string, to: string, fromPort: string, toPort: string) => {
      update(canvas => ({
        ...canvas,
        connections: canvas.connections.filter(
          c => !(c.from === from && c.to === to && c.fromPort === fromPort && c.toPort === toPort)
        )
      }));
    },

    // Load a canvas from data
    loadCanvas: (canvas: Canvas) => {
      set(canvas);
    },

    // Clear the canvas
    clear: () => {
      set({
        id: 'default',
        name: 'Untitled Canvas',
        description: '',
        nodes: [],
        connections: [],
        version: '1.0.0'
      });
    }
  };
}

export const canvasStore = createCanvasStore();

// Store for node data/outputs (reactive data flow)
export const nodeDataStore = writable<Record<string, any>>({});

// Helper to update node output data
export function updateNodeData(nodeId: string, portId: string, data: any) {
  nodeDataStore.update(store => ({
    ...store,
    [`${nodeId}:${portId}`]: data
  }));
}

// Helper to get node input data from connections
export function getNodeInputData(nodeId: string, portId: string, connections: Connection[], nodeData: Record<string, any>) {
  const connection = connections.find(c => c.to === nodeId && c.toPort === portId);
  if (connection) {
    return nodeData[`${connection.from}:${connection.fromPort}`];
  }
  return undefined;
}
