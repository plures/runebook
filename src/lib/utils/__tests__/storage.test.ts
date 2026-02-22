// Tests for utils/storage (LocalStorageAdapter)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LocalStorageAdapter,
  useLocalStorage,
  usePluresDB,
  getCurrentAdapter,
  saveCanvas,
  loadCanvas,
  listCanvases,
  deleteCanvas,
} from '../storage';
import type { Canvas } from '../../types/canvas';

const makeCanvas = (id: string, name: string): Canvas => ({
  id,
  name,
  description: '',
  nodes: [],
  connections: [],
  version: '1.0.0',
});

// Mock localStorage
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    clear: vi.fn(() => { store = {}; }),
  };
}

describe('LocalStorageAdapter', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    adapter = new LocalStorageAdapter();
  });

  it('should save and load a canvas', async () => {
    const canvas = makeCanvas('c1', 'Canvas 1');
    await adapter.save(canvas);
    const loaded = await adapter.load('c1');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('c1');
    expect(loaded!.name).toBe('Canvas 1');
  });

  it('should return null when loading non-existent canvas', async () => {
    const result = await adapter.load('non-existent');
    expect(result).toBeNull();
  });

  it('should return null for invalid canvas data', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ bad: 'data' }));
    const result = await adapter.load('any-id');
    expect(result).toBeNull();
  });

  it('should return null when JSON is malformed', async () => {
    localStorageMock.getItem.mockReturnValueOnce('not-valid-json{{{');
    const result = await adapter.load('any-id');
    expect(result).toBeNull();
  });

  it('should list saved canvases', async () => {
    await adapter.save(makeCanvas('c1', 'Canvas 1'));
    await adapter.save(makeCanvas('c2', 'Canvas 2'));
    const list = await adapter.list();
    expect(list.length).toBe(2);
    expect(list.map(c => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('should return empty list when no canvases saved', async () => {
    const list = await adapter.list();
    expect(list).toEqual([]);
  });

  it('should sort list by timestamp descending', async () => {
    // Manually inject two items with distinct timestamps
    const ts1 = 1000;
    const ts2 = 2000;
    localStorageMock.setItem('runebook_canvas_c1', JSON.stringify({ canvas: makeCanvas('c1', 'Canvas 1'), timestamp: ts1 }));
    localStorageMock.setItem('runebook_canvas_c2', JSON.stringify({ canvas: makeCanvas('c2', 'Canvas 2'), timestamp: ts2 }));
    const list = await adapter.list();
    // Latest timestamp should be first
    expect(list[0].id).toBe('c2');
    expect(list[1].id).toBe('c1');
  });

  it('should delete a canvas', async () => {
    await adapter.save(makeCanvas('c1', 'Canvas 1'));
    await adapter.delete('c1');
    const loaded = await adapter.load('c1');
    expect(loaded).toBeNull();
  });

  it('should skip non-canvas localStorage keys in list', async () => {
    // Save a regular key that is not a runebook canvas
    localStorageMock.setItem('some_other_key', 'value');
    await adapter.save(makeCanvas('c1', 'Canvas 1'));
    const list = await adapter.list();
    expect(list).toHaveLength(1);
  });
});

describe('Storage adapter management', () => {
  beforeEach(() => {
    // Reset adapter to localStorage before each test
    useLocalStorage();
  });

  it('useLocalStorage sets adapter to LocalStorageAdapter', () => {
    useLocalStorage();
    expect(getCurrentAdapter()).toBeInstanceOf(LocalStorageAdapter);
  });

  it('usePluresDB sets adapter to a PluresDBAdapter instance', () => {
    usePluresDB({ port: 12345 });
    const adapter = getCurrentAdapter();
    // PluresDBAdapter is not exported but is not a LocalStorageAdapter
    expect(adapter).not.toBeInstanceOf(LocalStorageAdapter);
  });

  it('saveCanvas delegates to current adapter', async () => {
    const canvas = makeCanvas('c1', 'Canvas 1');
    const mock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', { value: mock, writable: true });
    useLocalStorage();
    await saveCanvas(canvas);
    expect(mock.setItem).toHaveBeenCalled();
  });

  it('loadCanvas delegates to current adapter', async () => {
    const mock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', { value: mock, writable: true });
    mock.getItem.mockReturnValueOnce(null);
    useLocalStorage();
    const result = await loadCanvas('non-existent');
    expect(result).toBeNull();
  });

  it('listCanvases delegates to current adapter', async () => {
    const mock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', { value: mock, writable: true });
    useLocalStorage();
    const result = await listCanvases();
    expect(Array.isArray(result)).toBe(true);
  });

  it('deleteCanvas delegates to current adapter', async () => {
    const mock = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', { value: mock, writable: true });
    useLocalStorage();
    await deleteCanvas('some-id');
    expect(mock.removeItem).toHaveBeenCalled();
  });
});
