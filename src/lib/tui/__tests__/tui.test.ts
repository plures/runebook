// Unit tests for the TUI module

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
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
${
    canvas.nodes.map((n) =>
      `  - id: ${n.id}
    type: ${n.type}
    label: "${n.label}"
    position:
      x: ${n.position.x}
      y: ${n.position.y}
    inputs: []
    outputs: []`
    ).join('\n')
  }
connections:
${
    canvas.connections.map((c) =>
      `  - from: ${c.from}
    to: ${c.to}
    fromPort: ${c.fromPort}
    toPort: ${c.toPort}`
    ).join('\n')
  }
`;
}

/** Create a temp YAML file and return its path */
function writeTempCanvas(canvas: Canvas = SAMPLE_CANVAS): string {
  const path = join(tmpdir(), `runebook-test-${randomUUID()}.yaml`);
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
    const path = join(tmpdir(), `invalid-${randomUUID()}.yaml`);
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
    const savePath = join(tmpdir(), `runebook-save-${randomUUID()}.yaml`);
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
      try {
        unlinkSync(savePath);
      } catch { /* ignore */ }
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

  it('selectNext/Prev are no-ops on empty canvas', () => {
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
      expect(app.nodes).toHaveLength(2);
      app.deleteSelected(); // delete node-1
      expect(app.nodes).toHaveLength(1);
      expect(app.nodes[0].id).toBe('node-2');
      // Connection involving node-1 should be removed
      expect((app as any).state.canvas.connections).toHaveLength(0);
    } finally {
      unlinkSync(path);
    }
  });

  it('sets message after deleting', () => {
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

  it('q key calls quit()', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'quit').mockImplementation(() => {/* stub */});
      app.handleKey('q', Buffer.from([0x71]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('Ctrl+C calls quit()', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'quit').mockImplementation(() => {/* stub */});
      app.handleKey('\x03', Buffer.from([0x03]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('r key calls runSelected()', () => {
    const path = writeTempCanvas();
    try {
      const app = new TUIApp();
      app.loadFromFile(path);
      const spy = vi.spyOn(app, 'runSelected').mockResolvedValue();
      app.handleKey('r', Buffer.from([0x72]));
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      unlinkSync(path);
    }
  });

  it('c key clears terminal output', () => {
    const path = writeTempCanvas();
    try {
      const chunks: string[] = [];
      const fakeOut = {
        write: (s: string) => {
          chunks.push(s);
        },
        columns: 100,
        rows: 24,
      } as any;
      const app = new TUIApp({ output: fakeOut });
      app.loadFromFile(path);
      // Seed terminal output
      (app as any).state.terminalOutput = ['line1', 'line2'];
      app.handleKey('c', Buffer.from([0x63]));
      expect((app as any).state.terminalOutput).toHaveLength(0);
    } finally {
      unlinkSync(path);
    }
  });

  // ── render (smoke test) ───────────────────────────────────────────────────────

  it('render() writes output without throwing', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
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
      write: (s: string) => {
        chunks.push(s);
      },
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

  it('render() shows Output pane when terminal output is present', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const path = writeTempCanvas();
    try {
      const app = new TUIApp({ output: fakeOut });
      app.loadFromFile(path);
      (app as any).state.terminalOutput = ['hello world'];
      app.render();
      const output = chunks.join('');
      expect(output).toContain('Output');
      expect(output).toContain('hello world');
    } finally {
      unlinkSync(path);
    }
  });

  it('render() shows Output pane when mode is run', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const path = writeTempCanvas();
    try {
      const app = new TUIApp({ output: fakeOut });
      app.loadFromFile(path);
      (app as any).state.mode = 'run';
      app.render();
      const output = chunks.join('');
      expect(output).toContain('Output');
      expect(output).toContain('RUN');
    } finally {
      unlinkSync(path);
    }
  });

  // ── mode ──────────────────────────────────────────────────────────────────────

  it('starts in normal mode', () => {
    const app = new TUIApp();
    expect(app.mode).toBe('normal');
  });

  // ── runSelected (terminal execution) ──────────────────────────────────────────

  it('runSelected() executes a terminal node command and captures output', async () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-exec',
      name: 'Exec Canvas',
      nodes: [
        {
          id: 'term-1',
          type: 'terminal',
          label: 'Echo',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          command: 'echo',
          args: ['hello world'],
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;
    expect(app.selectedNode?.id).toBe('term-1');

    await app.runSelected();

    expect(app.mode).toBe('normal');
    const output = (app as any).state.terminalOutput as string[];
    expect(output.some((l: string) => l.includes('hello world'))).toBe(true);
    // Message is cleared by render(), so check output buffer
    const rendered = chunks.join('');
    expect(rendered).toContain('exited with code 0');
  });

  it('runSelected() rejects non-terminal node types', async () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-norun',
      name: 'NoRun Canvas',
      nodes: [
        {
          id: 'disp-1',
          type: 'display',
          label: 'Display',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          displayType: 'text',
          content: null,
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;

    await app.runSelected();

    expect(app.mode).toBe('normal');
    const rendered = chunks.join('');
    expect(rendered).toMatch(/only terminal nodes/i);
  });

  it('runSelected() shows error for terminal node with no command', async () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-nocmd',
      name: 'NoCmd Canvas',
      nodes: [
        {
          id: 'term-empty',
          type: 'terminal',
          label: 'Empty',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          command: '',
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;

    await app.runSelected();

    expect(app.mode).toBe('normal');
    const rendered = chunks.join('');
    expect(rendered).toMatch(/no command/i);
  });

  it('runSelected() captures stderr with [err] prefix', async () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-stderr',
      name: 'Stderr Canvas',
      nodes: [
        {
          id: 'term-err',
          type: 'terminal',
          label: 'Stderr',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          command: 'echo',
          args: ['oops >&2'],
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;

    await app.runSelected();

    const output = (app as any).state.terminalOutput as string[];
    expect(output.some((l: string) => l.includes('[err]') || l.includes('oops'))).toBe(true);
  });

  it('runSelected() switches mode to run during execution', async () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-mode',
      name: 'Mode Canvas',
      nodes: [
        {
          id: 'term-mode',
          type: 'terminal',
          label: 'Sleep',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          command: 'echo',
          args: ['done'],
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;

    // After completion, mode should return to normal
    await app.runSelected();
    expect(app.mode).toBe('normal');
  });

  // ── nodeProps (terminal fields) ───────────────────────────────────────────────

  it('render() shows terminal-specific properties (Cmd, Args, Cwd)', () => {
    const chunks: string[] = [];
    const fakeOut = {
      write: (s: string) => {
        chunks.push(s);
      },
      columns: 100,
      rows: 24,
    } as any;

    const canvas: Canvas = {
      id: 'test-props',
      name: 'Props Canvas',
      nodes: [
        {
          id: 'term-props',
          type: 'terminal',
          label: 'MyTerm',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          command: 'ls',
          args: ['-la'],
          cwd: '/tmp',
        } as any,
      ],
      connections: [],
      version: '1.0.0',
    };

    const app = new TUIApp({ output: fakeOut });
    (app as any).state.canvas = canvas;
    app.render();

    const output = chunks.join('');
    expect(output).toContain('Cmd: ls');
    expect(output).toContain('Args: -la');
    expect(output).toContain('Cwd: /tmp');
  });
});
