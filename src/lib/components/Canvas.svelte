<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import TerminalNodeComponent from './TerminalNode.svelte';
  import InputNodeComponent from './InputNode.svelte';
  import DisplayNodeComponent from './DisplayNode.svelte';
  import TransformNodeComponent from './TransformNode.svelte';
  import ConnectionLine from './ConnectionLine.svelte';
  import type { CanvasNode } from '../types/canvas';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import Box from '../design-dojo/Box.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  let isDragging = $state(false);
  let draggedNodeId = $state<string | null>(null);
  let dragOffset = $state({ x: 0, y: 0 });
  let viewportOffset = $state({ x: 0, y: 0 });
  let scale = $state(1.0);

  const canvasData = $derived($canvasStore);

  function handleNodeMouseDown(event: MouseEvent, nodeId: string) {
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    isDragging = true;
    draggedNodeId = nodeId;
    dragOffset = {
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y
    };
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging && draggedNodeId) {
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;
      canvasStore.updateNodePosition(draggedNodeId, newX, newY);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    draggedNodeId = null;
  }
</script>

<svelte:window 
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
/>

<Box class="canvas-container" {tui}>
  <svg class="connections-layer">
    {#each canvasData.connections as connection}
      <ConnectionLine {connection} nodes={canvasData.nodes} {tui} />
    {/each}
  </svg>
  
  <div class="nodes-layer">
    {#each canvasData.nodes as node (node.id)}
      <div
        class="node-wrapper"
        role="button"
        tabindex="0"
        style="left: {node.position.x}px; top: {node.position.y}px;"
        onmousedown={(e) => handleNodeMouseDown(e, node.id)}
      >
        {#if node.type === 'terminal'}
          <TerminalNodeComponent node={node} {tui} />
        {:else if node.type === 'input'}
          <InputNodeComponent node={node} {tui} />
        {:else if node.type === 'display'}
          <DisplayNodeComponent node={node} {tui} />
        {:else if node.type === 'transform'}
          <TransformNodeComponent node={node} {tui} />
        {/if}
      </div>
    {/each}
  </div>
</Box>

<style>
  :global(.canvas-container) {
    position: relative;
    width: 100%;
    height: 100vh;
    background-color: var(--surface-1);
    background-image: 
      linear-gradient(var(--border-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-color) 1px, transparent 1px);
    background-size: 20px 20px;
    overflow: hidden;
  }

  .connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .nodes-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
  }

  .node-wrapper {
    position: absolute;
    cursor: move;
  }
</style>
