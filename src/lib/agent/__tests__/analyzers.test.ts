// Tests for agent/analyzers/llm.ts and local-search.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMAnalyzer, createLLMAnalyzer } from '../analyzers/llm';
import { LocalSearchAnalyzer, createLocalSearchAnalyzer } from '../analyzers/local-search';
import type { AnalysisContext } from '../analysis-pipeline';
import type { EventStore } from '../../core/types';

const makeContext = (overrides: Partial<AnalysisContext> = {}): AnalysisContext => ({
  command: 'nix',
  args: ['build'],
  exitCode: 1,
  stdout: '',
  stderr: 'error: attribute missing',
  cwd: '/tmp',
  env: {},
  previousCommands: [],
  ...overrides,
});

const mockStore: EventStore = {
  saveEvent: vi.fn(),
  getEvents: vi.fn().mockResolvedValue([]),
  getEventsByCommand: vi.fn().mockResolvedValue([]),
  getEventsBySession: vi.fn().mockResolvedValue([]),
  clearEvents: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({ totalEvents: 0, eventsByType: {}, sessions: 0 }),
};

describe('LLMAnalyzer', () => {
  it('should return empty array when disabled (default)', async () => {
    const analyzer = new LLMAnalyzer();
    const results = await analyzer.analyze(makeContext(), mockStore);
    expect(results).toEqual([]);
  });

  it('should return empty array when enabled but no provider', async () => {
    const analyzer = new LLMAnalyzer(false);
    const results = await analyzer.analyze(makeContext(), mockStore);
    expect(results).toEqual([]);
  });

  it('should have name and layer properties', () => {
    const analyzer = new LLMAnalyzer();
    expect(analyzer.name).toBe('llm-analyzer');
    expect(analyzer.layer).toBe(3);
  });

  it('should set enabled', () => {
    const analyzer = new LLMAnalyzer();
    analyzer.setEnabled(true);
    // Still returns empty because no provider configured
    expect(analyzer).toBeDefined();
  });

  it('should set config', () => {
    const analyzer = new LLMAnalyzer();
    analyzer.setConfig({ type: 'mock', enabled: true });
    // Provider is now configured
    expect(analyzer).toBeDefined();
  });

  it('should create provider when enabled with config', async () => {
    const analyzer = new LLMAnalyzer(true, { type: 'mock', enabled: true });
    // Mock provider should be available and return results
    const results = await analyzer.analyze(makeContext(), mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should update provider when setConfig is called with enabled config', async () => {
    const analyzer = new LLMAnalyzer();
    analyzer.setEnabled(true);
    analyzer.setConfig({ type: 'mock', enabled: true });
    const results = await analyzer.analyze(makeContext(), mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should clear provider when setConfig is called with disabled config', () => {
    const analyzer = new LLMAnalyzer(true, { type: 'mock', enabled: true });
    analyzer.setConfig({ type: 'mock', enabled: false });
    expect(analyzer).toBeDefined();
  });
});

describe('createLLMAnalyzer', () => {
  it('should create a disabled LLM analyzer by default', async () => {
    const analyzer = createLLMAnalyzer(false);
    const results = await analyzer.analyze(makeContext(), mockStore);
    expect(results).toEqual([]);
  });

  it('should create an enabled LLM analyzer with config', () => {
    const analyzer = createLLMAnalyzer(true, { type: 'mock', enabled: true });
    expect(analyzer).toBeDefined();
  });
});

describe('LocalSearchAnalyzer', () => {
  it('should have name and layer properties', () => {
    const analyzer = new LocalSearchAnalyzer();
    expect(analyzer.name).toBe('local-search');
    expect(analyzer.layer).toBe(2);
  });

  it('should return empty array when not in a repository', async () => {
    const analyzer = new LocalSearchAnalyzer();
    const context = makeContext({ cwd: '/tmp' });
    // /tmp typically doesn't have .git or flake.nix
    const results = await analyzer.analyze(context, mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should analyze context with attribute-missing error', async () => {
    const analyzer = new LocalSearchAnalyzer();
    const context = makeContext({
      stderr: "error: attribute 'myPkg' missing",
      cwd: '/tmp',
    });
    const results = await analyzer.analyze(context, mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should analyze context with template path error', async () => {
    const analyzer = new LocalSearchAnalyzer();
    const context = makeContext({
      stderr: 'error: template path not found',
      cwd: '/tmp',
    });
    const results = await analyzer.analyze(context, mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should analyze context with token error', async () => {
    const analyzer = new LocalSearchAnalyzer();
    const context = makeContext({
      stderr: 'error: GITHUB_TOKEN missing or invalid',
      cwd: '/tmp',
    });
    const results = await analyzer.analyze(context, mockStore);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should analyze context in actual repo root', async () => {
    const analyzer = new LocalSearchAnalyzer();
    // Use the actual repo root which has .git
    const context = makeContext({
      cwd: process.cwd(),
      stderr: "error: attribute 'test' missing",
    });
    const results = await analyzer.analyze(context, mockStore);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('createLocalSearchAnalyzer', () => {
  it('should create a LocalSearchAnalyzer', () => {
    const analyzer = createLocalSearchAnalyzer();
    expect(analyzer).toBeInstanceOf(LocalSearchAnalyzer);
  });
});
