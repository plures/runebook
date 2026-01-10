// Tests for memory/storage layer

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../memory';
import type { TerminalEvent, AgentConfig } from '../../types/agent';

const testConfig: AgentConfig = {
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
  maxEvents: 100,
};

describe('Memory Storage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage(testConfig);
  });

  it('should save and retrieve events', async () => {
    const event: TerminalEvent = {
      id: 'test-1',
      timestamp: Date.now(),
      command: 'echo',
      args: ['hello'],
      env: {},
      cwd: '/test',
      stdout: 'hello\n',
      exitCode: 0,
      duration: 10,
      success: true,
    };

    await storage.saveEvent(event);
    const events = await storage.getEvents();
    
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('test-1');
  });

  it('should limit events by maxEvents', async () => {
    const config = { ...testConfig, maxEvents: 5 };
    const limitedStorage = new MemoryStorage(config);

    for (let i = 0; i < 10; i++) {
      const event: TerminalEvent = {
        id: `test-${i}`,
        timestamp: Date.now() + i,
        command: 'echo',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
      };
      await limitedStorage.saveEvent(event);
    }

    const events = await limitedStorage.getEvents();
    expect(events.length).toBeLessThanOrEqual(5);
  });

  it('should get events by command', async () => {
    const events: TerminalEvent[] = [
      {
        id: '1',
        timestamp: Date.now(),
        command: 'echo',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
      },
      {
        id: '2',
        timestamp: Date.now() + 1,
        command: 'ls',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
      },
      {
        id: '3',
        timestamp: Date.now() + 2,
        command: 'echo',
        args: ['hello'],
        env: {},
        cwd: '/test',
        success: true,
      },
    ];

    for (const event of events) {
      await storage.saveEvent(event);
    }

    const echoEvents = await storage.getEventsByCommand('echo');
    expect(echoEvents).toHaveLength(2);
    expect(echoEvents.every(e => e.command === 'echo')).toBe(true);
  });

  it('should calculate statistics', async () => {
    const events: TerminalEvent[] = [
      {
        id: '1',
        timestamp: Date.now(),
        command: 'echo',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
        duration: 10,
      },
      {
        id: '2',
        timestamp: Date.now() + 1,
        command: 'ls',
        args: [],
        env: {},
        cwd: '/test',
        success: false,
        duration: 20,
      },
      {
        id: '3',
        timestamp: Date.now() + 2,
        command: 'echo',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
        duration: 15,
      },
    ];

    for (const event of events) {
      await storage.saveEvent(event);
    }

    const stats = await storage.getStats();
    expect(stats.totalEvents).toBe(3);
    expect(stats.uniqueCommands).toBe(2);
    expect(stats.avgSuccessRate).toBeCloseTo(2 / 3, 2);
    expect(stats.totalDuration).toBe(45);
  });

  it('should clear old events', async () => {
    const now = Date.now();
    const oldEvent: TerminalEvent = {
      id: 'old',
      timestamp: now - 100000,
      command: 'echo',
      args: [],
      env: {},
      cwd: '/test',
      success: true,
    };

    const newEvent: TerminalEvent = {
      id: 'new',
      timestamp: now,
      command: 'ls',
      args: [],
      env: {},
      cwd: '/test',
      success: true,
    };

    await storage.saveEvent(oldEvent);
    await storage.saveEvent(newEvent);

    await storage.clearEvents(now - 50000);
    const events = await storage.getEvents();
    
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('new');
  });
});

