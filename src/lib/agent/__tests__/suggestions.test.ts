// Tests for agent/suggestions.ts (MemorySuggestionStore and formatting functions)

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemorySuggestionStore,
  formatSuggestion,
  formatSuggestionsForCLI,
  formatSuggestionCompact,
  formatTopSuggestion,
} from '../suggestions';
import type { Suggestion } from '../../types/agent';

const makeSuggestion = (id: string, priority: Suggestion['priority'] = 'medium', type: Suggestion['type'] = 'tip'): Suggestion => ({
  id,
  type,
  priority,
  title: `Suggestion ${id}`,
  description: `Description for ${id}`,
  timestamp: Date.now(),
});

describe('MemorySuggestionStore', () => {
  let store: MemorySuggestionStore;

  beforeEach(() => {
    store = new MemorySuggestionStore();
  });

  it('should start empty', () => {
    expect(store.suggestions).toHaveLength(0);
  });

  it('should add a suggestion', () => {
    store.add(makeSuggestion('s1'));
    expect(store.suggestions).toHaveLength(1);
  });

  it('should not add duplicate suggestions', () => {
    store.add(makeSuggestion('s1'));
    store.add(makeSuggestion('s1'));
    expect(store.suggestions).toHaveLength(1);
  });

  it('should keep only the last 100 suggestions', () => {
    for (let i = 0; i < 110; i++) {
      store.add(makeSuggestion(`s${i}`));
    }
    expect(store.suggestions.length).toBeLessThanOrEqual(100);
  });

  it('should remove a suggestion by id', () => {
    store.add(makeSuggestion('s1'));
    store.remove('s1');
    expect(store.suggestions).toHaveLength(0);
  });

  it('should clear all suggestions', () => {
    store.add(makeSuggestion('s1'));
    store.add(makeSuggestion('s2'));
    store.clear();
    expect(store.suggestions).toHaveLength(0);
  });

  it('should filter by priority', () => {
    store.add(makeSuggestion('s1', 'high'));
    store.add(makeSuggestion('s2', 'low'));
    store.add(makeSuggestion('s3', 'high'));
    expect(store.getByPriority('high')).toHaveLength(2);
    expect(store.getByPriority('low')).toHaveLength(1);
    expect(store.getByPriority('medium')).toHaveLength(0);
  });

  it('should filter by type', () => {
    store.add(makeSuggestion('s1', 'medium', 'command'));
    store.add(makeSuggestion('s2', 'medium', 'warning'));
    expect(store.getByType('command')).toHaveLength(1);
    expect(store.getByType('warning')).toHaveLength(1);
    expect(store.getByType('tip')).toHaveLength(0);
  });

  it('should get suggestions for a command via context.command', () => {
    const s: Suggestion = { ...makeSuggestion('s1'), context: { command: 'git' } };
    store.add(s);
    store.add(makeSuggestion('s2'));
    expect(store.getForCommand('git')).toHaveLength(1);
  });

  it('should get suggestions for a command via suggestion.command', () => {
    const s: Suggestion = { ...makeSuggestion('s1'), command: 'npm' };
    store.add(s);
    expect(store.getForCommand('npm')).toHaveLength(1);
  });

  it('should return top suggestions sorted by priority then timestamp', () => {
    const low = { ...makeSuggestion('low', 'low'), timestamp: 100 };
    const high = { ...makeSuggestion('high', 'high'), timestamp: 50 };
    const med = { ...makeSuggestion('med', 'medium'), timestamp: 200 };
    store.add(low);
    store.add(high);
    store.add(med);
    const top = store.getTop(2);
    expect(top[0].id).toBe('high');
    expect(top[1].id).toBe('med');
  });

  it('getTop should default to limit 1', () => {
    store.add(makeSuggestion('s1'));
    store.add(makeSuggestion('s2'));
    expect(store.getTop()).toHaveLength(1);
  });

  it('save and load are no-ops for in-memory store', async () => {
    await expect(store.save()).resolves.toBeUndefined();
    await expect(store.load()).resolves.toBeUndefined();
  });
});

describe('formatSuggestion', () => {
  it('should include title, description, and priority emoji', () => {
    const s = makeSuggestion('s1', 'high', 'warning');
    const result = formatSuggestion(s);
    expect(result).toContain('⚠️');
    expect(result).toContain('Suggestion s1');
    expect(result).toContain('Description for s1');
  });

  it('should include command when present', () => {
    const s: Suggestion = { ...makeSuggestion('s1', 'medium', 'command'), command: 'git', args: ['status'] };
    const result = formatSuggestion(s);
    expect(result).toContain('git');
    expect(result).toContain('status');
  });

  it('should not include Command line when no command', () => {
    const s = makeSuggestion('s1');
    const result = formatSuggestion(s);
    expect(result).not.toContain('Command:');
  });
});

describe('formatSuggestionsForCLI', () => {
  it('should return a no-suggestions message for empty array', () => {
    expect(formatSuggestionsForCLI([])).toContain('No suggestions');
  });

  it('should include all suggestions grouped by priority', () => {
    const suggestions: Suggestion[] = [
      makeSuggestion('h1', 'high'),
      makeSuggestion('m1', 'medium'),
      makeSuggestion('l1', 'low'),
    ];
    const result = formatSuggestionsForCLI(suggestions);
    expect(result).toContain('HIGH PRIORITY');
    expect(result).toContain('MEDIUM PRIORITY');
    expect(result).toContain('LOW PRIORITY');
  });

  it('should omit priority sections with no items', () => {
    const result = formatSuggestionsForCLI([makeSuggestion('h1', 'high')]);
    expect(result).not.toContain('LOW PRIORITY');
    expect(result).not.toContain('MEDIUM PRIORITY');
  });
});

describe('formatSuggestionCompact', () => {
  it('should return compact format for high priority', () => {
    const s = makeSuggestion('s1', 'high');
    expect(formatSuggestionCompact(s)).toContain('⚠');
    expect(formatSuggestionCompact(s)).toContain('Suggestion s1');
  });

  it('should return compact format for medium priority', () => {
    const s = makeSuggestion('s1', 'medium');
    expect(formatSuggestionCompact(s)).toContain('▲');
  });

  it('should return compact format for low priority', () => {
    const s = makeSuggestion('s1', 'low');
    expect(formatSuggestionCompact(s)).toContain('•');
  });
});

describe('formatTopSuggestion', () => {
  it('should return empty string for null', () => {
    expect(formatTopSuggestion(null)).toBe('');
  });

  it('should return compact format for a suggestion', () => {
    const s = makeSuggestion('s1', 'high');
    const result = formatTopSuggestion(s);
    expect(result).toContain('Suggestion s1');
  });
});
