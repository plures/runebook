<script lang="ts">
  import { onMount } from 'svelte';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';
  import { captureCommandStart, captureCommandResult, isAgentEnabled } from '../agent/integration';
  import type { TerminalEvent } from '../types/agent';
  import { Box, Button, Text } from '@plures/design-dojo';

  interface Props {
    node: TerminalNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  let output = $state<string[]>([]);
  let isRunning = $state(false);
  let error = $state<string | null>(null);

  async function executeCommand() {
    if (isRunning) return;

    isRunning = true;
    error = null;
    output = [];

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

      output = [...output, result];

      if (agentEvent) {
        await captureCommandResult(agentEvent, result, '', 0);
      }

      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, result);
      }
    } catch (e) {
      const errorMsg = String(e);
      error = errorMsg;

      if (agentEvent) {
        await captureCommandResult(agentEvent, '', errorMsg, 1);
      }
    } finally {
      isRunning = false;
    }
  }

  function clearOutput() {
    output = [];
    error = null;

    if (node.outputs.length > 0) {
      updateNodeData(node.id, node.outputs[0].id, '');
    }
  }

  onMount(() => {
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

    <Box class="output-container" surface={1} pad={2} radius={2}>
      {#if output.length > 0}
        {#each output as line}
          <Text mono variant={1} class="output-line">{line}</Text>
        {/each}
      {:else}
        <Text variant={2} class="output-placeholder">No output yet</Text>
      {/if}

      {#if error}
        <Text class="error-line">✗ {error}</Text>
      {/if}
    </Box>
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
  }

  :global(.terminal-node .command-display) {
    margin-bottom: var(--space-2);
    font-size: var(--font-size-0);
  }

  :global(.terminal-node .command-text) {
    color: var(--brand);
  }

  :global(.terminal-node .output-container) {
    max-height: 200px;
    overflow-y: auto;
    min-height: 60px;
    font-size: var(--font-size-0);
  }

  :global(.terminal-node .output-line) {
    display: block;
    margin: 2px 0;
    word-break: break-word;
  }

  :global(.terminal-node .output-placeholder) {
    font-style: italic;
  }

  :global(.terminal-node .error-line) {
    display: block;
    margin: 2px 0;
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
