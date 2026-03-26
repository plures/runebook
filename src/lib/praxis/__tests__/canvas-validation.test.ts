// Tests for canvas-validation PraxisModule

import { describe, it, expect } from 'vitest';
import {
  createPraxisEngine,
  PraxisRegistry,
} from '@plures/praxis';
import {
  canvasValidationModule,
  ValidateConnectionEvent,
  ValidateCanvasStateEvent,
  CONNECTION_VALID_FACT,
  CONNECTION_INVALID_FACT,
  CANVAS_STATE_VALID_FACT,
  CANVAS_STATE_INVALID_FACT,
} from '../canvas-validation';
import type { CanvasValidationContext } from '../canvas-validation';

function makeEngine(nodes = makeNodes()) {
  const registry = new PraxisRegistry<CanvasValidationContext>();
  registry.registerModule(canvasValidationModule);
  return createPraxisEngine<CanvasValidationContext>({
    initialContext: {
      nodes,
      pendingConnection: null,
      validationResult: null,
    },
    registry,
  });
}

function makeNodes() {
  return [
    {
      id: 'n1',
      inputs: [{ id: 'in', dataType: 'string' }],
      outputs: [{ id: 'out', dataType: 'string' }],
    },
    {
      id: 'n2',
      inputs: [{ id: 'in', dataType: 'string' }],
      outputs: [{ id: 'out', dataType: 'number' }],
    },
    {
      id: 'n3',
      inputs: [{ id: 'in' }],
      outputs: [{ id: 'out' }],
    },
  ];
}

describe('canvas-validation module', () => {
  describe('self-loop detection', () => {
    it('rejects a connection from a node to itself', () => {
      const engine = makeEngine();
      const result = engine.step([
        ValidateConnectionEvent.create({ from: 'n1', fromPort: 'out', to: 'n1', toPort: 'in' }),
      ]);
      const facts = result.state.facts;
      const ctx = engine.getContext();
      expect(ctx.validationResult?.valid).toBe(false);
      expect(ctx.validationResult?.reason).toMatch(/self-loop/i);
      const invalidFact = facts.find(f => f.tag === CONNECTION_INVALID_FACT);
      expect(invalidFact).toBeDefined();
      expect((invalidFact?.payload as any).reason).toBe('self-loop');
    });

    it('does not reject a connection between different nodes', () => {
      const engine = makeEngine();
      engine.step([
        ValidateConnectionEvent.create({ from: 'n1', fromPort: 'out', to: 'n2', toPort: 'in' }),
      ]);
      const ctx = engine.getContext();
      expect(ctx.validationResult?.valid).toBe(true);
    });
  });

  describe('port type compatibility', () => {
    it('accepts connections with matching data types', () => {
      const engine = makeEngine();
      const result = engine.step([
        ValidateConnectionEvent.create({ from: 'n1', fromPort: 'out', to: 'n2', toPort: 'in' }),
      ]);
      const validFact = result.state.facts.find(f => f.tag === CONNECTION_VALID_FACT);
      expect(validFact).toBeDefined();
    });

    it('rejects connections with mismatched data types', () => {
      const engine = makeEngine([
        {
          id: 'src',
          inputs: [],
          outputs: [{ id: 'out', dataType: 'number' }],
        },
        {
          id: 'dst',
          inputs: [{ id: 'in', dataType: 'string' }],
          outputs: [],
        },
      ]);
      const result = engine.step([
        ValidateConnectionEvent.create({ from: 'src', fromPort: 'out', to: 'dst', toPort: 'in' }),
      ]);
      const invalidFact = result.state.facts.find(f => f.tag === CONNECTION_INVALID_FACT);
      expect(invalidFact).toBeDefined();
      expect((invalidFact?.payload as any).reason).toBe('type-mismatch');
    });

    it('accepts connections when ports are untyped (any)', () => {
      const engine = makeEngine([
        {
          id: 'a',
          inputs: [{ id: 'in' }],
          outputs: [{ id: 'out' }],
        },
        {
          id: 'b',
          inputs: [{ id: 'in' }],
          outputs: [{ id: 'out' }],
        },
      ]);
      const result = engine.step([
        ValidateConnectionEvent.create({ from: 'a', fromPort: 'out', to: 'b', toPort: 'in' }),
      ]);
      const validFact = result.state.facts.find(f => f.tag === CONNECTION_VALID_FACT);
      expect(validFact).toBeDefined();
    });

    it('rejects when source node does not exist', () => {
      const engine = makeEngine();
      const result = engine.step([
        ValidateConnectionEvent.create({
          from: 'ghost',
          fromPort: 'out',
          to: 'n2',
          toPort: 'in',
        }),
      ]);
      const invalidFact = result.state.facts.find(f => f.tag === CONNECTION_INVALID_FACT);
      expect(invalidFact).toBeDefined();
      expect((invalidFact?.payload as any).reason).toBe('unknown-node');
    });
  });

  describe('canvas state consistency', () => {
    it('emits a valid fact for a consistent canvas', () => {
      const engine = makeEngine();
      const result = engine.step([ValidateCanvasStateEvent.create({})]);
      const validFact = result.state.facts.find(f => f.tag === CANVAS_STATE_VALID_FACT);
      expect(validFact).toBeDefined();
    });

    it('emits an invalid fact when duplicate node IDs exist', () => {
      const engine = makeEngine([
        { id: 'dup', inputs: [], outputs: [] },
        { id: 'dup', inputs: [], outputs: [] },
      ]);
      const result = engine.step([ValidateCanvasStateEvent.create({})]);
      const invalidFact = result.state.facts.find(f => f.tag === CANVAS_STATE_INVALID_FACT);
      expect(invalidFact).toBeDefined();
    });
  });
});
