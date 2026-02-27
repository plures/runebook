<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte';

  interface Props {
    id: string;
    data: {
      label: string;
      transformType: string;
      code: string;
      input?: any;
      output?: any;
      error?: string;
    };
  }

  let { id, data }: Props = $props();
  let code = $state(data.code || 'item');

  const { updateNodeData } = useSvelteFlow();

  function handleCodeChange() {
    updateNodeData(id, { code });
  }

  // Re-run the transform pipeline whenever input data, transform type, or user code changes.
  // new Function() is intentional here: this is a local-first desktop app (Tauri) where users
  // author their own transform expressions — equivalent to a notebook code cell.
  $effect(() => {
    const input = data.input;
    const type = data.transformType || 'map';
    const currentCode = code;

    if (input === undefined || input === null) {
      updateNodeData(id, { output: undefined, error: '' });
      return;
    }

    try {
      const arr = Array.isArray(input) ? input : [input];
      let result: unknown;
      if (type === 'map') {
        // eslint-disable-next-line no-new-func
        const fn = new Function('item', 'index', `"use strict"; return (${currentCode})`);
        result = arr.map((item: unknown, index: number) => fn(item, index));
      } else if (type === 'filter') {
        // eslint-disable-next-line no-new-func
        const fn = new Function('item', 'index', `"use strict"; return (${currentCode})`);
        result = arr.filter((item: unknown, index: number) => Boolean(fn(item, index)));
      } else if (type === 'reduce') {
        // eslint-disable-next-line no-new-func
        const fn = new Function('acc', 'item', 'index', `"use strict"; return (${currentCode})`);
        result = arr.reduce(
          (acc: unknown, item: unknown, index: number) => fn(acc, item, index),
          null
        );
      } else {
        // 'sudolang' and any future types pass through unchanged until implemented.
        result = input;
      }
      updateNodeData(id, { output: result, error: '' });
    } catch (e: unknown) {
      updateNodeData(id, { output: undefined, error: e instanceof Error ? e.message : 'Transform error' });
    }
  });
</script>

<Handle type="target" position={Position.Left} />

<div class="node-shell transform-shell transform-node">
  <div class="node-header">
    <span class="node-icon">🔄</span>
    <span class="node-label">{data.label || 'Transform'}</span>
    <select
      class="type-select"
      bind:value={data.transformType}
    >
      <option value="map">map</option>
      <option value="filter">filter</option>
      <option value="reduce">reduce</option>
      <option value="sudolang">sudolang</option>
    </select>
  </div>

  <div class="node-body">
    <textarea
      class="code-editor"
      bind:value={code}
      oninput={handleCodeChange}
      placeholder="item => item"
      spellcheck="false"
      rows="4"
    ></textarea>
    {#if data.error}
      <div class="error-msg">{data.error}</div>
    {/if}
    {#if data.output !== undefined && !data.error}
      {@const preview = JSON.stringify(data.output)}
      <div class="output-preview">
        → {preview.slice(0, 80)}{preview.length > 80 ? '…' : ''}
      </div>
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
    padding: 1px 4px;
    background: rgba(123,47,255,0.2);
    color: #b388ff;
    border: 1px solid rgba(123,47,255,0.3);
    border-radius: 3px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    font-family: inherit;
    text-transform: uppercase;
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

  .error-msg {
    margin-top: 4px;
    padding: 4px 6px;
    background: rgba(255,60,60,0.15);
    border: 1px solid rgba(255,60,60,0.3);
    border-radius: 3px;
    color: #ff6b6b;
    font-size: 11px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  .output-preview {
    margin-top: 4px;
    padding: 4px 6px;
    background: rgba(123,47,255,0.1);
    border-radius: 3px;
    color: #b388ff;
    font-size: 11px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
