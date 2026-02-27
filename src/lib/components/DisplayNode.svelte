<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  interface Props {
    data: {
      label: string;
      displayType: string;
      content: any;
    };
  }

  let { data }: Props = $props();

  let formatted = $derived(() => {
    if (!data.content) return '';
    if (data.displayType === 'json') {
      try {
        return JSON.stringify(JSON.parse(String(data.content)), null, 2);
      } catch {
        return String(data.content);
      }
    }
    return String(data.content);
  });
</script>

<Handle type="target" position={Position.Left} />

<div class="node-shell display-shell">
  <div class="node-header">
    <span class="node-icon">📊</span>
    <span class="node-label">{data.label || 'Display'}</span>
    <span class="type-badge">{data.displayType || 'text'}</span>
  </div>

  <div class="display-body">
    {#if data.content}
      <pre class="content">{formatted}</pre>
    {:else}
      <div class="empty">Waiting for input...</div>
    {/if}
  </div>
</div>

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
    background: rgba(0,212,255,0.15);
    color: #00d4ff;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .display-body {
    padding: 10px;
    min-height: 60px;
    max-height: 300px;
    overflow-y: auto;
    background: #0d1117;
  }

  .content {
    margin: 0;
    color: #c9d1d9;
    font-size: 12px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }

  .empty {
    color: #3a3a4a;
    font-size: 12px;
    font-style: italic;
    text-align: center;
    padding: 20px 0;
  }

  .display-body::-webkit-scrollbar {
    width: 6px;
  }
  .display-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .display-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
</style>
