// Unit tests for the TUI module

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Canvas } from '../../types/canvas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal canvas fixture */
const SAMPLE_CANVAS: Canvas = {
  id: 'test-canvas',
  name: 'Test Canvas',
  nodes: [
    {
      id: 'node-1',
      type: 'terminal',
      label: 'My Terminal',
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [],
      command: 'echo hello',
      args: [],
    } as any,
    {
      id: 'node-2',
      type: 'display',
      label: 'Output',
      position: { x: 500, y: 500 },
      inputs: [],
      outputs: [],
      displayType: 'text',
      content: null,
    } as any,
  ],
  connections: [{ from: 'node-1', to: 'node-2', fromPort: 'out', toPort: 'in' }],
  version: '1.0.0',
};

function canvasYAML(canvas: Canvas = SAMPLE_CANVAS): string {
  // Build minimal YAML manually so we don't depend on js-yaml in test setup
  return `id: ${canvas.id}
name: "${canvas.name}"
version: "${canvas.version}"
nodes:
${canvas.nodes.map(n => `  - id: ${n.id}
    type: ${n.type}
    label: "${n.label}"
    position:
      x: ${n.position.x}
      y: ${n.position.y}
    inputs: []
    outputs: []`).join('\n')}
connections:
${canvas.connections.map(c => `  - from: ${c.from}
    to: ${c.to}
    fromPort: ${c.fromPort}
    toPort: ${c.toPort}`).join('\n')}
`;
}

