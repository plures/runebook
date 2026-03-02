<script lang="ts">
  import type { SubCanvasNode } from '../types/canvas';

  interface Props {
    node: SubCanvasNode;
    onnavigate: (nodeId: string) => void;
  }

  let { node, onnavigate }: Props = $props();

  const nodeCount = $derived(node.canvas.nodes.length);
  const connCount = $derived(node.canvas.connections.length);

  function handleEnter(e: MouseEvent) {
    e.stopPropagation();
    onnavigate(node.id);
  }

  function handleKeyEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      onnavigate(node.id);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="sub-canvas-card">
  <div class="sub-canvas-header" onclick={(e) => e.stopPropagation()}>
    <span class="sub-canvas-icon" aria-hidden="true">🗂</span>
    <input
      class="sub-canvas-title"
      type="text"
      value={node.label}
      aria-label="Sub-canvas name"
      readonly
    />
    <button
      class="enter-btn"
      onclick={handleEnter}
      onkeydown={handleKeyEnter}
      title="Enter sub-canvas"
      aria-label="Enter sub-canvas {node.label}"
    >
      ↗
    </button>
  </div>

  <div class="sub-canvas-preview" aria-hidden="true">
    {#each node.canvas.nodes.slice(0, 5) as n (n.id)}
      <div
        class="preview-node"
        style="left: {Math.min(n.position.x * 0.15, 85)}%; top: {Math.min(n.position.y * 0.15, 70)}%;"
      ></div>
    {/each}
    {#if node.canvas.connections.length > 0}
      {#each node.canvas.connections.slice(0, 4) as conn (conn.from + conn.to)}
        {@const fromNode = node.canvas.nodes.find(n => n.id === conn.from)}
        {@const toNode = node.canvas.nodes.find(n => n.id === conn.to)}
        {#if fromNode && toNode}
          <svg class="preview-conn" aria-hidden="true">
            <line
              x1="{Math.min(fromNode.position.x * 0.15 + 4, 89)}%"
              y1="{Math.min(fromNode.position.y * 0.15 + 4, 74)}%"
              x2="{Math.min(toNode.position.x * 0.15 + 4, 89)}%"
              y2="{Math.min(toNode.position.y * 0.15 + 4, 74)}%"
            />
          </svg>
        {/if}
      {/each}
    {/if}
  </div>

  <div class="sub-canvas-footer">
    <span class="sub-canvas-meta">
      {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
      {#if connCount > 0}
        · {connCount} {connCount === 1 ? 'link' : 'links'}
      {/if}
    </span>
    <button
      class="enter-btn-sm"
      onclick={handleEnter}
      onkeydown={handleKeyEnter}
      title="Open sub-canvas"
      aria-label="Open sub-canvas"
    >
      Open ↗
    </button>
  </div>
</div>

<style>
  .sub-canvas-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface-1, #202020);
    border-radius: var(--radius-2, 4px);
    overflow: hidden;
  }

  .sub-canvas-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
    flex-shrink: 0;
  }

  .sub-canvas-icon {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .sub-canvas-title {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-size: var(--font-size-1, 0.875rem);
    font-weight: 600;
    cursor: default;
    min-width: 0;
  }

  .enter-btn {
    background: transparent;
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    border-radius: var(--radius-2, 4px);
    color: var(--text-2);
    font-size: 0.8rem;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    flex-shrink: 0;
  }

  .enter-btn:hover {
    background: var(--surface-3, #3a3a4a);
    color: var(--text-1);
  }

  /* Mini canvas preview */
  .sub-canvas-preview {
    flex: 1;
    position: relative;
    background: var(--surface-1, #1a1a1a);
    overflow: hidden;
    min-height: 0;
  }

  .preview-node {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--text-3, rgba(255,255,255,0.25));
    border-radius: 2px;
    transform: translate(-50%, -50%);
  }

  .preview-conn {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .preview-conn line {
    stroke: var(--text-3, rgba(255,255,255,0.15));
    stroke-width: 1;
  }

  .sub-canvas-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-3);
    border-top: 1px solid var(--border-color, rgba(255,255,255,0.06));
    flex-shrink: 0;
  }

  .sub-canvas-meta {
    font-size: var(--font-size-0, 0.75rem);
    color: var(--text-3);
    font-family: var(--font-mono);
  }

  .enter-btn-sm {
    background: transparent;
    border: none;
    color: var(--text-2);
    font-size: var(--font-size-0, 0.75rem);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: var(--radius-2, 4px);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .enter-btn-sm:hover {
    background: var(--surface-3, #3a3a4a);
    color: var(--text-1);
  }
</style>
