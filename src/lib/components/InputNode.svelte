<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte';

  interface Props {
    id: string;
    data: {
      label: string;
      inputType: string;
      value: any;
    };
  }

  let { id, data }: Props = $props();
  let value = $state(data.value ?? '');

  const { updateNodeData } = useSvelteFlow();

  function handleChange() {
    updateNodeData(id, { value });
  }
</script>

<div class="node-wrapper node-shell input-node">
  <div class="node-header">
    <span class="node-icon">📝</span>
    <span class="node-label">{data.label || 'Input'}</span>
  </div>

  <div class="node-body">
    {#if data.inputType === 'checkbox'}
      <label class="checkbox-wrap">
        <input type="checkbox" bind:checked={value} onchange={handleChange} />
        <span class="checkbox-label">{value ? 'true' : 'false'}</span>
      </label>
    {:else if data.inputType === 'number'}
      <input
        class="dd-input"
        type="number"
        bind:value
        oninput={handleChange}
      />
    {:else if data.inputType === 'slider'}
      <input
        class="slider"
        type="range"
        min="0"
        max="100"
        bind:value
        oninput={handleChange}
      />
      <span class="slider-value">{value}</span>
    {:else}
      <input
        class="dd-input"
        type="text"
        bind:value
        oninput={handleChange}
        placeholder="Enter value..."
      />
    {/if}
  </div>
</div>

<Handle type="source" position={Position.Right} />

<style>
  .node-shell {
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: #16213e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    overflow: hidden;
    min-width: 200px;
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #0f1729;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 12px;
    color: #a0a0b0;
    font-weight: 500;
  }

  .node-icon { font-size: 13px; }
  .node-label { flex: 1; }

  .node-body {
    padding: 10px;
  }

  .dd-input {
    width: 100%;
    padding: 6px 8px;
    background: #0d1117;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  .dd-input:focus {
    border-color: #00d4ff;
  }

  .checkbox-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
    color: #a0a0b0;
  }

  .slider {
    width: 100%;
    accent-color: #00d4ff;
  }

  .slider-value {
    display: block;
    text-align: center;
    font-size: 11px;
    color: #00d4ff;
    margin-top: 4px;
  }
</style>
