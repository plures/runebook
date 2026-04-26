// Tests for core/shell-adapters/zsh.ts

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZshAdapter } from '../shell-adapters/zsh';
import { LocalFileStore } from '../storage';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ObserverConfig } from '../types';

const TEST_DIR = join(tmpdir(), `runebook-zsh-test-${Date.now()}`);

const makeConfig = (): ObserverConfig => ({
  enabled: true,
  redactSecrets: true,
  storagePath: TEST_DIR,
  maxEvents: 100,
});

describe('ZshAdapter', () => {
  let adapter: ZshAdapter;
  let store: LocalFileStore;

  beforeEach(() => {
    adapter = new ZshAdapter();
    store = new LocalFileStore(makeConfig());
  });

  afterEach(async () => {
    if (adapter.isActive()) {
      await adapter.stop();
    }
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should return "zsh" as the shell type', () => {
    expect(adapter.getShellType()).toBe('zsh');
  });

  it('should return a hook script string', () => {
    const script = adapter.getHookScript();
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain('runebook');
  });

  it('should not be active initially', () => {
    expect(adapter.isActive()).toBe(false);
  });

  it('should initialize with config and store', async () => {
    await adapter.initialize(makeConfig(), store);
    // After initialization, should still be inactive until start()
    expect(adapter.isActive()).toBe(false);
  });

  it('should start and become active', async () => {
    await adapter.initialize(makeConfig(), store);
    await adapter.start();
    expect(adapter.isActive()).toBe(true);
  });

  it('should stop and become inactive', async () => {
    await adapter.initialize(makeConfig(), store);
    await adapter.start();
    await adapter.stop();
    expect(adapter.isActive()).toBe(false);
  });

  it('should capture a command programmatically', async () => {
    await adapter.initialize(makeConfig(), store);
    await adapter.start();

    const commandId = await adapter.captureCommand(
      'echo',
      ['hello'],
      '/tmp',
      {},
    );
    expect(typeof commandId).toBe('string');
    expect(commandId.length).toBeGreaterThan(0);
  });

  it('should capture command result', async () => {
    await adapter.initialize(makeConfig(), store);
    await adapter.start();

    const commandId = await adapter.captureCommand(
      'echo',
      ['hello'],
      '/tmp',
      {},
    );
    await adapter.captureCommandResult(commandId, 'hello\n', '', 0);

    const events = await store.getEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('should handle large stdout by chunking', async () => {
    await adapter.initialize(makeConfig(), store);
    await adapter.start();

    const commandId = await adapter.captureCommand('cat', [], '/tmp', {});
    const largeOutput = 'x'.repeat(10000);
    await adapter.captureCommandResult(commandId, largeOutput, '', 0);

    // Should still complete without error
    const events = await store.getEvents();
    expect(events.length).toBeGreaterThan(0);
  });
});
