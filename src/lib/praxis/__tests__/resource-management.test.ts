// Tests for resource-management PraxisModule

import { describe, expect, it } from 'vitest';
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';
import {
  CLEANUP_REQUIRED_FACT,
  MEMORY_PRESSURE_FACT,
  NodeTimeoutEvent,
  ReleaseTerminalEvent,
  RequestTerminalEvent,
  resourceManagementModule,
  TERMINAL_DENIED_FACT,
  TERMINAL_GRANTED_FACT,
  TERMINAL_RELEASED_FACT,
  UpdateMemoryUsageEvent,
} from '../resource-management';
import type { ResourceManagementContext } from '../resource-management';

function makeEngine(overrides: Partial<ResourceManagementContext> = {}) {
  const registry = new PraxisRegistry<ResourceManagementContext>();
  registry.registerModule(resourceManagementModule);
  return createPraxisEngine<ResourceManagementContext>({
    initialContext: {
      terminalCount: 0,
      maxTerminals: 3,
      memoryUsage: 0,
      memoryBudget: 0,
      timeouts: {},
      timedOutNodes: [],
      ...overrides,
    },
    registry,
  });
}

describe('resource-management module', () => {
  describe('processLimit — terminal allocation', () => {
    it('grants a terminal when under the limit', () => {
      const engine = makeEngine({ terminalCount: 0, maxTerminals: 3 });
      const result = engine.step([
        RequestTerminalEvent.create({ nodeId: 'n1' }),
      ]);
      const granted = result.state.facts.find(
        (f) => f.tag === TERMINAL_GRANTED_FACT,
      );
      expect(granted).toBeDefined();
      expect(engine.getContext().terminalCount).toBe(1);
    });

    it('denies a terminal when at the limit', () => {
      const engine = makeEngine({ terminalCount: 3, maxTerminals: 3 });
      const result = engine.step([
        RequestTerminalEvent.create({ nodeId: 'n2' }),
      ]);
      const denied = result.state.facts.find(
        (f) => f.tag === TERMINAL_DENIED_FACT,
      );
      expect(denied).toBeDefined();
      expect(engine.getContext().terminalCount).toBe(3); // unchanged
    });

    it('increments count correctly across multiple grants', () => {
      const engine = makeEngine({ terminalCount: 0, maxTerminals: 5 });
      engine.step([RequestTerminalEvent.create({ nodeId: 'n1' })]);
      engine.step([RequestTerminalEvent.create({ nodeId: 'n2' })]);
      expect(engine.getContext().terminalCount).toBe(2);
    });
  });

  describe('releaseTerminal', () => {
    it('decrements the terminal count on release', () => {
      const engine = makeEngine({ terminalCount: 2, maxTerminals: 3 });
      const result = engine.step([
        ReleaseTerminalEvent.create({ nodeId: 'n1' }),
      ]);
      const released = result.state.facts.find(
        (f) => f.tag === TERMINAL_RELEASED_FACT,
      );
      expect(released).toBeDefined();
      expect(engine.getContext().terminalCount).toBe(1);
    });

    it('does not go below zero', () => {
      const engine = makeEngine({ terminalCount: 0, maxTerminals: 3 });
      engine.step([ReleaseTerminalEvent.create({ nodeId: 'n1' })]);
      expect(engine.getContext().terminalCount).toBe(0);
    });
  });

  describe('memoryBudget', () => {
    it('emits MEMORY_PRESSURE when usage exceeds budget', () => {
      const engine = makeEngine({ memoryBudget: 100_000_000 }); // 100 MB
      const result = engine.step([
        UpdateMemoryUsageEvent.create({ bytes: 200_000_000 }),
      ]);
      const pressure = result.state.facts.find(
        (f) => f.tag === MEMORY_PRESSURE_FACT,
      );
      expect(pressure).toBeDefined();
      expect((pressure?.payload as any).overBy).toBe(100_000_000);
    });

    it('does not emit MEMORY_PRESSURE when within budget', () => {
      const engine = makeEngine({ memoryBudget: 100_000_000 });
      const result = engine.step([
        UpdateMemoryUsageEvent.create({ bytes: 50_000_000 }),
      ]);
      const pressure = result.state.facts.find(
        (f) => f.tag === MEMORY_PRESSURE_FACT,
      );
      expect(pressure).toBeUndefined();
    });

    it('does not emit MEMORY_PRESSURE when budget is 0 (unlimited)', () => {
      const engine = makeEngine({ memoryBudget: 0 });
      const result = engine.step([
        UpdateMemoryUsageEvent.create({ bytes: Number.MAX_SAFE_INTEGER }),
      ]);
      const pressure = result.state.facts.find(
        (f) => f.tag === MEMORY_PRESSURE_FACT,
      );
      expect(pressure).toBeUndefined();
    });

    it('updates memoryUsage in context', () => {
      const engine = makeEngine();
      engine.step([UpdateMemoryUsageEvent.create({ bytes: 42_000 })]);
      expect(engine.getContext().memoryUsage).toBe(42_000);
    });
  });

  describe('cleanupTrigger', () => {
    it('emits CLEANUP_REQUIRED and records timed-out node', () => {
      const engine = makeEngine({ timeouts: { n1: 1000 } });
      const result = engine.step([
        NodeTimeoutEvent.create({ nodeId: 'n1', elapsedMs: 1500 }),
      ]);
      const cleanup = result.state.facts.find(
        (f) => f.tag === CLEANUP_REQUIRED_FACT,
      );
      expect(cleanup).toBeDefined();
      expect((cleanup?.payload as any).nodeId).toBe('n1');
      expect(engine.getContext().timedOutNodes).toContain('n1');
    });

    it('does not duplicate timed-out nodes on repeated events', () => {
      const engine = makeEngine({ timeouts: { n1: 1000 } });
      engine.step([NodeTimeoutEvent.create({ nodeId: 'n1', elapsedMs: 1500 })]);
      engine.step([NodeTimeoutEvent.create({ nodeId: 'n1', elapsedMs: 2000 })]);
      expect(
        engine.getContext().timedOutNodes.filter((id) => id === 'n1'),
      ).toHaveLength(1);
    });
  });
});
