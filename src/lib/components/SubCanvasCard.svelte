<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import type { SubCanvasNode } from '../types/canvas';

  interface Props {
    node: SubCanvasNode;
    onnavigate: (nodeId: string) => void;
  }

  let { node, onnavigate }: Props = $props();

  const nodeCount = $derived(node.children.nodes.length);
  const linkCount = $derived(node.children.connections.length);

  function handleLabelInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    canvasStore.updateNode(node.id, { label: val });
  }

  function handleNavigate(e: MouseEvent) {
    e.stopPropagation();
    onnavigate(node.id);
  }

  function handleKeyNavigate(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onnavigate(node.id);
    }
  }
</script>

<div class="sub-canvas-card" aria-label="Sub-canvas: {node.label}">
  <!-- Header -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="card-header" onclick={(e) => e.stopPropagation()}>
    <span class="card-icon" aria-hidden="true">⬡</span>
    <input
      class="card-title"
      type="text"
      value={node.label}
      oninput={handleLabelInput}
      aria-label="Sub-canvas title"
    />
  </div>

  <!-- Mini-preview of child nodes -->
  <div class="card-preview" aria-hidden="true">
    {#each node.children.nodes.slice(0, 6) as child (child.id)}
      <div
        class="preview-node"
        class:preview-node--text={child.type === 'text'}
        class:preview-node--terminal={child.type === 'terminal'}
        class:preview-node--sub={child.type === 'sub-canvas'}
        style="left: {Math.min(child.position.x / 8, 80)}%; top: {Math.min(child.position.y / 8, 70)}%;"
        title={child.label}
      ></div>
    {/each}
  </div>

  <!-- Footer: stats + navigate button -->
  <div class="card-footer">
    <span class="card-stats">
      {nodeCount} node{nodeCount !== 1 ? 's' : ''}
      &nbsp;·&nbsp;
      {linkCount} link{linkCount !== 1 ? 's' : ''}
    </span>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <button
      class="navigate-btn"
      onclick={handleNavigate}
      onkeydown={handleKeyNavigate}
      aria-label="Open sub-canvas {node.label}"
      title="Open sub-canvas"
    >
      Open →
    </button>
  </div>
</div>

<style>
  .sub-canvas-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface-2, #16213e);
    border-radius: var(--radius-2, 8px);
    overflow: hidden;
    font-family: var(--font-sans);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 6px);
    padding: var(--space-2, 6px) var(--space-3, 10px);
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    flex-shrink: 0;
  }

  .card-icon {
    font-size: 0.9rem;
    color: var(--brand, #00d4ff);
    flex-shrink: 0;
  }

  .card-title {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1, #e0e0e0);
    font-size: var(--font-size-1, 0.875rem);
    font-weight: 600;
    width: 100%;
    cursor: text;
  }

  /* Mini-preview area */
  .card-preview {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--surface-1, #1a1a2e);
    background-image: radial-gradient(circle, var(--border-color, rgba(255, 255, 255, 0.06)) 1px, transparent 1px);
    background-size: 12px 12px;
    margin: var(--space-2, 6px);
    border-radius: var(--radius-1, 4px);
    min-height: 60px;
  }

  .preview-node {
    position: absolute;
    width: 14px;
    height: 10px;
    border-radius: 3px;
    background: var(--surface-3, #0f3460);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  }

  .preview-node--terminal {
    background: var(--success-subtle, rgba(0, 180, 100, 0.25));
    border-color: var(--success, rgba(0, 180, 100, 0.5));
  }

  .preview-node--text {
    background: var(--info-subtle, rgba(0, 140, 220, 0.2));
    border-color: var(--info, rgba(0, 140, 220, 0.4));
  }

  .preview-node--sub {
    background: var(--brand-subtle, rgba(0, 212, 255, 0.15));
    border-color: var(--brand, rgba(0, 212, 255, 0.4));
  }

  /* Footer */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1, 4px) var(--space-3, 10px);
    border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    flex-shrink: 0;
  }

  .card-stats {
    font-size: 0.7rem;
    color: var(--text-3, #666);
    font-family: var(--font-mono);
  }

  .navigate-btn {
    background: transparent;
    border: 1px solid var(--brand, #00d4ff);
    color: var(--brand, #00d4ff);
    border-radius: var(--radius-1, 4px);
    padding: 2px 8px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    font-family: var(--font-sans);
  }

  .navigate-btn:hover {
    background: var(--brand, #00d4ff);
    color: var(--surface-1, #1a1a2e);
  }

  .navigate-btn:focus-visible {
    outline: 2px solid var(--brand, #00d4ff);
    outline-offset: 2px;
  }
</style>
