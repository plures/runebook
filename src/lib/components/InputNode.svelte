<script lang="ts">
  import type { InputNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';

  interface Props {
    node: InputNode;
  }

  let { node }: Props = $props();

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

<div class="input-node">
  <div class="node-header">
    <span class="node-icon">📝</span>
    <span class="node-title">{node.label || 'Input'}</span>
  </div>
  
  <div class="node-body">
    {#if node.inputType === 'text'}
      <input 
        type="text" 
        bind:value
        placeholder="Enter text..."
        class="input-field"
      />
    {:else if node.inputType === 'number'}
      <input 
        type="number" 
        bind:value
        min={node.min}
        max={node.max}
        step={node.step}
        class="input-field"
      />
    {:else if node.inputType === 'checkbox'}
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          bind:checked={value}
        />
        <span>{node.label}</span>
      </label>
    {:else if node.inputType === 'slider'}
      <div class="slider-container">
        <input 
          type="range" 
          bind:value
          min={node.min ?? 0}
          max={node.max ?? 100}
          step={node.step ?? 1}
          class="slider"
        />
        <span class="slider-value">{value}</span>
      </div>
    {/if}
  </div>
  
  <!-- Output ports -->
  <div class="ports">
    {#each node.outputs as port}
      <div class="port output-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .input-node {
    background: #2d2d2d;
    border: 2px solid #4a4a4a;
    border-radius: 8px;
    min-width: 250px;
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
  }

  .input-field {
    width: 100%;
    padding: 8px;
    background: #1e1e1e;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 14px;
  }

  .input-field:focus {
    outline: none;
    border-color: #0e639c;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .slider {
    width: 100%;
    cursor: pointer;
  }

  .slider-value {
    text-align: center;
    font-weight: 600;
    color: #4ec9b0;
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

  .output-port {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .port-label {
    display: none;
  }
</style>
