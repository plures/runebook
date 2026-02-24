<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayNode } from '../types/canvas';
  import { canvasStore, nodeDataStore, getNodeInputData } from '../stores/canvas';
  import Box from '../design-dojo/Box.svelte';
  import Text from '../design-dojo/Text.svelte';
  import Table from '../design-dojo/Table.svelte';
  import List from '../design-dojo/List.svelte';

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

<Box class="display-node" surface={2} border radius={3} shadow={2} {tui}>
  <Box class="node-header" surface={3} {tui}>
    <span class="node-icon">📊</span>
    <Text class="node-title">{node.label || 'Display'}</Text>
  </Box>
  
  <Box class="node-body" pad={3}>
    {#if node.displayType === 'text' || node.displayType === 'json'}
      <Box class="text-display" surface={1} pad={3} radius={2}>
        <Text mono variant={1} class="display-pre">{formatContent()}</Text>
      </Box>
    {:else if node.displayType === 'table'}
      <div class="table-display">
        <Table {tui}>
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
                  {#each Object.values(row) as val}
                    <td>{val}</td>
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
        </Table>
      </div>
    {:else}
      <Box class="text-display" surface={1} pad={3} radius={2}>
        <Text mono variant={1} class="display-pre">{formatContent()}</Text>
      </Box>
    {/if}
  </Box>
  
</Box>

<style>
  :global(.display-node) {
    width: 100%;
    height: 100%;
  }

  :global(.display-node .node-header) {
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

  :global(.display-node .node-title) {
    font-weight: 600;
    font-size: var(--font-size-1);
  }

  :global(.display-node .node-body) {
    padding: var(--space-3);
    max-height: 400px;
    overflow-y: auto;
  }

  :global(.display-node .text-display) {
    font-family: var(--font-mono);
    font-size: var(--font-size-0);
  }

  :global(.display-node .display-pre) {
    display: block;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .table-display {
    overflow-x: auto;
  }


</style>
