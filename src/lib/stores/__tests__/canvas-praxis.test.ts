// Tests for canvas-praxis store

import { describe, it, expect, beforeEach } from 'vitest';
import type { CanvasNode, Connection } from '../../types/canvas';

// We need to reset module state between tests by reimporting
describe('canvas-praxis store', () => {
  let canvasPraxisStore: typeof import('../canvas-praxis')['canvasPraxisStore'];
  let canvasEngine: typeof import('../canvas-praxis')['canvasEngine'];

  beforeEach(async () => {
    // Fresh import each time to avoid state leakage across tests
    const mod = await import('../canvas-praxis');
    canvasPraxisStore = mod.canvasPraxisStore;
    canvasEngine = mod.canvasEngine;
    // Reset to clean state
    canvasPraxisStore.clear();
  });

  const makeTerminalNode = (id: string): CanvasNode => ({
    id,
    type: 'terminal',
    position: { x: 0, y: 0 },
    label: `Node ${id}`,
    inputs: [],
    outputs: [],
  });

  describe('addNode', () => {
    it('should add a node to the canvas', () => {
      const node = makeTerminalNode('n1');
      canvasPraxisStore.addNode(node);
      const canvas = canvasPraxisStore.canvas;
      expect(canvas.nodes).toHaveLength(1);
      expect(canvas.nodes[0].id).toBe('n1');
    });

    it('should add multiple nodes', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.addNode(makeTerminalNode('n2'));
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(2);
    });
  });

  describe('removeNode', () => {
    it('should remove a node from the canvas', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(0);
    });

    it('should remove connections involving the removed node', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.addNode(makeTerminalNode('n2'));
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    });

    it('should clean up node data when node is removed', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.updateNodeData('n1', 'out', 'some data');
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.nodeData['n1:out']).toBeUndefined();
    });
  });

  describe('updateNode', () => {
    it('should update node properties', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.updateNode('n1', { label: 'Updated Label' });
      const node = canvasPraxisStore.canvas.nodes.find(n => n.id === 'n1');
      expect(node?.label).toBe('Updated Label');
    });

    it('should not update non-existent node', () => {
      canvasPraxisStore.updateNode('ghost', { label: 'Ghost' });
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(0);
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.updateNodePosition('n1', 100, 200);
      const node = canvasPraxisStore.canvas.nodes.find(n => n.id === 'n1');
      expect(node?.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('addConnection', () => {
    it('should add a connection', () => {
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeConnection('n1', 'n2', 'out', 'in');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    });

    it('should not remove connections that do not match all fields', () => {
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeConnection('n1', 'n2', 'out', 'other-port');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    });
  });

  describe('loadCanvas', () => {
    it('should replace the canvas with the provided canvas', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      const newCanvas = {
        id: 'new-canvas',
        name: 'New Canvas',
        description: '',
        nodes: [],
        connections: [],
        version: '1.0.0',
      };
      canvasPraxisStore.loadCanvas(newCanvas);
      expect(canvasPraxisStore.canvas.id).toBe('new-canvas');
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should reset the canvas to initial state', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.updateNodeData('n1', 'out', 'data');
      canvasPraxisStore.clear();
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(0);
      expect(canvasPraxisStore.canvas.id).toBe('default');
      expect(canvasPraxisStore.nodeData).toEqual({});
    });
  });

  describe('updateNodeData', () => {
    it('should store node output data', () => {
      canvasPraxisStore.updateNodeData('n1', 'out', 42);
      expect(canvasPraxisStore.nodeData['n1:out']).toBe(42);
    });
  });

  describe('getNodeInputData', () => {
    it('should return data from connected source port', () => {
      canvasPraxisStore.addNode(makeTerminalNode('n1'));
      canvasPraxisStore.addNode(makeTerminalNode('n2'));
      canvasPraxisStore.addConnection({ from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' });
      canvasPraxisStore.updateNodeData('n1', 'out', 'hello');
      const result = canvasPraxisStore.getNodeInputData('n2', 'in');
      expect(result).toBe('hello');
    });

    it('should return undefined when no connection exists', () => {
      const result = canvasPraxisStore.getNodeInputData('n2', 'in');
      expect(result).toBeUndefined();
    });
  });

  describe('context accessor', () => {
    it('should expose canvas and nodeData through context', () => {
      const ctx = canvasPraxisStore.context;
      expect(ctx.canvas).toBeDefined();
      expect(ctx.nodeData).toBeDefined();
    });
  });
});
