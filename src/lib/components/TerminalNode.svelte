<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount, onDestroy } from 'svelte';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';

  interface Props {
    node: TerminalNode;
  }

  let { node }: Props = $props();

  let output = $state<string[]>([]);
  let isRunning = $state(false);
  let error = $state<string | null>(null);

  async function executeCommand() {
    if (isRunning) return;
    
    isRunning = true;
    error = null;
    output = [];

    try {
      // Call Tauri backend to execute terminal command
      const result = await invoke<string>('execute_terminal_command', {
        command: node.command,
        args: node.args || [],
        env: node.env || {},
        cwd: node.cwd || ''
      });

      output = [...output, result];
      
      // Update the node's output data for reactive flow
      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, result);
      }
    } catch (e) {
      error = String(e);
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

<div class="terminal-node">
  <div class="node-header">
    <span class="node-icon">⚡</span>
    <span class="node-title">{node.label || 'Terminal'}</span>
  </div>
  
  <div class="node-body">
    <div class="command-display">
      <code>{node.command} {(node.args || []).join(' ')}</code>
    </div>
    
    <div class="output-container">
      {#if output.length > 0}
        {#each output as line}
          <div class="output-line">{line}</div>
        {/each}
      {:else}
        <div class="output-placeholder">No output yet</div>
      {/if}
      
      {#if error}
        <div class="error-line">{error}</div>
      {/if}
    </div>
  </div>
  
  <div class="node-footer">
    <button onclick={executeCommand} disabled={isRunning} class="run-btn">
      {isRunning ? '⏳ Running...' : '▶ Run'}
    </button>
    <button onclick={clearOutput} class="clear-btn">Clear</button>
  </div>
  
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
</div>

<style>
  .terminal-node {
    background: #2d2d2d;
    border: 2px solid #4a4a4a;
    border-radius: 8px;
    min-width: 300px;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
  }

  .node-header {
    background: #3a3a3a;
    padding: 8px 12px;
    border-bottom: 1px solid #4a4a4a;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 6px 6px 0 0;
  }

  .node-icon {
    font-size: 18px;
  }

  .node-title {
    font-weight: 600;
    font-size: 14px;
  }

  .node-body {
    padding: 12px;
  }

  .command-display {
    background: #1e1e1e;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .command-display code {
    color: #4ec9b0;
  }

  .output-container {
    background: #1e1e1e;
    padding: 8px;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    min-height: 60px;
    font-size: 11px;
  }

  .output-line {
    color: #d4d4d4;
    margin: 2px 0;
    word-break: break-word;
  }

  .output-placeholder {
    color: #808080;
    font-style: italic;
  }

  .error-line {
    color: #f48771;
    margin: 2px 0;
  }

  .node-footer {
    padding: 8px 12px;
    border-top: 1px solid #4a4a4a;
    display: flex;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .run-btn {
    background: #0e639c;
    color: white;
    flex: 1;
  }

  .run-btn:hover:not(:disabled) {
    background: #1177bb;
  }

  .run-btn:disabled {
    background: #555;
    cursor: not-allowed;
  }

  .clear-btn {
    background: #3a3a3a;
    color: #d4d4d4;
  }

  .clear-btn:hover {
    background: #4a4a4a;
  }

  .ports {
    position: relative;
  }

  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #4ec9b0;
    border: 2px solid #2d2d2d;
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
