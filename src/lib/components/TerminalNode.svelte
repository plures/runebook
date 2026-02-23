<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount, onDestroy } from 'svelte';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';
  import { captureCommandStart, captureCommandResult, isAgentEnabled } from '../agent/integration';
  import type { TerminalEvent } from '../types/agent';
  import Box from '../design-dojo/Box.svelte';
  import Button from '../design-dojo/Button.svelte';
  import Text from '../design-dojo/Text.svelte';

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
      // Call Tauri backend to execute terminal command
      const result = await invoke<string>('execute_terminal_command', {
        command: node.command,
        args: node.args || [],
        env: node.env || {},
        cwd: node.cwd || ''
      });

      output = [...output, result];
      
      // Capture command result for agent
      if (agentEvent) {
        await captureCommandResult(agentEvent, result, '', 0);
      }
      
      // Update the node's output data for reactive flow
      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, result);
      }
    } catch (e) {
      const errorMsg = String(e);
      error = errorMsg;
      
      // Capture error result for agent
      if (agentEvent) {
        await captureCommandResult(agentEvent, '', errorMsg, 1);
      }
      
      console.error('Terminal command error:', e);
    } finally {
      isRunning = false;
    }
  }

  function clearOutput() {
    output = [];
    error = null;
  }

  onMount(() => {
    if (node.autoStart) {
      executeCommand();
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
        <Text class="error-line">{error}</Text>
      {/if}
    </Box>
  </Box>
  
  <Box class="node-footer" pad={2}>
    <Button {tui} variant="primary" onclick={executeCommand} disabled={isRunning} class="run-btn">
      {isRunning ? '⏳ Running...' : '▶ Run'}
    </Button>
    <Button {tui} onclick={clearOutput} class="clear-btn">Clear</Button>
  </Box>
  
  <!-- Input/Output ports -->
  <div class="ports">
    {#each node.inputs as port}
      <div class="port input-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
    
    {#each node.outputs as port}
      <div class="port output-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
  </div>
</Box>

<style>
  :global(.terminal-node) {
    min-width: 300px;
    max-width: 500px;
    font-family: var(--font-mono);
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

  :global(.terminal-node .node-footer) {
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: var(--space-2);
  }

  :global(.terminal-node .run-btn) {
    flex: 1;
  }

  .ports {
    position: relative;
  }

  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--brand);
    border: 2px solid var(--surface-2);
    border-radius: 50%;
    cursor: crosshair;
  }

  .input-port {
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .output-port {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .port-label {
    display: none;
  }
</style>
