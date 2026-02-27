<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  interface Props {
    data: {
      label: string;
      transformType: string;
      code: string;
      input?: unknown;
      output?: unknown;
      error?: string | null;
    };
  }

  let { data }: Props = $props();
  let code = $state(data.code || '');

  function handleChange() {
    data.code = code;
  }

  function handleTypeChange(e: Event) {
    data.transformType = (e.target as HTMLSelectElement).value;
  }

  function preview(val: unknown): string {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val.length > 80 ? val.slice(0, 80) + '…' : val;
    const s = JSON.stringify(val, null, 2);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  }
</script>

<Handle type="target" position={Position.Left} />

<div class="node-shell transform-shell">
  <div class="node-header">
    <span class="node-icon">🔄</span>
    <span class="node-label">{data.label || 'Transform'}</span>
    <select
      class="type-select"
      value={data.transformType || 'map'}
      onchange={handleTypeChange}
    >
      <option value="map">map</option>
      <option value="filter">filter</option>
      <option value="reduce">reduce</option>
    </select>
  </div>

  {#if data.input !== undefined}
    <div class="io-row">
      <span class="io-label">in</span>
      <pre class="io-value">{preview(data.input)}</pre>
    </div>
  {/if}

  <div class="node-body">
    <textarea
      class="code-editor"
      bind:value={code}
      oninput={handleChange}
      placeholder="item => item"
      spellcheck="false"
      rows="3"
    ></textarea>
  </div>

  {#if data.error}
    <div class="error-row">{data.error}</div>
  {:else if data.output !== undefined}
    <div class="io-row">
      <span class="io-label">out</span>
      <pre class="io-value output-value">{preview(data.output)}</pre>
    </div>
  {/if}
</div>

<Handle type="source" position={Position.Right} />

<style>
  .node-shell {
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

  .type-select {
    font-size: 10px;
    padding: 2px 6px;
    background: rgba(123,47,255,0.2);
    color: #b388ff;
    border: 1px solid rgba(123,47,255,0.3);
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    appearance: none;
  }

  .type-select:focus {
    border-color: #7b2fff;
  }

  .node-body {
    padding: 8px;
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

  .io-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
    background: rgba(0,0,0,0.2);
  }

  .io-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #555577;
    padding-top: 2px;
    min-width: 20px;
    flex-shrink: 0;
  }

  .io-value {
    margin: 0;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    color: #7a7a9a;
    white-space: pre-wrap;
    word-break: break-all;
    flex: 1;
    overflow: hidden;
  }

  .output-value {
    color: #b388ff;
  }

  .error-row {
    padding: 4px 10px;
    border-top: 1px solid rgba(255,50,50,0.2);
    background: rgba(255,50,50,0.08);
    color: #ff6b6b;
    font-size: 10px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
