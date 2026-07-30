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

  const makeTextNode = (id: string): CanvasNode => ({
    id,
    type: 'text',
    position: { x: 0, y: 0 },
    label: `Node ${id}`,
    content: '',
    inputs: [],
    outputs: [],
  });

  /** Create a node with standard in/out ports for connection tests */
  /** Create a node with standard in/out ports for connection tests */
  const makeWiredNode = (id: string, opts?: { inputs?: { id: string; name?: string; type?: string; dataType?: string }[]; outputs?: { id: string; name?: string; type?: string; dataType?: string }[] }): CanvasNode => ({
    id,
    type: 'text',
    position: { x: 0, y: 0 },
    label: `Node ${id}`,
    content: '',
    inputs: (opts?.inputs ?? [{ id: 'in', dataType: undefined }]).map(p => ({ id: p.id, name: p.name ?? p.id, type: 'input' as const, dataType: p.dataType })),
    outputs: (opts?.outputs ?? [{ id: 'out', dataType: undefined }]).map(p => ({ id: p.id, name: p.name ?? p.id, type: 'output' as const, dataType: p.dataType })),
  });

  describe('addNode', () => {
    it('should add a node to the canvas', () => {
      const node = makeTextNode('n1');
      canvasPraxisStore.addNode(node);
      const canvas = canvasPraxisStore.canvas;
      expect(canvas.nodes).toHaveLength(1);
      expect(canvas.nodes[0].id).toBe('n1');
    });

    it('should add multiple nodes', () => {
      canvasPraxisStore.addNode(makeTextNode('n1'));
      canvasPraxisStore.addNode(makeTextNode('n2'));
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(2);
    });
  });

  describe('removeNode', () => {
    it('should remove a node from the canvas', () => {
      canvasPraxisStore.addNode(makeTextNode('n1'));
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(0);
    });

    it('should remove connections involving the removed node', () => {
      canvasPraxisStore.addNode(makeWiredNode('n1'));
      canvasPraxisStore.addNode(makeWiredNode('n2'));
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    });

    it('should clean up node data when node is removed', () => {
      canvasPraxisStore.addNode(makeTextNode('n1'));
      canvasPraxisStore.updateNodeData('n1', 'out', 'some data');
      canvasPraxisStore.removeNode('n1');
      expect(canvasPraxisStore.nodeData['n1:out']).toBeUndefined();
    });
  });

  describe('updateNode', () => {
    it('should update node properties', () => {
      canvasPraxisStore.addNode(makeTextNode('n1'));
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
      canvasPraxisStore.addNode(makeTextNode('n1'));
      canvasPraxisStore.updateNodePosition('n1', 100, 200);
      const node = canvasPraxisStore.canvas.nodes.find(n => n.id === 'n1');
      expect(node?.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('addConnection', () => {
    it('should add a connection', () => {
      canvasPraxisStore.addNode(makeWiredNode('n1'));
      canvasPraxisStore.addNode(makeWiredNode('n2'));
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      canvasPraxisStore.addNode(makeWiredNode('n1'));
      canvasPraxisStore.addNode(makeWiredNode('n2'));
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeConnection('n1', 'n2', 'out', 'in');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    });

    it('should not remove connections that do not match all fields', () => {
      canvasPraxisStore.addNode(makeWiredNode('n1'));
      canvasPraxisStore.addNode(makeWiredNode('n2'));
      const conn: Connection = { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' };
      canvasPraxisStore.addConnection(conn);
      canvasPraxisStore.removeConnection('n1', 'n2', 'out', 'other-port');
      expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    });
  });

  describe('loadCanvas', () => {
    it('should replace the canvas with the provided canvas', () => {
      canvasPraxisStore.addNode(makeTextNode('n1'));
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
      canvasPraxisStore.addNode(makeTextNode('n1'));
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
      canvasPraxisStore.addNode(makeWiredNode('n1'));
      canvasPraxisStore.addNode(makeWiredNode('n2'));
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

    it('should expose navStack through context', () => {
      const ctx = canvasPraxisStore.context;
      expect(Array.isArray(ctx.navStack)).toBe(true);
    });
  });

  describe('sub-canvas navigation', () => {
    const makeSubCanvasNode = (id: string): import('../../types/canvas').SubCanvasNode => ({
      id,
      type: 'sub-canvas',
      position: { x: 0, y: 0 },
      label: 'Inner',
      inputs: [],
      outputs: [],
      children: {
        id: `canvas-${id}`,
        name: 'Inner Canvas',
        description: '',
        nodes: [],
        connections: [],
        version: '1.0.0',
      },
    });

    it('should navigate into a sub-canvas node', () => {
      const sub = makeSubCanvasNode('sub1');
      canvasPraxisStore.addNode(sub);
      canvasPraxisStore.navigateInto('sub1', 'Inner');
      expect(canvasPraxisStore.navStack).toHaveLength(1);
      expect(canvasPraxisStore.canvas.id).toBe('canvas-sub1');
    });

    it('should do nothing when navigating into a non-sub-canvas node', () => {
      canvasPraxisStore.addNode(makeTextNode('text1'));
      canvasPraxisStore.navigateInto('text1', 'Text');
      expect(canvasPraxisStore.navStack).toHaveLength(0);
    });

    it('should navigate back up from a sub-canvas', () => {
      const sub = makeSubCanvasNode('sub1');
      canvasPraxisStore.addNode(sub);
      canvasPraxisStore.navigateInto('sub1', 'Inner');
      canvasPraxisStore.navigateUp();
      expect(canvasPraxisStore.navStack).toHaveLength(0);
      expect(canvasPraxisStore.canvas.id).toBe('default');
    });

    it('should save changes made inside sub-canvas back to the parent', () => {
      const sub = makeSubCanvasNode('sub1');
      canvasPraxisStore.addNode(sub);
      canvasPraxisStore.navigateInto('sub1', 'Inner');

      // Add a node inside the sub-canvas
      canvasPraxisStore.addNode(makeTextNode('inner-node'));
      expect(canvasPraxisStore.canvas.nodes).toHaveLength(1);

      canvasPraxisStore.navigateUp();

      // After navigating up the parent sub-canvas node should have the inner node
      const updatedSub = canvasPraxisStore.canvas.nodes.find(n => n.id === 'sub1') as import('../../types/canvas').SubCanvasNode;
      expect(updatedSub.children.nodes).toHaveLength(1);
      expect(updatedSub.children.nodes[0].id).toBe('inner-node');
    });

    it('should not navigate up when already at root', () => {
      canvasPraxisStore.navigateUp();
      expect(canvasPraxisStore.navStack).toHaveLength(0);
      expect(canvasPraxisStore.canvas.id).toBe('default');
    });
  });
});

describe('makeConnectionId', () => {
  it('should generate a handle-based ID', async () => {
    const { makeConnectionId } = await import('../canvas-praxis');
    expect(makeConnectionId('n1', 'out', 'n2', 'in')).toBe('e-n1-out-n2-in');
  });

  it('should produce distinct IDs for different port combinations', async () => {
    const { makeConnectionId } = await import('../canvas-praxis');
    const id1 = makeConnectionId('n1', 'out', 'n2', 'in');
    const id2 = makeConnectionId('n1', 'out2', 'n2', 'in');
    const id3 = makeConnectionId('n1', 'out', 'n2', 'in2');
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id2).not.toBe(id3);
  });
});

describe('canvas-praxis facts', () => {
  let canvasPraxisStore: typeof import('../canvas-praxis')['canvasPraxisStore'];
  let canvasEngine: typeof import('../canvas-praxis')['canvasEngine'];
  let AddNodeEvent: typeof import('../canvas-praxis')['AddNodeEvent'];
  let RemoveNodeEvent: typeof import('../canvas-praxis')['RemoveNodeEvent'];
  let UpdateNodeEvent: typeof import('../canvas-praxis')['UpdateNodeEvent'];
  let UpdateNodePositionEvent: typeof import('../canvas-praxis')['UpdateNodePositionEvent'];
  let AddConnectionEvent: typeof import('../canvas-praxis')['AddConnectionEvent'];
  let RemoveConnectionEvent: typeof import('../canvas-praxis')['RemoveConnectionEvent'];
  let LoadCanvasEvent: typeof import('../canvas-praxis')['LoadCanvasEvent'];
  let ClearCanvasEvent: typeof import('../canvas-praxis')['ClearCanvasEvent'];
  let UpdateNodeDataEvent: typeof import('../canvas-praxis')['UpdateNodeDataEvent'];
  let NavigateIntoSubCanvasEvent: typeof import('../canvas-praxis')['NavigateIntoSubCanvasEvent'];
  let NavigateUpEvent: typeof import('../canvas-praxis')['NavigateUpEvent'];

  beforeEach(async () => {
    const mod = await import('../canvas-praxis');
    canvasPraxisStore = mod.canvasPraxisStore;
    canvasEngine = mod.canvasEngine;
    AddNodeEvent = mod.AddNodeEvent;
    RemoveNodeEvent = mod.RemoveNodeEvent;
    UpdateNodeEvent = mod.UpdateNodeEvent;
    UpdateNodePositionEvent = mod.UpdateNodePositionEvent;
    AddConnectionEvent = mod.AddConnectionEvent;
    RemoveConnectionEvent = mod.RemoveConnectionEvent;
    LoadCanvasEvent = mod.LoadCanvasEvent;
    ClearCanvasEvent = mod.ClearCanvasEvent;
    UpdateNodeDataEvent = mod.UpdateNodeDataEvent;
    NavigateIntoSubCanvasEvent = mod.NavigateIntoSubCanvasEvent;
    NavigateUpEvent = mod.NavigateUpEvent;
    canvasPraxisStore.clear();
  });

  const makeWiredNode = (id: string): CanvasNode => ({
    id,
    type: 'text',
    position: { x: 0, y: 0 },
    label: `Node ${id}`,
    content: '',
    inputs: [{ id: 'in', name: 'in', type: 'input' as const, dataType: undefined }],
    outputs: [{ id: 'out', name: 'out', type: 'output' as const, dataType: undefined }],
  });

  it('should emit NODE_ADDED_FACT when adding a node', async () => {
    const { NODE_ADDED_FACT } = await import('../canvas-praxis');
    const node = makeWiredNode('n1');
    const result = canvasEngine.step([AddNodeEvent.create({ node })]);
    const addedFact = result.state.facts.find(f => f.tag === NODE_ADDED_FACT);
    expect(addedFact).toBeDefined();
    expect((addedFact?.payload as any).nodeId).toBe('n1');
  });

  it('should emit NODE_REMOVED_FACT when removing a node', async () => {
    const { NODE_REMOVED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    const result = canvasEngine.step([RemoveNodeEvent.create({ nodeId: 'n1' })]);
    const removedFact = result.state.facts.find(f => f.tag === NODE_REMOVED_FACT);
    expect(removedFact).toBeDefined();
    expect((removedFact?.payload as any).nodeId).toBe('n1');
  });

  it('should emit NODE_UPDATED_FACT when updating a node', async () => {
    const { NODE_UPDATED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    const result = canvasEngine.step([UpdateNodeEvent.create({ nodeId: 'n1', updates: { label: 'X' } })]);
    const updatedFact = result.state.facts.find(f => f.tag === NODE_UPDATED_FACT);
    expect(updatedFact).toBeDefined();
    expect((updatedFact?.payload as any).nodeId).toBe('n1');
  });

  it('should emit NODE_POSITION_UPDATED_FACT when updating position', async () => {
    const { NODE_POSITION_UPDATED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    const result = canvasEngine.step([UpdateNodePositionEvent.create({ nodeId: 'n1', x: 10, y: 20 })]);
    const posFact = result.state.facts.find(f => f.tag === NODE_POSITION_UPDATED_FACT);
    expect(posFact).toBeDefined();
    expect((posFact?.payload as any).nodeId).toBe('n1');
  });

  it('should emit CONNECTION_ADDED_FACT when adding a valid connection', async () => {
    const { CONNECTION_ADDED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    canvasPraxisStore.addNode(makeWiredNode('n2'));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' } })]);
    const connFact = result.state.facts.find(f => f.tag === CONNECTION_ADDED_FACT);
    expect(connFact).toBeDefined();
    expect((connFact?.payload as any).from).toBe('n1');
    expect((connFact?.payload as any).to).toBe('n2');
  });

  it('should emit CONNECTION_REMOVED_FACT when removing a connection', async () => {
    const { CONNECTION_REMOVED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    canvasPraxisStore.addNode(makeWiredNode('n2'));
    canvasPraxisStore.addConnection({ from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' });
    const result = canvasEngine.step([RemoveConnectionEvent.create({ from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' })]);
    const removedFact = result.state.facts.find(f => f.tag === CONNECTION_REMOVED_FACT);
    expect(removedFact).toBeDefined();
  });

  it('should emit CANVAS_LOADED_FACT when loading a canvas', async () => {
    const { CANVAS_LOADED_FACT } = await import('../canvas-praxis');
    const result = canvasEngine.step([LoadCanvasEvent.create({ canvas: { id: 'test', name: 'Test', description: '', nodes: [], connections: [], version: '1.0.0' } })]);
    const loadedFact = result.state.facts.find(f => f.tag === CANVAS_LOADED_FACT);
    expect(loadedFact).toBeDefined();
    expect((loadedFact?.payload as any).canvasId).toBe('test');
  });

  it('should emit CANVAS_CLEARED_FACT when clearing', async () => {
    const { CANVAS_CLEARED_FACT } = await import('../canvas-praxis');
    const result = canvasEngine.step([ClearCanvasEvent.create({})]);
    const clearedFact = result.state.facts.find(f => f.tag === CANVAS_CLEARED_FACT);
    expect(clearedFact).toBeDefined();
  });

  it('should emit NODE_DATA_UPDATED_FACT when updating node data', async () => {
    const { NODE_DATA_UPDATED_FACT } = await import('../canvas-praxis');
    const result = canvasEngine.step([UpdateNodeDataEvent.create({ nodeId: 'n1', portId: 'out', data: 42 })]);
    const dataFact = result.state.facts.find(f => f.tag === NODE_DATA_UPDATED_FACT);
    expect(dataFact).toBeDefined();
    expect((dataFact?.payload as any).nodeId).toBe('n1');
  });

  it('should emit NAV_INTO_FACT when navigating into sub-canvas', async () => {
    const { NAV_INTO_FACT } = await import('../canvas-praxis');
    const subNode: CanvasNode = {
      id: 'sub1',
      type: 'sub-canvas',
      position: { x: 0, y: 0 },
      label: 'Inner',
      inputs: [],
      outputs: [],
      children: { id: 'inner', name: 'Inner', description: '', nodes: [], connections: [], version: '1.0.0' },
    } as any;
    canvasPraxisStore.addNode(subNode);
    const result = canvasEngine.step([NavigateIntoSubCanvasEvent.create({ nodeId: 'sub1', label: 'Inner' })]);
    const navFact = result.state.facts.find(f => f.tag === NAV_INTO_FACT);
    expect(navFact).toBeDefined();
    expect((navFact?.payload as any).nodeId).toBe('sub1');
  });

  it('should emit NAV_UP_FACT when navigating up', async () => {
    const { NAV_UP_FACT } = await import('../canvas-praxis');
    const subNode: CanvasNode = {
      id: 'sub1',
      type: 'sub-canvas',
      position: { x: 0, y: 0 },
      label: 'Inner',
      inputs: [],
      outputs: [],
      children: { id: 'inner', name: 'Inner', description: '', nodes: [], connections: [], version: '1.0.0' },
    } as any;
    canvasPraxisStore.addNode(subNode);
    canvasPraxisStore.navigateInto('sub1', 'Inner');
    const result = canvasEngine.step([NavigateUpEvent.create({})]);
    const navFact = result.state.facts.find(f => f.tag === NAV_UP_FACT);
    expect(navFact).toBeDefined();
    expect((navFact?.payload as any).fromNodeId).toBe('sub1');
  });
});

describe('canvas-praxis connection validation', () => {
  let canvasPraxisStore: typeof import('../canvas-praxis')['canvasPraxisStore'];
  let canvasEngine: typeof import('../canvas-praxis')['canvasEngine'];
  let AddConnectionEvent: typeof import('../canvas-praxis')['AddConnectionEvent'];

  beforeEach(async () => {
    const mod = await import('../canvas-praxis');
    canvasPraxisStore = mod.canvasPraxisStore;
    canvasEngine = mod.canvasEngine;
    AddConnectionEvent = mod.AddConnectionEvent;
    canvasPraxisStore.clear();
  });

  const makeWiredNode = (id: string, opts?: { inputs?: { id: string; name?: string; type?: string; dataType?: string }[]; outputs?: { id: string; name?: string; type?: string; dataType?: string }[] }): CanvasNode => ({
    id,
    type: 'text',
    position: { x: 0, y: 0 },
    label: `Node ${id}`,
    content: '',
    inputs: (opts?.inputs ?? [{ id: 'in', dataType: undefined }]).map(p => ({ id: p.id, name: p.name ?? p.id, type: 'input' as const, dataType: p.dataType })),
    outputs: (opts?.outputs ?? [{ id: 'out', dataType: undefined }]).map(p => ({ id: p.id, name: p.name ?? p.id, type: 'output' as const, dataType: p.dataType })),
  });

  it('should reject self-loop connections', async () => {
    const { CONNECTION_REJECTED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n1', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    const rejected = result.state.facts.find(f => f.tag === CONNECTION_REJECTED_FACT);
    expect(rejected).toBeDefined();
    expect((rejected?.payload as any).reason).toBe('self-loop');
  });

  it('should reject connections with unknown source node', async () => {
    const { CONNECTION_REJECTED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n2'));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'ghost', to: 'n2', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    const rejected = result.state.facts.find(f => f.tag === CONNECTION_REJECTED_FACT);
    expect(rejected).toBeDefined();
    expect((rejected?.payload as any).reason).toContain('unknown-node');
  });

  it('should reject connections with unknown target node', async () => {
    const { CONNECTION_REJECTED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'ghost', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    const rejected = result.state.facts.find(f => f.tag === CONNECTION_REJECTED_FACT);
    expect(rejected).toBeDefined();
    expect((rejected?.payload as any).reason).toContain('unknown-node');
  });

  it('should reject connections with unknown port', async () => {
    const { CONNECTION_REJECTED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1'));
    canvasPraxisStore.addNode(makeWiredNode('n2'));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n2', fromPort: 'nonexistent', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    const rejected = result.state.facts.find(f => f.tag === CONNECTION_REJECTED_FACT);
    expect(rejected).toBeDefined();
    expect((rejected?.payload as any).reason).toContain('unknown-port');
  });

  it('should reject connections with incompatible port types', async () => {
    const { CONNECTION_REJECTED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1', { outputs: [{ id: 'out', dataType: 'string' }] }));
    canvasPraxisStore.addNode(makeWiredNode('n2', { inputs: [{ id: 'in', dataType: 'number' }] }));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(0);
    const rejected = result.state.facts.find(f => f.tag === CONNECTION_REJECTED_FACT);
    expect(rejected).toBeDefined();
    expect((rejected?.payload as any).reason).toContain('type-mismatch');
  });

  it('should allow connections between compatible typed ports', async () => {
    const { CONNECTION_ADDED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1', { outputs: [{ id: 'out', dataType: 'string' }] }));
    canvasPraxisStore.addNode(makeWiredNode('n2', { inputs: [{ id: 'in', dataType: 'string' }] }));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    const addedFact = result.state.facts.find(f => f.tag === CONNECTION_ADDED_FACT);
    expect(addedFact).toBeDefined();
  });

  it('should allow connections when ports are untyped (any)', async () => {
    const { CONNECTION_ADDED_FACT } = await import('../canvas-praxis');
    canvasPraxisStore.addNode(makeWiredNode('n1', { outputs: [{ id: 'out', dataType: 'string' }] }));
    canvasPraxisStore.addNode(makeWiredNode('n2', { inputs: [{ id: 'in', dataType: undefined }] }));
    const result = canvasEngine.step([AddConnectionEvent.create({ connection: { from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' } })]);
    expect(canvasPraxisStore.canvas.connections).toHaveLength(1);
    const addedFact = result.state.facts.find(f => f.tag === CONNECTION_ADDED_FACT);
    expect(addedFact).toBeDefined();
  });
});

describe('validateConnectionPure', () => {
  let validateConnectionPure: typeof import('../canvas-praxis')['validateConnectionPure'];

  beforeEach(async () => {
    const mod = await import('../canvas-praxis');
    validateConnectionPure = mod.validateConnectionPure;
  });

  const makeNode = (id: string, inputs: any[] = [], outputs: any[] = []): CanvasNode => ({
    id,
    type: 'text',
    position: { x: 0, y: 0 },
    label: id,
    content: '',
    inputs,
    outputs,
  });

  it('should reject self-loops', () => {
    const nodes = [makeNode('n1', [{ id: 'in' }], [{ id: 'out' }])];
    const result = validateConnectionPure({ from: 'n1', to: 'n1', fromPort: 'out', toPort: 'in' }, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('self-loop');
  });

  it('should reject unknown source node', () => {
    const nodes = [makeNode('n2', [{ id: 'in' }], [])];
    const result = validateConnectionPure({ from: 'ghost', to: 'n2', fromPort: 'out', toPort: 'in' }, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('unknown-node');
  });

  it('should reject unknown port', () => {
    const nodes = [
      makeNode('n1', [], [{ id: 'out' }]),
      makeNode('n2', [{ id: 'in' }], []),
    ];
    const result = validateConnectionPure({ from: 'n1', to: 'n2', fromPort: 'missing', toPort: 'in' }, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('unknown-port');
  });

  it('should reject type mismatches', () => {
    const nodes = [
      makeNode('n1', [], [{ id: 'out', dataType: 'string' }]),
      makeNode('n2', [{ id: 'in', dataType: 'number' }], []),
    ];
    const result = validateConnectionPure({ from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' }, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('type-mismatch');
  });

  it('should accept compatible connections', () => {
    const nodes = [
      makeNode('n1', [], [{ id: 'out', dataType: 'string' }]),
      makeNode('n2', [{ id: 'in', dataType: 'string' }], []),
    ];
    const result = validateConnectionPure({ from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' }, nodes);
    expect(result.valid).toBe(true);
  });
});
