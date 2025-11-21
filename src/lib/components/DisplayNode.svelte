<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayNode } from '../types/canvas';
  import { canvasStore, nodeDataStore, getNodeInputData } from '../stores/canvas';

  interface Props {
    node: DisplayNode;
  }

  let { node }: Props = $props();

  let content = $state<any>(node.content || '');

  // Subscribe to node data changes to update content reactively
  $effect(() => {
    const canvas = $canvasStore;
    const nodeData = $nodeDataStore;
    
    // Get input data from connected nodes
    if (node.inputs.length > 0) {
      const inputData = getNodeInputData(node.id, node.inputs[0].id, canvas.connections, nodeData);
      if (inputData !== undefined) {
        content = inputData;
      }
    }
  });

  function formatContent() {
    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  }
</script>

<div class="display-node">
  <div class="node-header">
    <span class="node-icon">📊</span>
    <span class="node-title">{node.label || 'Display'}</span>
  </div>
  
  <div class="node-body">
    {#if node.displayType === 'text'}
      <div class="text-display">
        <pre>{formatContent()}</pre>
      </div>
    {:else if node.displayType === 'json'}
      <div class="json-display">
        <pre>{formatContent()}</pre>
      </div>
    {:else if node.displayType === 'table'}
      <div class="table-display">
        <table>
          {#if Array.isArray(content)}
            <thead>
              <tr>
                {#each Object.keys(content[0] || {}) as key}
                  <th>{key}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each content as row}
                <tr>
                  {#each Object.values(row) as value}
                    <td>{value}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          {:else}
            <tbody>
              <tr>
                <td>No table data</td>
              </tr>
            </tbody>
          {/if}
        </table>
      </div>
    {:else}
      <div class="text-display">
        <pre>{formatContent()}</pre>
      </div>
    {/if}
  </div>
  
  <!-- Input ports -->
  <div class="ports">
    {#each node.inputs as port}
      <div class="port input-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .display-node {
    background: #2d2d2d;
    border: 2px solid #4a4a4a;
    border-radius: 8px;
    min-width: 300px;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #e0e0e0;
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
    max-height: 400px;
    overflow-y: auto;
  }

  .text-display, .json-display {
    background: #1e1e1e;
    padding: 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  .text-display pre, .json-display pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: #d4d4d4;
  }

  .table-display {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: #1e1e1e;
    border-radius: 4px;
  }

  th, td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #4a4a4a;
    font-size: 12px;
  }

  th {
    background: #3a3a3a;
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: none;
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

  .port-label {
    display: none;
  }
</style>
