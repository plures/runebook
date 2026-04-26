// Tests for agent/node-suggestions.ts (FileSuggestionStore)

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileSuggestionStore } from '../node-suggestions';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Suggestion } from '../../types/agent';

const TEST_PATH = join(tmpdir(), 'runebook-test-suggestions.json');

const makeSuggestion = (id: string): Suggestion => ({
  id,
  type: 'tip',
  priority: 'medium',
  title: `Tip ${id}`,
  description: `Description ${id}`,
  timestamp: Date.now(),
});

describe('FileSuggestionStore', () => {
  let store: FileSuggestionStore;

  beforeEach(() => {
    if (existsSync(TEST_PATH)) {
      rmSync(TEST_PATH);
    }
    store = new FileSuggestionStore(TEST_PATH);
  });

  afterEach(() => {
    if (existsSync(TEST_PATH)) {
      rmSync(TEST_PATH);
    }
  });

  it('should start empty', () => {
    expect(store.suggestions).toHaveLength(0);
  });

  it('should add a suggestion and persist to file', async () => {
    store.add(makeSuggestion('s1'));
    // Wait for async save to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(existsSync(TEST_PATH)).toBe(true);
    expect(store.suggestions).toHaveLength(1);
  });

  it('should load suggestions from file', async () => {
    store.add(makeSuggestion('s1'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Create a new store and load from the same file
    const store2 = new FileSuggestionStore(TEST_PATH);
    await store2.load();
    expect(store2.suggestions).toHaveLength(1);
    expect(store2.suggestions[0].id).toBe('s1');
  });

  it('should handle load when file does not exist', async () => {
    await expect(store.load()).resolves.toBeUndefined();
    expect(store.suggestions).toHaveLength(0);
  });

  it('should handle load when file contains invalid JSON', async () => {
    const { writeFileSync } = await import('fs');
    writeFileSync(TEST_PATH, 'not-json', 'utf-8');
    await expect(store.load()).resolves.toBeUndefined();
    expect(store.suggestions).toHaveLength(0);
  });

  it('should remove a suggestion and persist', async () => {
    store.add(makeSuggestion('s1'));
    store.add(makeSuggestion('s2'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    store.remove('s1');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(store.suggestions).toHaveLength(1);
    expect(store.suggestions[0].id).toBe('s2');
  });

  it('should clear suggestions and persist', async () => {
    store.add(makeSuggestion('s1'));
    store.add(makeSuggestion('s2'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    store.clear();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(store.suggestions).toHaveLength(0);
  });

  it('should save suggestions to file explicitly', async () => {
    store.add(makeSuggestion('s1'));
    await store.save();
    expect(existsSync(TEST_PATH)).toBe(true);
  });
});
