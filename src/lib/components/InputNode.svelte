<script lang="ts">
  import { untrack } from 'svelte';
  import type { InputNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';
  import Box from '../design-dojo/Box.svelte';
  import Input from '../design-dojo/Input.svelte';
  import Toggle from '../design-dojo/Toggle.svelte';
  import Text from '../design-dojo/Text.svelte';

  interface Props {
    node: InputNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  // Initialize value from node prop (warning is expected as we need mutable state)
  let value = $state(node.value ?? '');

  function handleValueChange() {
    // Update the node's output data for reactive flow
    if (node.outputs.length > 0) {
      updateNodeData(node.id, node.outputs[0].id, value);
    }
  }

  $effect(() => {
    // Capture value outside untrack to establish it as the only reactive
    // dependency. node properties are accessed inside untrack to prevent an
    // infinite update cycle: Praxis deep-clones context on every dispatch,
    // which creates a new node prop reference each time, which would otherwise
    // re-trigger this effect indefinitely.
    const currentValue = value;
    untrack(() => {
      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, currentValue);
      }
    });
  });
</script>

<Box class="input-node" surface={2} border radius={3} shadow={2} {tui}>
  <Box class="node-header" surface={3} {tui}>
    <span class="node-icon">📝</span>
    <Text class="node-title">{node.label || 'Input'}</Text>
  </Box>
  
  <Box class="node-body" pad={3}>
    {#if node.inputType === 'text'}
      <Input
        {tui}
        type="text"
        bind:value
        placeholder="Enter text..."
      />
    {:else if node.inputType === 'number'}
      <Input
        {tui}
        type="number"
        bind:value
        min={node.min}
        max={node.max}
        step={node.step}
      />
    {:else if node.inputType === 'checkbox'}
      <Toggle
        {tui}
        bind:checked={value}
        label={node.label}
      />
    {:else if node.inputType === 'slider'}
      <div class="slider-container">
        <Input
          {tui}
          type="range"
          bind:value
          min={node.min ?? 0}
          max={node.max ?? 100}
          step={node.step ?? 1}
        />
        <Text variant={1} class="slider-value">{value}</Text>
      </div>
    {/if}
  </Box>
  
  <!-- Output ports -->
  <div class="ports">
    {#each node.outputs as port}
      <div class="port output-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
  </div>
</Box>

<style>
  :global(.input-node) {
    min-width: 250px;
  }

  :global(.input-node .node-header) {
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

  :global(.input-node .node-title) {
    font-weight: 600;
    font-size: var(--font-size-1);
  }

  :global(.input-node .node-body) {
    padding: var(--space-3);
  }

  .slider-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  :global(.input-node .slider-value) {
    text-align: center;
    font-weight: 600;
    color: var(--brand);
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

  .output-port {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .port-label {
    display: none;
  }
</style>
