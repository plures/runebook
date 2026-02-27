<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte';

  interface Props {
    id: string;
    data: {
      label: string;
      transformType: string;
      code: string;
      input?: string;
      output?: string;
    };
  }

  let { id, data }: Props = $props();
  let code = $state(data.code || '');

  const { updateNodeData } = useSvelteFlow();

  function handleChange() {
    updateNodeData(id, { code });
  }

  // Compute output whenever input or code changes
  $effect(() => {
    const input = data.input ?? '';
    if (!input) {
      data.output = '';
      return;
    }
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('item', `return (${data.code || 'item'})`);
      data.output = String(fn(input) ?? '');
    } catch {
      data.output = input;
    }
  });
</script>

<Handle type="target" position={Position.Left} />

<div class="node-shell transform-shell">
  <div class="node-header">
    <span class="node-icon">🔄</span>
    <span class="node-label">{data.label || 'Transform'}</span>
    <span class="type-badge">{data.transformType || 'map'}</span>
  </div>

  <div class="node-body">
    <textarea
      class="code-editor"
      bind:value={code}
      oninput={handleChange}
      placeholder="item => item"
      spellcheck="false"
      rows="4"
    ></textarea>
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

  .type-badge {
    font-size: 10px;
    padding: 1px 6px;
    background: rgba(123,47,255,0.2);
    color: #b388ff;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
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
</style>
