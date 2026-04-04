<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import { WebLinksAddon } from '@xterm/addon-web-links';
  import { WebglAddon } from '@xterm/addon-webgl';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';
  import { requestTerminal, releaseTerminal } from '../praxis/runtime';
  import { captureCommandStart, captureCommandResult, isAgentEnabled } from '../agent/integration';
  import type { TerminalEvent } from '../types/agent';
  import { Box, Button, Text } from '@plures/design-dojo';

  interface Props {
    node: TerminalNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  let terminalEl = $state<HTMLDivElement | null>(null);
  let isRunning = $state(false);
  let error = $state<string | null>(null);

  let term: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let resizeObserver: ResizeObserver | null = null;

  function isTauriContext(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  function fitTerminal() {
    if (fitAddon) {
      try {
        fitAddon.fit();
      } catch {
        // ignore fit errors (e.g. zero-size container during test)
      }
    }
  }

  async function executeCommand() {
    if (isRunning) return;

    if (!isTauriContext()) {
      error = 'Terminal execution is only available in the desktop app';
      term?.writeln('\x1b[31m✗ Terminal execution is only available in the desktop app\x1b[0m');
      return;
    }

    // Enforce process limit via the resource-management Praxis module.
    if (!requestTerminal(node.id)) {
      error = 'Terminal process limit reached';
      term?.writeln('\x1b[31m✗ Terminal process limit reached\x1b[0m');
      return;
    }

    isRunning = true;
    error = null;
    term?.writeln(`\x1b[33m$ ${node.command} ${(node.args || []).join(' ')}\x1b[0m`);

    // Capture command start for agent
    let agentEvent: TerminalEvent | null = null;
    if (isAgentEnabled()) {
      agentEvent = await captureCommandStart(
        node.command,
        node.args || [],
        node.env || {},
        node.cwd || ''
      );
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<string>('execute_terminal_command', {
        command: node.command,
        args: node.args || [],
        env: node.env || {},
        cwd: node.cwd || ''
      });

      term?.writeln(result);

      if (agentEvent) {
        await captureCommandResult(agentEvent, result, '', 0);
      }

      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, result);
      }
    } catch (e) {
      const errorMsg = String(e);
      error = errorMsg;
      term?.writeln(`\x1b[31m✗ ${errorMsg}\x1b[0m`);

      if (agentEvent) {
        await captureCommandResult(agentEvent, '', errorMsg, 1);
      }
    } finally {
      isRunning = false;
      releaseTerminal(node.id);
    }
  }

  function clearOutput() {
    error = null;
    term?.clear();
    term?.reset();

    if (node.outputs.length > 0) {
      updateNodeData(node.id, node.outputs[0].id, '');
    }
  }

  onMount(() => {
    if (terminalEl) {
      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'var(--font-mono, monospace)',
        convertEol: true,
        disableStdin: true,
        scrollback: 1000,
        theme: {
          background: '#0d0d0d',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
        },
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(terminalEl);

      // Try WebGL renderer; fall back to canvas renderer silently.
      try {
        const webglAddon = new WebglAddon();
        term.loadAddon(webglAddon);
      } catch {
        // WebGL unavailable – canvas renderer already active.
      }

      fitTerminal();

      if (!isTauriContext()) {
        term.writeln('\x1b[2mTerminal output will appear here when running in the desktop app.\x1b[0m');
      }

      // Observe container resize to keep terminal fitted.
      resizeObserver = new ResizeObserver(() => fitTerminal());
      resizeObserver.observe(terminalEl);
    }

    const onWindowResize = () => fitTerminal();
    window.addEventListener('resize', onWindowResize);

    if (node.autoStart) {
      const shouldRun = window.confirm(
        `This terminal node is configured to run the following command automatically:\n\n` +
        `${node.command} ${(node.args || []).join(' ')}\n\n` +
        `Do you want to run it now?`
      );

      if (shouldRun) {
        executeCommand();
      }
    }

    return () => {
      window.removeEventListener('resize', onWindowResize);
    };
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    term?.dispose();
  });
</script>

<Box class="terminal-node" surface={2} border radius={3} shadow={2} {tui}>
  <Box class="node-header" surface={3} {tui}>
    <span class="node-icon">⚡</span>
    <Text class="node-title">{node.label || 'Terminal'}</Text>
  </Box>

  <Box class="node-body" pad={3}>
    <Box class="command-display" surface={1} pad={2} radius={2}>
      <Text mono class="command-text"><code>{node.command} {(node.args || []).join(' ')}</code></Text>
    </Box>

    <div class="xterm-container" bind:this={terminalEl}></div>

    {#if error}
      <Text class="error-line">✗ {error}</Text>
    {/if}
  </Box>

  <Box class="node-footer" pad={2}>
    <!-- Visually hidden aria-live region announces errors to screen readers -->
    <div
      class="error-live"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >{error ?? ''}</div>
    <Button {tui} variant="primary" onclick={executeCommand} disabled={isRunning} class="run-btn">
      {isRunning ? '⏳ Running...' : '▶ Run'}
    </Button>
    <Button {tui} onclick={clearOutput} class="clear-btn" aria-label="Clear">Clear</Button>
  </Box>

</Box>

<style>
  :global(.terminal-node) {
    width: 100%;
    height: 100%;
    font-family: var(--font-mono);
    display: flex;
    flex-direction: column;
  }

  :global(.terminal-node .node-header) {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius-3) var(--radius-3) 0 0;
  }

  .node-icon {
    font-size: 18px;
  }

  :global(.terminal-node .node-title) {
    font-weight: 600;
    font-size: var(--font-size-1);
  }

  :global(.terminal-node .node-body) {
    padding: var(--space-3);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :global(.terminal-node .command-display) {
    margin-bottom: var(--space-2);
    font-size: var(--font-size-0);
    flex-shrink: 0;
  }

  :global(.terminal-node .command-text) {
    color: var(--brand);
  }

  .xterm-container {
    flex: 1;
    min-height: 120px;
    overflow: hidden;
    border-radius: var(--radius-2);
  }

  /* Let xterm.js manage its own sizing inside the container */
  .xterm-container :global(.xterm) {
    height: 100%;
  }

  :global(.terminal-node .error-line) {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--font-size-0);
    color: var(--error);
  }

  .error-live {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  :global(.terminal-node .node-footer) {
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: var(--space-2);
    position: relative;
  }

  :global(.terminal-node .run-btn) {
    flex: 1;
  }
</style>
