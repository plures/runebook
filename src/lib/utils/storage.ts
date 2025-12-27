// Storage utility for RuneBook canvases
// Future: Will integrate with PluresDB for persistent storage

import type { Canvas } from '../types/canvas';

export interface StorageAdapter {
  save(canvas: Canvas): Promise<void>;
  load(id: string): Promise<Canvas | null>;
  list(): Promise<{ id: string; name: string; timestamp: number }[]>;
  delete(id: string): Promise<void>;
}

/**
 * LocalStorage adapter for browser-based storage
 * This is a simple implementation that will be replaced with PluresDB
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
 * PluresDB adapter (planned)
 * This will use PluresDB for persistent, P2P-enabled storage
 */
export class PluresDBAdapter implements StorageAdapter {
  async save(canvas: Canvas): Promise<void> {
    throw new Error('PluresDB integration not yet implemented');
  }

  async load(id: string): Promise<Canvas | null> {
    throw new Error('PluresDB integration not yet implemented');
  }

  async list(): Promise<{ id: string; name: string; timestamp: number }[]> {
    throw new Error('PluresDB integration not yet implemented');
  }

  async delete(id: string): Promise<void> {
    throw new Error('PluresDB integration not yet implemented');
  }
}

// Default storage adapter
export const storage: StorageAdapter = new LocalStorageAdapter();

/**
 * Save canvas to persistent storage
 */
export async function saveCanvas(canvas: Canvas): Promise<void> {
  await storage.save(canvas);
}

/**
 * Load canvas from persistent storage
 */
export async function loadCanvas(id: string): Promise<Canvas | null> {
  return await storage.load(id);
}

/**
 * List all saved canvases
 */
export async function listCanvases(): Promise<{ id: string; name: string; timestamp: number }[]> {
  return await storage.list();
}

/**
 * Delete a saved canvas
 */
export async function deleteCanvas(id: string): Promise<void> {
  await storage.delete(id);
}
