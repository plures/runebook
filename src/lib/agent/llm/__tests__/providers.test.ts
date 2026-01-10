// Tests for LLM Providers
// Tests mock provider and provider factory

import { describe, it, expect, beforeEach } from 'vitest';
import { MockProvider, createLLMProvider, isProviderAvailable } from '../providers/index';
import type { LLMProviderConfig, MCPToolInput, MCPToolOutput } from '../types';

describe('MockProvider', () => {
  let provider: MockProvider;
  let config: LLMProviderConfig;

  beforeEach(() => {
    config = {
      type: 'mock',
      enabled: true,
    };
    provider = new MockProvider(config);
  });

  it('should be available', async () => {
    expect(await provider.isAvailable()).toBe(true);
  });

  it('should return default mock response', async () => {
    const input: MCPToolInput = {
      contextWindow: {
        command: 'test',
        args: [],
        cwd: '/tmp',
        env: {},
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
        previousCommands: [],
      },
      errorSummary: {
        command: 'test',
        args: [],
        exitCode: 1,
        stderr: 'Error',
        stdout: '',
        cwd: '/tmp',
        timestamp: Date.now(),
      },
      repoMetadata: {},
    };

    const output = await provider.analyze(input);
    expect(output.suggestions).toHaveLength(1);
    expect(output.suggestions[0].title).toBe('Mock Suggestion');
    expect(output.provenance.provider).toBe('mock');
  });

  it('should return preset mock response', async () => {
    const input: MCPToolInput = {
      contextWindow: {
        command: 'test',
        args: [],
        cwd: '/tmp',
        env: {},
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
        previousCommands: [],
      },
      errorSummary: {
        command: 'test',
        args: [],
        exitCode: 1,
        stderr: 'Error',
        stdout: '',
        cwd: '/tmp',
        timestamp: Date.now(),
      },
      repoMetadata: {},
    };

    const presetOutput: MCPToolOutput = {
      suggestions: [{
        title: 'Preset Suggestion',
        description: 'This is a preset response',
        confidence: 0.9,
        type: 'tip',
        priority: 'high',
      }],
      provenance: {
        provider: 'mock',
        timestamp: Date.now(),
      },
    };

    provider.setMockResponse(input, presetOutput);
    const output = await provider.analyze(input);
    expect(output.suggestions[0].title).toBe('Preset Suggestion');
  });

  it('should sanitize context', async () => {
    const input: MCPToolInput = {
      contextWindow: {
        command: 'test',
        args: ['--token', 'secret123'],
        cwd: '/tmp',
        env: { API_KEY: 'sk-1234567890' },
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
        previousCommands: [],
      },
      errorSummary: {
        command: 'test',
        args: ['--token', 'secret123'],
        exitCode: 1,
        stderr: 'Error',
        stdout: '',
        cwd: '/tmp',
        timestamp: Date.now(),
      },
      repoMetadata: {},
    };

    const sanitized = await provider.sanitizeContext(input.contextWindow);
    expect(sanitized.sanitized.env.API_KEY).toBe('[REDACTED]');
    expect(sanitized.redactions.length).toBeGreaterThan(0);
  });
});

describe('createLLMProvider', () => {
  it('should return null if disabled', () => {
    const config: LLMProviderConfig = {
      type: 'mock',
      enabled: false,
    };
    expect(createLLMProvider(config)).toBeNull();
  });

  it('should create mock provider', () => {
    const config: LLMProviderConfig = {
      type: 'mock',
      enabled: true,
    };
    const provider = createLLMProvider(config);
    expect(provider).not.toBeNull();
    expect(provider?.name).toBe('mock');
  });

  it('should return null for unknown type', () => {
    const config = {
      type: 'unknown' as any,
      enabled: true,
    };
    expect(createLLMProvider(config)).toBeNull();
  });
});

describe('isProviderAvailable', () => {
  it('should return false if disabled', async () => {
    const config: LLMProviderConfig = {
      type: 'mock',
      enabled: false,
    };
    expect(await isProviderAvailable(config)).toBe(false);
  });

  it('should return true for mock provider', async () => {
    const config: LLMProviderConfig = {
      type: 'mock',
      enabled: true,
    };
    expect(await isProviderAvailable(config)).toBe(true);
  });
});

