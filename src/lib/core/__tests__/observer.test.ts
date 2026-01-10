// Integration test for terminal observer
// Tests command capture, event persistence, and retrieval

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createObserver, type ObserverConfig } from '../observer';
import { LocalFileStore } from '../storage';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('TerminalObserver Integration', () => {
  let observer: ReturnType<typeof createObserver>;
  let config: ObserverConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      redactSecrets: true,
      usePluresDB: false,
      chunkSize: 4096,
      maxEvents: 1000,
      retentionDays: 30,
    };
    observer = createObserver(config);
  });

  afterEach(async () => {
    if (observer) {
      await observer.stop();
    }
  });

  it('should initialize observer', async () => {
    await observer.initialize();
    expect(observer.isActive()).toBe(false); // Not started yet
  });

  it('should start and stop observer', async () => {
    await observer.initialize();
    await observer.start();
    expect(observer.isActive()).toBe(true);
    await observer.stop();
    expect(observer.isActive()).toBe(false);
  });

  it('should capture command execution programmatically', async () => {
    await observer.initialize();
    await observer.start();

    const commandId = await observer.captureCommand(
      'echo',
      ['hello', 'world'],
      process.cwd(),
      process.env as Record<string, string>
    );

    expect(commandId).toBeDefined();
    expect(commandId).toContain('cmd_');

    // Capture result
    await observer.captureCommandResult(commandId, 'hello world\n', '', 0);

    // Retrieve events
    const events = await observer.getEventsByCommand(commandId);

    expect(events.length).toBeGreaterThan(0);
    
    const startEvent = events.find(e => e.type === 'command_start');
    expect(startEvent).toBeDefined();
    if (startEvent && startEvent.type === 'command_start') {
      expect(startEvent.command).toBe('echo');
      expect(startEvent.args).toEqual(['hello', 'world']);
    }

    const stdoutEvent = events.find(e => e.type === 'stdout_chunk');
    expect(stdoutEvent).toBeDefined();
    if (stdoutEvent && stdoutEvent.type === 'stdout_chunk') {
      expect(stdoutEvent.chunk).toContain('hello world');
    }

    const exitEvent = events.find(e => e.type === 'exit_status');
    expect(exitEvent).toBeDefined();
    if (exitEvent && exitEvent.type === 'exit_status') {
      expect(exitEvent.exitCode).toBe(0);
      expect(exitEvent.success).toBe(true);
    }
  });

  it('should persist events to storage', async () => {
    await observer.initialize();
    await observer.start();

    const commandId = await observer.captureCommand(
      'echo',
      ['test'],
      process.cwd(),
      process.env as Record<string, string>
    );

    await observer.captureCommandResult(commandId, 'test\n', '', 0);

    // Stop and create new observer instance
    await observer.stop();
    
    const newObserver = createObserver(config);
    await newObserver.initialize();

    // Events should still be retrievable
    const events = await newObserver.getEventsByCommand(commandId);
    expect(events.length).toBeGreaterThan(0);

    await newObserver.stop();
  });

  it('should redact secrets in environment variables', async () => {
    const envWithSecrets = {
      ...process.env,
      API_KEY: 'sk-1234567890abcdef',
      TOKEN: 'secret-token-value',
      PATH: '/usr/bin', // Should not be redacted
    };

    await observer.initialize();
    await observer.start();

    const commandId = await observer.captureCommand(
      'echo',
      ['test'],
      process.cwd(),
      envWithSecrets as Record<string, string>
    );

    const events = await observer.getEventsByCommand(commandId);
    const startEvent = events.find(e => e.type === 'command_start');
    
    expect(startEvent).toBeDefined();
    if (startEvent && startEvent.type === 'command_start') {
      // Secrets should be redacted
      expect(startEvent.envSummary.API_KEY).not.toBe('sk-1234567890abcdef');
      expect(startEvent.envSummary.TOKEN).not.toBe('secret-token-value');
      
      // Non-secrets should be preserved
      expect(startEvent.envSummary.PATH).toBe('/usr/bin');
    }
  });

  it('should get statistics', async () => {
    await observer.initialize();
    await observer.start();

    // Capture a few commands
    for (let i = 0; i < 3; i++) {
      const commandId = await observer.captureCommand(
        'echo',
        [`test${i}`],
        process.cwd(),
        process.env as Record<string, string>
      );
      await observer.captureCommandResult(commandId, `test${i}\n`, '', 0);
    }

    const stats = await observer.getStats();

    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(stats.eventsByType).toBeDefined();
    expect(stats.sessions).toBeGreaterThan(0);
  });

  it('should filter events by type', async () => {
    await observer.initialize();
    await observer.start();

    const commandId = await observer.captureCommand(
      'echo',
      ['test'],
      process.cwd(),
      process.env as Record<string, string>
    );
    await observer.captureCommandResult(commandId, 'test\n', '', 0);

    const commandStartEvents = await observer.getEvents('command_start');
    expect(commandStartEvents.length).toBeGreaterThan(0);
    expect(commandStartEvents.every(e => e.type === 'command_start')).toBe(true);

    const stdoutEvents = await observer.getEvents('stdout_chunk');
    expect(stdoutEvents.length).toBeGreaterThan(0);
    expect(stdoutEvents.every(e => e.type === 'stdout_chunk')).toBe(true);
  });

  it('should limit events when retrieving', async () => {
    await observer.initialize();
    await observer.start();

    // Capture multiple commands
    for (let i = 0; i < 5; i++) {
      const commandId = await observer.captureCommand(
        'echo',
        [`test${i}`],
        process.cwd(),
        process.env as Record<string, string>
      );
      await observer.captureCommandResult(commandId, `test${i}\n`, '', 0);
    }

    const limitedEvents = await observer.getEvents(undefined, undefined, 3);
    expect(limitedEvents.length).toBeLessThanOrEqual(3);
  });

  it('should clear old events', async () => {
    await observer.initialize();
    await observer.start();

    // Capture a command
    const commandId = await observer.captureCommand(
      'echo',
      ['test'],
      process.cwd(),
      process.env as Record<string, string>
    );
    await observer.captureCommandResult(commandId, 'test\n', '', 0);

    // Verify event exists
    let events = await observer.getEvents();
    expect(events.length).toBeGreaterThan(0);

    // Clear events older than 0 days (all events)
    await observer.clearEvents(0);

    // Verify events are cleared
    events = await observer.getEvents();
    expect(events.length).toBe(0);
  });
});

