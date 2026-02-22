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

<Box variant="node" {tui}>
  <Box variant="header" {tui}>
    <Text variant="normal" as="span" style="font-size: var(--font-size-icon)">⚡</Text>
    <Text variant="normal" as="span" style="font-weight:600;font-size:var(--font-size-base)">{node.label || 'Terminal'}</Text>
  </Box>
  
  <Box variant="body" {tui}>
    <Box variant="inset" {tui} style="margin-bottom:var(--space-md);font-size:var(--font-size-sm)">
      <code><Text variant="accent" as="span">{node.command} {(node.args || []).join(' ')}</Text></code>
    </Box>
    
    <Box variant="inset" {tui} style="max-height:200px;overflow-y:auto;min-height:60px;font-size:var(--font-size-xs)">
      {#if output.length > 0}
        {#each output as line}
          <div><Text variant="code" as="span">{line}</Text></div>
        {/each}
      {:else}
        <Text variant="muted" as="span">No output yet</Text>
      {/if}
      
      {#if error}
        <div><Text variant="error" as="span">{error}</Text></div>
      {/if}
    </Box>
  </Box>
  
  <Box variant="footer" {tui}>
    <Button variant="primary" onclick={executeCommand} disabled={isRunning} {tui}>
      {isRunning ? '⏳ Running...' : '▶ Run'}
    </Button>
    <Button variant="secondary" onclick={clearOutput} {tui}>Clear</Button>
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
  .ports {
    position: relative;
  }

  .port {
    position: absolute;
    width: var(--port-size);
    height: var(--port-size);
    background: var(--port-bg);
    border: 2px solid var(--port-border);
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