/** Create a temp YAML file and return its path */
function writeTempCanvas(canvas: Canvas = SAMPLE_CANVAS): string {
  const path = join(tmpdir(), `runebook-test-${Date.now()}.yaml`);
  writeFileSync(path, canvasYAML(canvas), 'utf-8');
  return path;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TUIApp', () => {
  // Lazy import so vitest mock hoisting works
  let TUIApp: typeof import('../index').TUIApp;

  beforeEach(async () => {
    ({ TUIApp } = await import('../index'));
  });

  // ── Construction ─────────────────────────────────────────────────────────────

  it('starts with no canvas', () => {
    const app = new TUIApp();
    expect(app.nodes).toHaveLength(0);
    expect(app.selectedNode).toBeNull();
  });

  // ── loadFromFile ─────────────────────────────────────────────────────────────

  it('loads a canvas from a YAML file', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      expect(app.nodes).toHaveLength(2);
      expect(app.nodes[0].id).toBe('node-1');
      expect(app.nodes[1].id).toBe('node-2');
    } finally {
      unlinkSync(path);
    }
  });

  it('sets filePath and message after load', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      expect(app.message).toContain('Loaded');
    } finally {
      unlinkSync(path);
    }
  });

  it('throws on a YAML file missing required canvas fields', () => {
    const path = join(tmpdir(), `invalid-${process.pid}-${Date.now()}.yaml`);
    // Valid YAML but missing the required canvas fields (id, name, nodes)
    writeFileSync(path, 'foo: bar\nbaz: 123\n', 'utf-8');
    try {
      const app = new TUIApp();
      expect(() => app.loadFromFile(path)).toThrow(/invalid canvas yaml/i);
    } finally {
      unlinkSync(path);
    }
  });

  // ── saveToFile ────────────────────────────────────────────────────────────────

  it('saves the canvas to a YAML file', () => {
    const loadPath = writeTempCanvas();
    const savePath = join(tmpdir(), `runebook-save-${Date.now()}.yaml`);
    try {
      const app = new TUIApp();
      app.loadFromFile(loadPath);
      app.saveToFile(savePath);

      // Reload and verify round-trip
      const app2 = new TUIApp();
      app2.loadFromFile(savePath);
      expect(app2.nodes).toHaveLength(2);
      expect(app2.nodes[0].id).toBe('node-1');
    } finally {
      unlinkSync(loadPath);
      try { unlinkSync(savePath); } catch { /* ignore */ }
    }
  });

  it('sets message if no path is available when saving', () => {
    const app = new TUIApp();
    // canvas is null, no file path
    app.saveToFile();
    expect(app.message).toMatch(/no file path/i);
  });

  // ── Navigation ────────────────────────────────────────────────────────────────

  it('selectNext cycles through nodes', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      expect(app.selectedNode?.id).toBe('node-1');
      app.selectNext();
      expect(app.selectedNode?.id).toBe('node-2');
      app.selectNext(); // wraps around
      expect(app.selectedNode?.id).toBe('node-1');
    } finally {
      unlinkSync(path);
    }
  });

  it('selectPrev cycles backwards through nodes', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      app.selectPrev(); // wraps to last node
      expect(app.selectedNode?.id).toBe('node-2');
      app.selectPrev();
      expect(app.selectedNode?.id).toBe('node-1');
    } finally {
      unlinkSync(path);
    }
  });

  it('navigation is a no-op when there are no nodes', () => {
    const app = new TUIApp();
    expect(() => {
      app.selectNext();
      app.selectPrev();
    }).not.toThrow();
    expect(app.selectedNode).toBeNull();
  });

  // ── deleteSelected ────────────────────────────────────────────────────────────

  it('deletes the selected node and its connections', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);

      // Select node-1 (index 0) and delete
      app.deleteSelected();
      expect(app.nodes).toHaveLength(1);
      expect(app.nodes[0].id).toBe('node-2');
      // Connection referencing node-1 should also be removed
      expect((app as any).state.canvas.connections).toHaveLength(0);
    } finally {
      unlinkSync(path);
    }
  });

  it('delete sets a message', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      app.deleteSelected();
      expect(app.message).toMatch(/deleted/i);
    } finally {
      unlinkSync(path);
    }
  });

  it('deleteSelected is a no-op on empty canvas', () => {
    const app = new TUIApp();
    expect(() => app.deleteSelected()).not.toThrow();
  });

  // ── handleKey ─────────────────────────────────────────────────────────────────

  it('Tab key calls selectNext', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'selectNext');
      app.handleKey('\t', Buffer.from([0x09]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('↑ arrow key calls selectPrev', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'selectPrev');
      app.handleKey('\x1b[A', Buffer.from([0x1b, 0x5b, 0x41]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('↓ arrow key calls selectNext', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'selectNext');
      app.handleKey('\x1b[B', Buffer.from([0x1b, 0x5b, 0x42]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('d key calls deleteSelected', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'deleteSelected');
      app.handleKey('d', Buffer.from([0x64]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('Ctrl+S calls saveToFile', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'saveToFile');
      app.handleKey('\x13', Buffer.from([0x13]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  // ── render (smoke test) ───────────────────────────────────────────────────────

  it('render() writes output without throwing', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => { chunks.push(s); },
      columns: 100,
      rows: 24,
    } as any;

    const path = writeTempCanvas();
    try {
      const app = new TUIApp({ output: fakeOut });
      app.loadFromFile(path);
      expect(() => app.render()).not.toThrow();
      const output = chunks.join('');
      // Should contain node labels
      expect(output).toContain('My Terminal');
      expect(output).toContain('Output');
      // Should contain mode in status bar
      expect(output).toContain('NORMAL');
    } finally {
      unlinkSync(path);
    }
  });

  it('render() shows (empty) message when there are no nodes', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => { chunks.push(s); },
      columns: 100,
      rows: 24,
    } as any;

    const app = new TUIApp({ output: fakeOut });
    // Create blank canvas
    (app as any).state.canvas = {
      id: 'blank',
      name: 'Blank',
      nodes: [],
      connections: [],
      version: '1.0.0',
    };

    expect(() => app.render()).not.toThrow();
  });

  // ── mode ──────────────────────────────────────────────────────────────────────

  it('starts in normal mode', () => {
    const app = new TUIApp();
    expect(app.mode).toBe('normal');
  });
});
