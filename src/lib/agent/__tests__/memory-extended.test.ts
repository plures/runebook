// Additional tests for agent/memory.ts to increase coverage

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage, createStorage } from '../memory';
import type { TerminalEvent, AgentConfig, Suggestion, CommandPattern } from '../../types/agent';

const testConfig: AgentConfig = {
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
  maxEvents: 100,
};

const makeEvent = (id: string, command: string = 'echo', success = true, args: string[] = []): TerminalEvent => ({
  id,
  timestamp: Date.now(),
  command,
  args,
  env: {},
  cwd: '/test',
  success,
  duration: 10,
});

const makeSuggestion = (id: string): Suggestion => ({
  id,
  type: 'tip',
  priority: 'medium',
  title: `Tip ${id}`,
  description: `Description ${id}`,
  timestamp: Date.now(),
});

describe('MemoryStorage (extended coverage)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage(testConfig);
  });

  describe('getEvents with since filter', () => {
    it('should filter events by since timestamp', async () => {
      const now = Date.now();
      await storage.saveEvent({ ...makeEvent('old'), timestamp: now - 10000 });
      await storage.saveEvent({ ...makeEvent('new'), timestamp: now + 1 });
      const events = await storage.getEvents(undefined, now);
      expect(events.some(e => e.id === 'new')).toBe(true);
      expect(events.some(e => e.id === 'old')).toBe(false);
    });

    it('should apply limit to returned events', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.saveEvent(makeEvent(`e${i}`));
      }
      const events = await storage.getEvents(2);
      expect(events).toHaveLength(2);
    });
  });

  describe('getEventsByCommand with limit', () => {
    it('should apply limit to command-specific events', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.saveEvent(makeEvent(`e${i}`, 'echo'));
      }
      const events = await storage.getEventsByCommand('echo', 2);
      expect(events).toHaveLength(2);
    });
  });

  describe('getPatterns', () => {
    it('should return patterns created from saved events', async () => {
      await storage.saveEvent(makeEvent('e1', 'git', true, ['status']));
      await storage.saveEvent(makeEvent('e2', 'git', true, ['push']));
      const patterns = await storage.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.command === 'git')).toBe(true);
    });
  });

  describe('savePattern', () => {
    it('should save and retrieve a pattern', async () => {
      const pattern: CommandPattern = {
        id: 'pattern_test',
        command: 'test',
        frequency: 5,
        lastUsed: Date.now(),
        successRate: 0.8,
        avgDuration: 100,
        commonArgs: ['arg1'],
        commonEnv: {},
      };
      await storage.savePattern(pattern);
      const patterns = await storage.getPatterns();
      expect(patterns.some(p => p.id === 'pattern_test')).toBe(true);
    });
  });

  describe('saveSuggestion and getSuggestions', () => {
    it('should save and retrieve suggestions', async () => {
      await storage.saveSuggestion(makeSuggestion('s1'));
      await storage.saveSuggestion(makeSuggestion('s2'));
      const suggestions = await storage.getSuggestions(10);
      expect(suggestions).toHaveLength(2);
    });

    it('should limit suggestions when requesting', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.saveSuggestion(makeSuggestion(`s${i}`));
      }
      const suggestions = await storage.getSuggestions(2);
      expect(suggestions).toHaveLength(2);
    });

    it('should keep only last 100 suggestions', async () => {
      for (let i = 0; i < 110; i++) {
        await storage.saveSuggestion(makeSuggestion(`s${i}`));
      }
      const suggestions = await storage.getSuggestions(200);
      expect(suggestions.length).toBeLessThanOrEqual(100);
    });
  });

  describe('clearEvents without olderThan', () => {
    it('should clear all events when no cutoff is given', async () => {
      await storage.saveEvent(makeEvent('e1'));
      await storage.saveEvent(makeEvent('e2'));
      await storage.clearEvents();
      const events = await storage.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('pattern update logic', () => {
    it('should update pattern success rate over multiple events', async () => {
      await storage.saveEvent(makeEvent('e1', 'npm', true));
      await storage.saveEvent(makeEvent('e2', 'npm', false));
      const patterns = await storage.getPatterns();
      const npmPattern = patterns.find(p => p.command === 'npm');
      expect(npmPattern).toBeDefined();
      expect(npmPattern!.successRate).toBeCloseTo(0.5, 1);
    });

    it('should track common args in pattern', async () => {
      await storage.saveEvent(makeEvent('e1', 'git', true, ['status']));
      await storage.saveEvent(makeEvent('e2', 'git', true, ['push']));
      const patterns = await storage.getPatterns();
      const gitPattern = patterns.find(p => p.command === 'git');
      expect(gitPattern!.commonArgs.length).toBeGreaterThan(0);
    });
  });
});

describe('createStorage', () => {
  it('should return MemoryStorage when storagePath is not set', () => {
    const config: AgentConfig = {
      enabled: true,
      captureEvents: true,
      analyzePatterns: true,
      suggestImprovements: true,
    };
    const storage = createStorage(config);
    expect(storage).toBeInstanceOf(MemoryStorage);
  });

  it('should return PluresDBStorage when storagePath is set', () => {
    const config: AgentConfig = {
      enabled: true,
      captureEvents: true,
      analyzePatterns: true,
      suggestImprovements: true,
      storagePath: '/tmp/test-plures',
    };
    const storage = createStorage(config);
    // PluresDBStorage is not exported but should not be MemoryStorage
    expect(storage).not.toBeInstanceOf(MemoryStorage);
  });
});
