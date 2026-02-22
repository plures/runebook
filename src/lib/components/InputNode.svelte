<script lang="ts">
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
    handleValueChange();
  });
</script>

<Box variant="node" {tui} style="min-width:250px">
  <Box variant="header" {tui}>
    <Text variant="normal" as="span" style="font-size:var(--font-size-icon)">📝</Text>
    <Text variant="normal" as="span" style="font-weight:600;font-size:var(--font-size-base)">{node.label || 'Input'}</Text>
  </Box>
  
  <Box variant="body" {tui}>
    {#if node.inputType === 'text'}
      <Input {tui} type="text" bind:value placeholder="Enter text..." />
    {:else if node.inputType === 'number'}
      <Input {tui} type="number" bind:value min={node.min} max={node.max} step={node.step} />
    {:else if node.inputType === 'checkbox'}
      <Toggle {tui} bind:checked={value} label={node.label} />
    {:else if node.inputType === 'slider'}
      <div class="slider-container">
        <Input {tui} type="range" bind:value min={node.min ?? 0} max={node.max ?? 100} step={node.step ?? 1} />
        <Text variant="accent" as="span" style="text-align:center;font-weight:600">{value}</Text>
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
  .slider-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

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

  .output-port {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .port-label {
    display: none;
  }
</style>
