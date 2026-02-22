// Tests for core/storage.ts (LocalFileStore, createEventStore)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalFileStore, createEventStore } from '../storage';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { TerminalObserverEvent, ObserverConfig } from '../types';

const TEST_DIR = join(tmpdir(), `runebook-storage-test-${Date.now()}`);

const makeConfig = (overrides: Partial<ObserverConfig> = {}): ObserverConfig => ({
  enabled: true,
  storagePath: TEST_DIR,
  maxEvents: 100,
  ...overrides,
});

const makeEvent = (id: string, sessionId = 'session-1', type: TerminalObserverEvent['type'] = 'command_start'): TerminalObserverEvent => ({
  id,
  type,
  timestamp: Date.now(),
  sessionId,
  cwd: '/tmp',
} as TerminalObserverEvent);

const makeCommandStartEvent = (id: string, sessionId = 'session-1'): TerminalObserverEvent => ({
  id,
  type: 'command_start',
  timestamp: Date.now(),
  sessionId,
  cwd: '/tmp',
  command: 'echo',
  args: [],
  env: {},
} as any);

const makeCommandEndEvent = (id: string, commandId: string, sessionId = 'session-1'): TerminalObserverEvent => ({
  id,
  type: 'command_end',
  timestamp: Date.now(),
  sessionId,
  commandId,
  cwd: '/tmp',
} as any);

describe('LocalFileStore', () => {
  let store: LocalFileStore;

  beforeEach(() => {
    store = new LocalFileStore(makeConfig());
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('saveEvent', () => {
    it('should save an event', async () => {
      const event = makeCommandStartEvent('e1');
      await store.saveEvent(event);
      const events = await store.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e1');
    });

    it('should enforce maxEvents limit', async () => {
      const limitedStore = new LocalFileStore(makeConfig({ maxEvents: 3 }));
      for (let i = 0; i < 5; i++) {
        await limitedStore.saveEvent(makeCommandStartEvent(`e${i}`));
      }
      const events = await limitedStore.getEvents();
      expect(events.length).toBeLessThanOrEqual(3);
    });

    it('should skip maxEvents enforcement when maxEvents is 0', async () => {
      const unlimitedStore = new LocalFileStore(makeConfig({ maxEvents: 0 }));
      for (let i = 0; i < 5; i++) {
        await unlimitedStore.saveEvent(makeCommandStartEvent(`e${i}`));
      }
      const events = await unlimitedStore.getEvents();
      expect(events).toHaveLength(5);
    });
  });

  describe('getEvents', () => {
    it('should return all events when no filter applied', async () => {
      await store.saveEvent(makeCommandStartEvent('e1'));
      await store.saveEvent(makeCommandStartEvent('e2'));
      const events = await store.getEvents();
      expect(events).toHaveLength(2);
    });

    it('should filter by event type', async () => {
      await store.saveEvent(makeCommandStartEvent('e1'));
      await store.saveEvent(makeCommandEndEvent('e2', 'e1'));
      const starts = await store.getEvents('command_start');
      expect(starts).toHaveLength(1);
      expect(starts[0].id).toBe('e1');
    });

    it('should filter by since timestamp', async () => {
      const now = Date.now();
      const oldEvent = { ...makeCommandStartEvent('old'), timestamp: now - 10000 };
      const newEvent = { ...makeCommandStartEvent('new'), timestamp: now + 1 };
      await store.saveEvent(oldEvent);
      await store.saveEvent(newEvent);
      const events = await store.getEvents(undefined, now);
      expect(events.some(e => e.id === 'new')).toBe(true);
      expect(events.some(e => e.id === 'old')).toBe(false);
    });

    it('should limit results', async () => {
      for (let i = 0; i < 5; i++) {
        await store.saveEvent(makeCommandStartEvent(`e${i}`));
      }
      const events = await store.getEvents(undefined, undefined, 2);
      expect(events).toHaveLength(2);
    });

    it('should sort events newest first', async () => {
      const e1 = { ...makeCommandStartEvent('e1'), timestamp: 100 };
      const e2 = { ...makeCommandStartEvent('e2'), timestamp: 200 };
      await store.saveEvent(e1);
      await store.saveEvent(e2);
      const events = await store.getEvents();
      expect(events[0].id).toBe('e2');
    });
  });

  describe('getEventsByCommand', () => {
    it('should return events matching a commandId', async () => {
      const start = makeCommandStartEvent('cmd1');
      const end = makeCommandEndEvent('end1', 'cmd1');
      const other = makeCommandStartEvent('other');
      await store.saveEvent(start);
      await store.saveEvent(end);
      await store.saveEvent(other);

      const events = await store.getEventsByCommand('cmd1');
      // command_start with id=cmd1, and command_end with commandId=cmd1
      expect(events.some(e => e.id === 'cmd1')).toBe(true);
      expect(events.some(e => e.id === 'end1')).toBe(true);
      expect(events.some(e => e.id === 'other')).toBe(false);
    });
  });

  describe('getEventsBySession', () => {
    it('should return events for a specific session', async () => {
      await store.saveEvent({ ...makeCommandStartEvent('e1'), sessionId: 'session-a' });
      await store.saveEvent({ ...makeCommandStartEvent('e2'), sessionId: 'session-b' });
      const events = await store.getEventsBySession('session-a');
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e1');
    });

    it('should limit results', async () => {
      for (let i = 0; i < 5; i++) {
        await store.saveEvent({ ...makeCommandStartEvent(`e${i}`), sessionId: 'sess' });
      }
      const events = await store.getEventsBySession('sess', 2);
      expect(events).toHaveLength(2);
    });
  });

  describe('clearEvents', () => {
    it('should clear all events when no timestamp provided', async () => {
      await store.saveEvent(makeCommandStartEvent('e1'));
      await store.clearEvents();
      const events = await store.getEvents();
      expect(events).toHaveLength(0);
    });

    it('should clear only old events when timestamp provided', async () => {
      const now = Date.now();
      const old = { ...makeCommandStartEvent('old'), timestamp: now - 100000 };
      const fresh = { ...makeCommandStartEvent('fresh'), timestamp: now };
      await store.saveEvent(old);
      await store.saveEvent(fresh);
      await store.clearEvents(now - 50000);
      const events = await store.getEvents();
      expect(events.some(e => e.id === 'fresh')).toBe(true);
      expect(events.some(e => e.id === 'old')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return stats with zero counts for empty store', async () => {
      const stats = await store.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.sessions).toBe(0);
    });

    it('should count events by type and session', async () => {
      await store.saveEvent({ ...makeCommandStartEvent('e1'), sessionId: 'sess-a' });
      await store.saveEvent({ ...makeCommandStartEvent('e2'), sessionId: 'sess-b' });
      const stats = await store.getStats();
      expect(stats.totalEvents).toBe(2);
      expect(stats.sessions).toBe(2);
      expect(stats.eventsByType['command_start']).toBe(2);
    });
  });
});

describe('createEventStore', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should return a LocalFileStore when usePluresDB is false', () => {
    const store = createEventStore(makeConfig({ usePluresDB: false }));
    expect(store).toBeInstanceOf(LocalFileStore);
  });

  it('should return a LocalFileStore when usePluresDB is not set', () => {
    const store = createEventStore(makeConfig());
    expect(store).toBeInstanceOf(LocalFileStore);
  });
});
