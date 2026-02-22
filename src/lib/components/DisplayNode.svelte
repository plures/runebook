<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayNode } from '../types/canvas';
  import { canvasStore, nodeDataStore, getNodeInputData } from '../stores/canvas';
  import Box from '../design-dojo/Box.svelte';
  import Text from '../design-dojo/Text.svelte';
  import Table from '../design-dojo/Table.svelte';

  interface Props {
    node: DisplayNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  // Initialize content from node prop (warning is expected as we need mutable state)
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

<Box variant="node" {tui} style="min-width:300px;max-width:500px">
  <Box variant="header" {tui}>
    <Text variant="normal" as="span" style="font-size:var(--font-size-icon)">📊</Text>
    <Text variant="normal" as="span" style="font-weight:600;font-size:var(--font-size-base)">{node.label || 'Display'}</Text>
  </Box>
  
  <Box variant="body" {tui} style="max-height:400px;overflow-y:auto">
    {#if node.displayType === 'table' && Array.isArray(content)}
      <Table {tui} data={content} />
    {:else}
      <Box variant="inset" {tui}>
        <Text variant="code" as="pre">{formatContent()}</Text>
      </Box>
    {/if}
  </Box>
  
  <!-- Input ports -->
  <div class="ports">
    {#each node.inputs as port}
      <div class="port input-port" data-port-id={port.id}>
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

  .port-label {
    display: none;
  }
</style>
