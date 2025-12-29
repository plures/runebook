// Storage utility for RuneBook canvases
// Integrated with PluresDB for persistent storage

import type { Canvas } from '../types/canvas';

export interface StorageAdapter {
  save(canvas: Canvas): Promise<void>;
  load(id: string): Promise<Canvas | null>;
  list(): Promise<{ id: string; name: string; timestamp: number }[]>;
  delete(id: string): Promise<void>;
}

/**
 * LocalStorage adapter for browser-based storage
 * Fallback option when PluresDB is not available
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix = 'runebook_canvas_';

  private validateCanvas(data: any): data is { canvas: Canvas; timestamp: number } {
    return (
      data &&
      typeof data === 'object' &&
      'canvas' in data &&
      'timestamp' in data &&
      typeof data.timestamp === 'number' &&
      data.canvas &&
      typeof data.canvas === 'object' &&
      'id' in data.canvas &&
      'name' in data.canvas &&
      'nodes' in data.canvas &&
      Array.isArray(data.canvas.nodes)
    );
  }

  async save(canvas: Canvas): Promise<void> {
    const key = this.prefix + canvas.id;
    const data = {
      canvas,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  async load(id: string): Promise<Canvas | null> {
    const key = this.prefix + id;
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const data = JSON.parse(item);
      if (!this.validateCanvas(data)) {
        console.error('Invalid canvas data structure');
        return null;
      }
      return data.canvas;
    } catch (e) {
      console.error('Failed to parse canvas data:', e);
      return null;
    }
  }

  async list(): Promise<{ id: string; name: string; timestamp: number }[]> {
    const canvases: { id: string; name: string; timestamp: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            if (this.validateCanvas(data)) {
              canvases.push({
                id: data.canvas.id,
                name: data.canvas.name,
                timestamp: data.timestamp,
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse canvas metadata:', e);
        }
      }
    }

    return canvases.sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(id: string): Promise<void> {
    const key = this.prefix + id;
    localStorage.removeItem(key);
  }
}

/**
 * PluresDB adapter for persistent, P2P-enabled storage
 * Uses PluresDB's key-value API for storing canvas data
 */
export class PluresDBAdapter implements StorageAdapter {
  private db: any = null;
  private readonly prefix = 'runebook:canvas:';
  private readonly metaPrefix = 'runebook:meta:';
  private initialized = false;

  constructor() {
    // Lazy initialization - will be initialized on first use
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      const { SQLiteCompatibleAPI } = await import('pluresdb');
      
      this.db = new SQLiteCompatibleAPI({
        config: {
          port: 34567,
          host: 'localhost',
          dataDir: './pluresdb-data',
        },
        autoStart: true,
      });

      // Wait for initialization
      await this.db.start();
      this.initialized = true;
      console.log('PluresDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PluresDB:', error);
      throw new Error('PluresDB initialization failed. Make sure PluresDB server is running or use LocalStorageAdapter as fallback.');
    }
  }

  private validateCanvas(data: any): data is { canvas: Canvas; timestamp: number } {
    return (
      data &&
      typeof data === 'object' &&
      'canvas' in data &&
      'timestamp' in data &&
      typeof data.timestamp === 'number' &&
      data.canvas &&
      typeof data.canvas === 'object' &&
      'id' in data.canvas &&
      'name' in data.canvas &&
      'nodes' in data.canvas &&
      Array.isArray(data.canvas.nodes)
    );
  }

  async save(canvas: Canvas): Promise<void> {
    await this.ensureInitialized();

    const key = this.prefix + canvas.id;
    const metaKey = this.metaPrefix + canvas.id;
    const timestamp = Date.now();
    
    const data = {
      canvas,
      timestamp,
    };

    // Save the full canvas data
    await this.db.put(key, data);

    // Save metadata for efficient listing
    await this.db.put(metaKey, {
      id: canvas.id,
      name: canvas.name,
      timestamp,
    });
  }

  async load(id: string): Promise<Canvas | null> {
    await this.ensureInitialized();

    const key = this.prefix + id;
    
    try {
      const data = await this.db.getValue(key);
      
      if (!data) {
        return null;
      }

      if (!this.validateCanvas(data)) {
        console.error('Invalid canvas data structure in PluresDB');
        return null;
      }

      return data.canvas;
    } catch (error) {
      console.error('Failed to load canvas from PluresDB:', error);
      return null;
    }
  }

  async list(): Promise<{ id: string; name: string; timestamp: number }[]> {
    await this.ensureInitialized();

    try {
      // Get all metadata keys
      const keys = await this.db.list(this.metaPrefix);
      const canvases: { id: string; name: string; timestamp: number }[] = [];

      // Fetch each metadata entry
      for (const key of keys) {
        try {
          const meta = await this.db.getValue(key);
          if (meta && meta.id && meta.name && typeof meta.timestamp === 'number') {
            canvases.push({
              id: meta.id,
              name: meta.name,
              timestamp: meta.timestamp,
            });
          }
        } catch (error) {
          console.error('Failed to load canvas metadata:', error);
        }
      }

      // Sort by timestamp, newest first
      return canvases.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to list canvases from PluresDB:', error);
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();

    const key = this.prefix + id;
    const metaKey = this.metaPrefix + id;

    try {
      // Delete both the canvas data and metadata
      await this.db.delete(key);
      await this.db.delete(metaKey);
    } catch (error) {
      console.error('Failed to delete canvas from PluresDB:', error);
      throw error;
    }
  }

  /**
   * Stop the PluresDB server (cleanup)
   */
  async stop(): Promise<void> {
    if (this.db && this.initialized) {
      try {
        await this.db.stop();
        this.initialized = false;
        console.log('PluresDB stopped');
      } catch (error) {
        console.error('Failed to stop PluresDB:', error);
      }
    }
  }
}

// Default storage adapter - use LocalStorage for browser compatibility
// Users can switch to PluresDBAdapter if they have PluresDB server running
export const storage: StorageAdapter = new LocalStorageAdapter();

// Export a function to switch to PluresDB
let currentAdapter: StorageAdapter = storage;

export function useLocalStorage(): void {
  currentAdapter = new LocalStorageAdapter();
}

export function usePluresDB(): void {
  currentAdapter = new PluresDBAdapter();
}

export function getCurrentAdapter(): StorageAdapter {
  return currentAdapter;
}

/**
 * Save canvas to persistent storage
 */
export async function saveCanvas(canvas: Canvas): Promise<void> {
  await currentAdapter.save(canvas);
}

/**
 * Load canvas from persistent storage
 */
export async function loadCanvas(id: string): Promise<Canvas | null> {
  return await currentAdapter.load(id);
}

/**
 * List all saved canvases
 */
export async function listCanvases(): Promise<{ id: string; name: string; timestamp: number }[]> {
  return await currentAdapter.list();
}

/**
 * Delete a saved canvas
 */
export async function deleteCanvas(id: string): Promise<void> {
  await currentAdapter.delete(id);
}
