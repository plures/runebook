// Tests for core/shell-adapters/index.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShellAdapter, detectShellType, getAvailableAdapters } from '../shell-adapters/index';
import { BashAdapter } from '../shell-adapters/bash';
import { ZshAdapter } from '../shell-adapters/zsh';

describe('detectShellType', () => {
  const originalShell = process.env.SHELL;

  afterEach(() => {
    process.env.SHELL = originalShell;
  });

  it('should detect bash', () => {
    process.env.SHELL = '/bin/bash';
    expect(detectShellType()).toBe('bash');
  });

  it('should detect zsh', () => {
    process.env.SHELL = '/bin/zsh';
    expect(detectShellType()).toBe('zsh');
  });

  it('should detect nushell', () => {
    process.env.SHELL = '/usr/bin/nu';
    expect(detectShellType()).toBe('nushell');
  });

  it('should return unknown for unrecognized shell', () => {
    process.env.SHELL = '/bin/fish';
    expect(detectShellType()).toBe('unknown');
  });

  it('should return unknown when SHELL is not set', () => {
    delete process.env.SHELL;
    expect(detectShellType()).toBe('unknown');
  });
});

describe('createShellAdapter', () => {
  it('should create a BashAdapter for bash', () => {
    const adapter = createShellAdapter('bash');
    expect(adapter).toBeInstanceOf(BashAdapter);
  });

  it('should create a ZshAdapter for zsh', () => {
    const adapter = createShellAdapter('zsh');
    expect(adapter).toBeInstanceOf(ZshAdapter);
  });

  it('should throw for nushell (not implemented)', () => {
    expect(() => createShellAdapter('nushell')).toThrow(
      'Nushell adapter not yet implemented',
    );
  });

  it('should throw for unknown shell type', () => {
    expect(() => createShellAdapter('unknown')).toThrow(
      'Unsupported shell type: unknown',
    );
  });

  it('should use detected shell type when no arg provided', () => {
    const originalShell = process.env.SHELL;
    process.env.SHELL = '/bin/bash';
    const adapter = createShellAdapter();
    expect(adapter).toBeInstanceOf(BashAdapter);
    process.env.SHELL = originalShell;
  });
});

describe('getAvailableAdapters', () => {
  it('should return a list of adapters', () => {
    const adapters = getAvailableAdapters();
    expect(adapters.length).toBeGreaterThan(0);
    expect(adapters.some((a) => a instanceof BashAdapter)).toBe(true);
    expect(adapters.some((a) => a instanceof ZshAdapter)).toBe(true);
  });
});
