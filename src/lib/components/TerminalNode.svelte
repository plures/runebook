<script lang="ts">
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import { WebLinksAddon } from '@xterm/addon-web-links';
  import { WebglAddon } from '@xterm/addon-webgl';
  import '@xterm/xterm/css/xterm.css';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onMount, onDestroy } from 'svelte';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';

  interface Props {
    node: TerminalNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  let terminalEl = $state<HTMLDivElement | null>(null);
  let terminal: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let terminalId = $state<string | null>(null);
  let shellName = $state<string>('shell');
  let status = $state<'starting' | 'running' | 'exited' | 'error'>('starting');
  let unlisteners: Array<() => void> = [];

  function isInTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  async function initTerminal() {
    if (!terminalEl) return;

    const term = new Terminal({
      cursorBlink: true,
      scrollback: 1000,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Cascadia Mono", monospace',
      fontSize: 13,
      theme: {
        background: '#1a1a2e',
        foreground: '#c0c0d0',
        cursor: '#00d4ff',
        selectionBackground: '#00d4ff33',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalEl);

    // Try WebGL renderer (must be loaded after open())
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available; xterm.js falls back to canvas renderer
    }

    fit.fit();

    terminal = term;
    fitAddon = fit;

    if (isInTauri()) {
      await connectPty();
    } else {
      term.writeln('\x1b[33mRuneBook Terminal\x1b[0m');
      term.writeln('\x1b[2m(PTY unavailable in web preview)\x1b[0m');
      status = 'error';
    }

    term.onData((data) => {
      const tid = terminalId;
      if (tid && isInTauri()) {
        invoke('write_terminal', { terminalId: tid, data }).catch(() => {});
      }
    });
  }

  async function connectPty() {
    try {
      const shell = node.shell;
      if (shell) {
        shellName = shell.split('/').pop() ?? shell;
      } else {
        shellName = navigator.platform.toLowerCase().includes('win') ? 'powershell' : 'shell';
      }

      const cols = terminal?.cols ?? 80;
      const rows = terminal?.rows ?? 24;

      const id = await invoke<string>('spawn_terminal', {
        shell: node.shell ?? null,
        cwd: node.cwd ?? null,
        env: node.env ?? {},
        cols,
        rows,
      });

      terminalId = id;
      status = 'running';

      const unlistenOutput = await listen<string>(`terminal-output-${id}`, (event) => {
        terminal?.write(event.payload);
        if (node.outputs.length > 0) {
          updateNodeData(node.id, node.outputs[0].id, event.payload);
        }
      });

      const unlistenExit = await listen<number>(`terminal-exit-${id}`, () => {
        status = 'exited';
        terminal?.writeln('\r\n\x1b[2m[Process exited]\x1b[0m');
      });

      unlisteners.push(unlistenOutput, unlistenExit);
    } catch (e) {
      status = 'error';
      terminal?.writeln(`\r\n\x1b[31mFailed to start terminal: ${e}\x1b[0m`);
    }
  }

  // Re-fit xterm.js and resize the PTY when the node is resized
  $effect(() => {
    // Track node.size as a reactive dependency
    const _size = node.size;
    if (fitAddon && _size) {
      fitAddon.fit();
      const tid = terminalId;
      if (tid) {
        invoke('resize_terminal', {
          terminalId: tid,
          cols: terminal?.cols ?? 80,
          rows: terminal?.rows ?? 24,
        }).catch(() => {});
      }
    }
  });

  onMount(() => {
    initTerminal();
  });

  onDestroy(() => {
    for (const fn of unlisteners) fn();
    const tid = terminalId;
    if (tid) {
      invoke('kill_terminal', { terminalId: tid }).catch(() => {});
    }
    terminal?.dispose();
  });
</script>

<div class="terminal-node">
  <div class="node-header">
    <span class="node-icon">⚡</span>
    <span class="node-title">{node.label || 'Terminal'}</span>
    <span class="shell-name">{shellName}</span>
    <span
      class="status-dot"
      class:running={status === 'running'}
      class:exited={status === 'exited'}
      class:error={status === 'error'}
      title={status}
    ></span>
  </div>
  <div class="terminal-container" bind:this={terminalEl}></div>
</div>

<style>
  .terminal-node {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #1a1a2e;
    font-family: "JetBrains Mono", "Cascadia Code", "Cascadia Mono", monospace;
    border-radius: var(--radius-3, 6px);
    overflow: hidden;
    color: #c0c0d0;
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #0f0f1e;
    border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    flex-shrink: 0;
  }

  .node-icon {
    font-size: 14px;
  }

  .node-title {
    font-weight: 600;
    font-size: 12px;
    flex: 1;
  }

  .shell-name {
    font-size: 11px;
    color: #00d4ff;
    opacity: 0.7;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #555;
    flex-shrink: 0;
  }

  .status-dot.running {
    background: #44ff88;
    box-shadow: 0 0 4px #44ff88;
  }

  .status-dot.exited {
    background: #aaaaaa;
  }

  .status-dot.error {
    background: #ff4444;
  }

  .terminal-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 4px;
  }

  :global(.terminal-node .xterm) {
    height: 100%;
  }

  :global(.terminal-node .xterm-viewport) {
    background: transparent !important;
  }
</style>
