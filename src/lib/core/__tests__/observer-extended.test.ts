// Additional tests for core/observer.ts to increase coverage

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createObserver, defaultObserverConfig, TerminalObserver } from '../observer';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), `runebook-observer-ext-test-${Date.now()}`);

const makeConfig = (overrides = {}) => ({
  enabled: true,
  redactSecrets: true,
  usePluresDB: false,
  chunkSize: 4096,
  maxEvents: 1000,
  storagePath: TEST_DIR,
  ...overrides,
});

describe('TerminalObserver (extended)', () => {
  let observer: TerminalObserver;

  beforeEach(() => {
    observer = createObserver(makeConfig());
  });

  afterEach(async () => {
    if (observer.isActive()) {
      await observer.stop();
    }
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('disabled observer', () => {
    it('should throw when start is called on disabled observer', async () => {
      const disabledObserver = createObserver({ enabled: false });
      await expect(disabledObserver.start()).rejects.toThrow(
        'Observer is not enabled',
      );
    });

    it('should not initialize when disabled', async () => {
      const disabledObserver = createObserver({ enabled: false });
      await disabledObserver.initialize();
      expect(disabledObserver.isActive()).toBe(false);
    });
  });

  describe('getEventsBySession', () => {
    it('should return session events', async () => {
      await observer.initialize();
      await observer.start();
      const commandId = await observer.captureCommand(
        'echo',
        ['session-test'],
        process.cwd(),
        {},
      );
      await observer.captureCommandResult(commandId, 'session-test\n', '', 0);
      const events = await observer.getEventsBySession();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should limit session events', async () => {
      await observer.initialize();
      await observer.start();
      for (let i = 0; i < 3; i++) {
        const id = await observer.captureCommand(
          'echo',
          [`s${i}`],
          process.cwd(),
          {},
        );
        await observer.captureCommandResult(id, `s${i}\n`, '', 0);
      }
      const events = await observer.getEventsBySession(2);
      expect(events.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getHookScript', () => {
    it('should return a hook script string', () => {
      const script = observer.getHookScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should create adapter if not initialized', () => {
      const freshObserver = createObserver(makeConfig());
      const script = freshObserver.getHookScript();
      expect(typeof script).toBe('string');
    });
  });

  describe('captureCommand when not enabled/initialized', () => {
    it('should throw when not initialized', async () => {
      const uninitObserver = createObserver(makeConfig());
      await expect(
        uninitObserver.captureCommand('echo', [], process.cwd(), {}),
      ).rejects.toThrow('Observer not initialized or not enabled');
    });
  });

  describe('captureCommandResult when not enabled', () => {
    it('should return when not initialized', async () => {
      const uninitObserver = createObserver(makeConfig());
      // Should not throw
      await expect(
        uninitObserver.captureCommandResult('cmd1', 'out', 'err', 0),
      ).resolves.toBeUndefined();
    });
  });

  describe('getEvents when uninitialized', () => {
    it('should initialize on demand and return events', async () => {
      // For a disabled observer, getEvents should return empty
      const disabledObserver = createObserver({ enabled: false });
      const events = await disabledObserver.getEvents();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('getEventsByCommand when uninitialized', () => {
    it('should return empty array for disabled observer', async () => {
      const disabledObserver = createObserver({ enabled: false });
      const events = await disabledObserver.getEventsByCommand('any-cmd');
      expect(events).toEqual([]);
    });
  });

  describe('getEventsBySession when uninitialized', () => {
    it('should return empty array for disabled observer', async () => {
      const disabledObserver = createObserver({ enabled: false });
      const events = await disabledObserver.getEventsBySession();
      expect(events).toEqual([]);
    });
  });

  describe('getStats when uninitialized', () => {
    it('should return zero stats for disabled observer', async () => {
      const disabledObserver = createObserver({ enabled: false });
      const stats = await disabledObserver.getStats();
      expect(stats.totalEvents).toBe(0);
    });
  });

  describe('clearEvents with days argument', () => {
    it('should clear events older than specified days', async () => {
      await observer.initialize();
      await observer.start();
      const id = await observer.captureCommand(
        'echo',
        ['test'],
        process.cwd(),
        {},
      );
      await observer.captureCommandResult(id, 'test\n', '', 0);
      // Clear events older than 30 days (recent events should remain)
      await observer.clearEvents(30);
      const events = await observer.getEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should clear all events when called without days', async () => {
      await observer.initialize();
      await observer.start();
      const id = await observer.captureCommand(
        'echo',
        ['test'],
        process.cwd(),
        {},
      );
      await observer.captureCommandResult(id, 'test\n', '', 0);
      await observer.clearEvents();
      const events = await observer.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('updateConfig and getConfig', () => {
    it('should update config', () => {
      observer.updateConfig({ maxEvents: 500 });
      const config = observer.getConfig();
      expect(config.maxEvents).toBe(500);
    });

    it('should return a copy of config', () => {
      const config1 = observer.getConfig();
      const config2 = observer.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});

describe('createObserver', () => {
  it('should create a TerminalObserver', () => {
    const obs = createObserver();
    expect(obs).toBeInstanceOf(TerminalObserver);
  });
});

describe('defaultObserverConfig', () => {
  it('should have sensible defaults', () => {
    expect(defaultObserverConfig.enabled).toBe(false);
    expect(defaultObserverConfig.redactSecrets).toBe(true);
    expect(defaultObserverConfig.maxEvents).toBeGreaterThan(0);
  });
});
