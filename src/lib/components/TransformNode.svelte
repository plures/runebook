<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte';

  interface Props {
    id: string;
    data: {
      label: string;
      transformType: string;
      code: string;
    };
  }

  let { id, data }: Props = $props();
  let code = $state(data.code || '');
  let transformType = $state(data.transformType || 'map');

  const { updateNodeData } = useSvelteFlow();

  function handleCodeChange() {
    updateNodeData(id, { code });
  }

  function handleTypeChange() {
    updateNodeData(id, { transformType });
  }
</script>

<Handle type="target" position={Position.Left} />

<div class="node-wrapper node-shell transform-node">
  <div class="node-header">
    <span class="node-icon">🔄</span>
    <span class="node-label">{data.label || 'Transform'}</span>
  </div>

  <div class="node-body">
    <select
      class="type-select"
      bind:value={transformType}
      onchange={handleTypeChange}
    >
      <option value="map">map</option>
      <option value="filter">filter</option>
      <option value="reduce">reduce</option>
      <option value="sort">sort</option>
    </select>
    <textarea
      class="code-editor"
      bind:value={code}
      oninput={handleCodeChange}
      placeholder="item => item"
      spellcheck="false"
      rows="4"
    ></textarea>
  </div>
</div>

<Handle type="source" position={Position.Right} />

<style>
  .node-wrapper.node-shell {
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: #16213e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    overflow: hidden;
    min-width: 240px;
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
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .type-select {
    width: 100%;
    padding: 4px 6px;
    background: #0d1117;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  .type-select:focus {
    border-color: #7b2fff;
  }

  .code-editor {
    width: 100%;
    padding: 8px;
    background: #0d1117;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  .code-editor:focus {
    border-color: #7b2fff;
  }
</style>
