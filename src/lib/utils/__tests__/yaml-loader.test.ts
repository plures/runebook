// Tests for yaml-loader utility

import { describe, it, expect, vi } from 'vitest';
import { loadCanvasFromYAML, saveCanvasToYAML, loadCanvasFromFile } from '../yaml-loader';
import type { Canvas } from '../../types/canvas';

const validCanvas: Canvas = {
  id: 'test-canvas',
  name: 'Test Canvas',
  description: 'A test canvas',
  nodes: [],
  connections: [],
  version: '1.0.0',
};

const validYAML = `
id: test-canvas
name: Test Canvas
description: A test canvas
nodes: []
connections: []
version: 1.0.0
`;

describe('yaml-loader', () => {
  describe('loadCanvasFromYAML', () => {
    it('should parse valid YAML canvas', async () => {
      const result = await loadCanvasFromYAML(validYAML);
      expect(result.id).toBe('test-canvas');
      expect(result.name).toBe('Test Canvas');
      expect(result.description).toBe('A test canvas');
      expect(result.nodes).toEqual([]);
      expect(result.connections).toEqual([]);
    });

    it('should throw for YAML missing required fields', async () => {
      const missingFields = `
name: Test Canvas
nodes: []
connections: []
`;
      await expect(loadCanvasFromYAML(missingFields)).rejects.toThrow(
        /invalid canvas yaml/i
      );
    });

    it('should throw for YAML missing nodes', async () => {
      const missingNodes = `
id: test
name: Test Canvas
connections: []
`;
      await expect(loadCanvasFromYAML(missingNodes)).rejects.toThrow(
        /invalid canvas yaml/i
      );
    });

    it('should use defaults for optional fields', async () => {
      const minimalYAML = `
id: minimal
name: Minimal Canvas
nodes: []
connections: []
`;
      const result = await loadCanvasFromYAML(minimalYAML);
      expect(result.description).toBe('');
      expect(result.version).toBe('1.0.0');
    });

    it('should throw for invalid YAML', async () => {
      const invalidYAML = '{ invalid: yaml: content: [';
      await expect(loadCanvasFromYAML(invalidYAML)).rejects.toThrow();
    });
  });

  describe('saveCanvasToYAML', () => {
    it('should serialize a canvas to YAML string', () => {
      const yaml = saveCanvasToYAML(validCanvas);
      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('test-canvas');
      expect(yaml).toContain('Test Canvas');
    });

    it('should produce YAML that round-trips correctly', async () => {
      const yaml = saveCanvasToYAML(validCanvas);
      const result = await loadCanvasFromYAML(yaml);
      expect(result.id).toBe(validCanvas.id);
      expect(result.name).toBe(validCanvas.name);
    });
  });

  describe('loadCanvasFromFile', () => {
    it('should load canvas from a URL using fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => validYAML,
      } as Response);

      const result = await loadCanvasFromFile('/path/to/canvas.yaml');
      expect(result.id).toBe('test-canvas');
      expect(global.fetch).toHaveBeenCalledWith('/path/to/canvas.yaml');
    });

    it('should throw when fetch response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(loadCanvasFromFile('/missing.yaml')).rejects.toThrow(
        'Failed to load canvas file: Not Found'
      );
    });

    it('should throw when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await expect(loadCanvasFromFile('/unreachable.yaml')).rejects.toThrow('Network error');
    });
  });
});
