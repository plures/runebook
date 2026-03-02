<script lang="ts">
  import { canvasStore, activeCanvasStore, navigationPathStore } from '../stores/canvas';
  import TextCard from './TextCard.svelte';
  import SubCanvasCard from './SubCanvasCard.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { CanvasNode, Connection, TextNode, SubCanvasNode, Canvas } from '../types/canvas';
  import type { ContextMenuItem } from './ContextMenu.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  // --- Pan/Zoom state ---
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, panX: 0, panY: 0 });
  let spaceDown = $state(false);

  // --- Drag state ---
  let isDragging = $state(false);
  let draggedNodeId = $state<string | null>(null);
  let dragOffset = $state({ x: 0, y: 0 });

  // --- Resize state ---
  let isResizing = $state(false);
  let resizingNodeId = $state<string | null>(null);
  let resizeStart = $state({ x: 0, y: 0, w: 0, h: 0 });

  // --- Connection drawing state ---
  let isConnecting = $state(false);
  let connectFrom = $state<{ nodeId: string; portId: string; x: number; y: number } | null>(null);
  let connectMousePos = $state({ x: 0, y: 0 });

  // --- Selection ---
  let selectedNodeId = $state<string | null>(null);

  // --- Context menu ---
  let ctxMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  // Active canvas (follows navigation path into sub-canvases)
  const canvasData = $derived($activeCanvasStore);
  // Root canvas (for breadcrumb label)
  const rootCanvas = $derived($canvasStore);
  // Navigation path
  const navPath = $derived($navigationPathStore);

  /** Labels for the breadcrumb: build from root canvas + each sub-canvas node in the path */
  const breadcrumbs = $derived.by(() => {
    const crumbs: { label: string; depth: number }[] = [
      { label: rootCanvas.name || 'Canvas', depth: 0 },
    ];
    let current: Canvas = rootCanvas;
    for (let i = 0; i < navPath.length; i++) {
      const node = current.nodes.find(n => n.id === navPath[i]) as SubCanvasNode | undefined;
      if (!node || node.type !== 'sub-canvas') break;
      crumbs.push({ label: node.label || 'Sub-canvas', depth: i + 1 });
      current = node.canvas;
    }
    return crumbs;
  });

  // Convert screen coords to canvas coords
  function screenToCanvas(sx: number, sy: number) {
    return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
  }

  // --- Node drag ---
  function handleNodeMouseDown(event: MouseEvent, nodeId: string) {
    if (isResizing || isConnecting || spaceDown) return;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, button, select, [contenteditable]')) return;

    isDragging = true;
    draggedNodeId = nodeId;
    selectedNodeId = nodeId;
    dragOffset = {
      x: (event.clientX - panX) / zoom - node.position.x,
      y: (event.clientY - panY) / zoom - node.position.y
    };
    event.preventDefault();
    event.stopPropagation();
  }

  // --- Resize ---
  function handleResizeMouseDown(event: MouseEvent, nodeId: string) {
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    isResizing = true;
    resizingNodeId = nodeId;
    const size = node.size || { width: 280, height: 200 };
    resizeStart = { x: event.clientX, y: event.clientY, w: size.width, h: size.height };
    event.preventDefault();
    event.stopPropagation();
  }

  // --- Connection drawing ---
  function handlePortMouseDown(event: MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') {
    if (portType !== 'output') return;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const size = node.size || { width: 280, height: 200 };
    isConnecting = true;
    connectFrom = {
      nodeId,
      portId,
      x: node.position.x + size.width,
      y: node.position.y + size.height / 2
    };
    const p = screenToCanvas(event.clientX, event.clientY);
    connectMousePos = { x: p.x, y: p.y };
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePortMouseUp(event: MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') {
    if (!isConnecting || !connectFrom || portType !== 'input') return;
    if (connectFrom.nodeId === nodeId) return;
    const exists = canvasData.connections.some(
      c => c.from === connectFrom!.nodeId && c.to === nodeId && c.fromPort === connectFrom!.portId && c.toPort === portId
    );
    if (!exists) {
      canvasStore.addConnection({ from: connectFrom.nodeId, to: nodeId, fromPort: connectFrom.portId, toPort: portId });
    }
    isConnecting = false;
    connectFrom = null;
  }

  // --- Pan via middle-click or space+drag ---
  function handleCanvasMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && spaceDown)) {
      isPanning = true;
      panStart = { x: event.clientX, y: event.clientY, panX, panY };
      event.preventDefault();
    }
  }

  // --- Global mouse handlers ---
  function handleMouseMove(event: MouseEvent) {
    if (isPanning) {
      panX = panStart.panX + (event.clientX - panStart.x);
      panY = panStart.panY + (event.clientY - panStart.y);
    } else if (isDragging && draggedNodeId) {
      const newX = Math.max(0, (event.clientX - panX) / zoom - dragOffset.x);
      const newY = Math.max(0, (event.clientY - panY) / zoom - dragOffset.y);
      canvasStore.updateNodePosition(draggedNodeId, newX, newY);
    } else if (isResizing && resizingNodeId) {
      const dx = (event.clientX - resizeStart.x) / zoom;
      const dy = (event.clientY - resizeStart.y) / zoom;
      canvasStore.updateNode(resizingNodeId, { size: { width: Math.max(180, resizeStart.w + dx), height: Math.max(100, resizeStart.h + dy) } });
    } else if (isConnecting) {
      const p = screenToCanvas(event.clientX, event.clientY);
      connectMousePos = { x: p.x, y: p.y };
    }
  }

  function handleMouseUp() {
    isDragging = false;
    draggedNodeId = null;
    isResizing = false;
    resizingNodeId = null;
    isPanning = false;
    isConnecting = false;
    connectFrom = null;
  }

  function handleCanvasClick() {
    selectedNodeId = null;
    ctxMenu = null;
  }

  // --- Zoom via Ctrl+scroll ---
  function handleWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(4, Math.max(0.1, zoom * delta));
    // Zoom toward cursor
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ox = event.clientX - rect.left;
    const oy = event.clientY - rect.top;
    panX = ox - (ox - panX) * (newZoom / zoom);
    panY = oy - (oy - panY) * (newZoom / zoom);
    zoom = newZoom;
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const inEditable = target.closest('input, textarea, [contenteditable]');

    if ((event.key === 'Delete' || event.key === 'Backspace') && !inEditable) {
      if (selectedNodeId) {
        event.preventDefault();
        canvasStore.removeNode(selectedNodeId);
        selectedNodeId = null;
      }
    }
    if (event.key === ' ' && !inEditable) {
      event.preventDefault();
      spaceDown = true;
    }
    if (event.key === 'Escape') {
      ctxMenu = null;
      isConnecting = false;
      connectFrom = null;
      if (navPath.length > 0) canvasStore.navigateOut();
    }
    // Zoom shortcuts
    if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      zoom = Math.min(4, zoom * 1.1);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
      event.preventDefault();
      zoom = Math.max(0.1, zoom * 0.9);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '0') {
      event.preventDefault();
      zoom = 1;
      panX = 0;
      panY = 0;
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === ' ') spaceDown = false;
  }

  // --- Context menus ---
  function handleCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const p = screenToCanvas(event.clientX - rect.left, event.clientY - rect.top);
    ctxMenu = {
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: '📝 Add Text Card', action: () => addTextCard(p.x, p.y) },
        { label: '🗂 Add Sub-Canvas', action: () => addSubCanvas(p.x, p.y) },
      ],
    };
  }

  function handleConnectionContextMenu(event: MouseEvent, conn: Connection) {
    event.preventDefault();
    event.stopPropagation();
    ctxMenu = {
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: '🗑️ Delete connection', danger: true, action: () => canvasStore.removeConnection(conn.from, conn.to, conn.fromPort, conn.toPort) },
      ],
    };
  }

  function handleNodeContextMenu(event: MouseEvent, nodeId: string) {
    event.preventDefault();
    event.stopPropagation();
    selectedNodeId = nodeId;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    const items: ContextMenuItem[] = [
      { label: '🗑️ Delete', danger: true, action: () => { canvasStore.removeNode(nodeId); selectedNodeId = null; } },
      { label: '📋 Duplicate', action: () => duplicateNode(nodeId) },
    ];
    if (node?.type === 'sub-canvas') {
      items.unshift({ label: '↗ Enter Sub-Canvas', action: () => canvasStore.navigateInto(nodeId) });
    }
    ctxMenu = { x: event.clientX, y: event.clientY, items };
  }

  function addTextCard(x: number, y: number) {
    const id = `text-${Date.now()}`;
    canvasStore.addNode({
      id,
      type: 'text',
      position: { x, y },
      size: { width: 280, height: 200 },
      label: 'Note',
      content: '',
      inputs: [{ id: 'in', name: 'in', type: 'input' }],
      outputs: [{ id: 'out', name: 'out', type: 'output' }],
    } satisfies TextNode);
  }

  function addSubCanvas(x: number, y: number) {
    const id = `sub-canvas-${Date.now()}`;
    canvasStore.addNode({
      id,
      type: 'sub-canvas',
      position: { x, y },
      size: { width: 280, height: 200 },
      label: 'Sub-canvas',
      inputs: [],
      outputs: [],
      canvas: {
        id,
        name: 'Sub-canvas',
        description: '',
        nodes: [],
        connections: [],
        version: '1.0.0',
      },
    } satisfies SubCanvasNode);
  }

  function duplicateNode(nodeId: string) {
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const clone = structuredClone(node) as CanvasNode;
    clone.id = `${node.type}-${Date.now()}`;
    clone.position = { x: node.position.x + 30, y: node.position.y + 30 };
    canvasStore.addNode(clone);
  }

  function getPortPos(node: CanvasNode, portIdx: number, portCount: number, side: 'input' | 'output') {
    const size = node.size || { width: 280, height: 200 };
    const spacing = size.height / (portCount + 1);
    return {
      x: side === 'input' ? node.position.x : node.position.x + size.width,
      y: node.position.y + spacing * (portIdx + 1),
    };
  }

  // Reset pan/zoom when navigating
  $effect(() => {
    const depth = navPath.length; // reactive dependency
    if (depth >= 0) { // always true — establishes dependency cleanly
      panX = 0;
      panY = 0;
      zoom = 1;
      selectedNodeId = null;
    }
  });
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onkeydown={handleKeydown}
  onkeyup={handleKeyup}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="canvas-container"
  class:panning={spaceDown || isPanning}
  onclick={handleCanvasClick}
  oncontextmenu={handleCanvasContextMenu}
  onmousedown={handleCanvasMouseDown}
  onwheel={handleWheel}
  role="application"
  aria-label="Canvas board"
>
  <!-- Breadcrumb navigation (shown when inside a sub-canvas) -->
  {#if navPath.length > 0}
    <nav class="breadcrumb" aria-label="Canvas navigation">
      {#each breadcrumbs as crumb, i (i)}
        {#if i < breadcrumbs.length - 1}
          <button
            class="breadcrumb-item breadcrumb-link"
            onclick={(e) => { e.stopPropagation(); if (i === 0) canvasStore.navigateToRoot(); else canvasStore.navigateOut(); }}
            aria-label="Navigate to {crumb.label}"
          >{crumb.label}</button>
          <span class="breadcrumb-sep" aria-hidden="true">›</span>
        {:else}
          <span class="breadcrumb-item breadcrumb-current" aria-current="page">{crumb.label}</span>
        {/if}
      {/each}
      <button
        class="breadcrumb-back"
        onclick={(e) => { e.stopPropagation(); canvasStore.navigateOut(); }}
        title="Go back (Esc)"
        aria-label="Go back to parent canvas"
      >← Back</button>
    </nav>
  {/if}

  <!-- Infinite pan/zoom viewport -->
  <div
    class="viewport"
    style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
  >
    <!-- SVG connection layer -->
    <svg class="connections-layer" aria-hidden="true">
      {#each canvasData.connections as connection (connection.from + connection.fromPort + connection.to + connection.toPort)}
        {@const fromNode = canvasData.nodes.find(n => n.id === connection.from)}
        {@const toNode = canvasData.nodes.find(n => n.id === connection.to)}
        {#if fromNode && toNode}
          {@const fp = getPortPos(fromNode, 0, fromNode.outputs.length, 'output')}
          {@const tp = getPortPos(toNode, 0, toNode.inputs.length, 'input')}
          {@const dx = Math.abs(tp.x - fp.x) * 0.5}
          <path
            d="M {fp.x} {fp.y} C {fp.x + dx} {fp.y}, {tp.x - dx} {tp.y}, {tp.x} {tp.y}"
            fill="none"
            stroke="var(--canvas-accent, rgba(255,255,255,0.3))"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <!-- Wide transparent hit area for context menu -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <path
            d="M {fp.x} {fp.y} C {fp.x + dx} {fp.y}, {tp.x - dx} {tp.y}, {tp.x} {tp.y}"
            fill="none"
            stroke="transparent"
            stroke-width="12"
            style="pointer-events: stroke; cursor: context-menu"
            oncontextmenu={(e) => handleConnectionContextMenu(e, connection)}
          />
        {/if}
      {/each}

      <!-- In-progress connection line -->
      {#if isConnecting && connectFrom}
        {@const dx = Math.abs(connectMousePos.x - connectFrom.x) * 0.5}
        <path
          d="M {connectFrom.x} {connectFrom.y} C {connectFrom.x + dx} {connectFrom.y}, {connectMousePos.x - dx} {connectMousePos.y}, {connectMousePos.x} {connectMousePos.y}"
          fill="none"
          stroke="var(--canvas-accent, rgba(255,255,255,0.4))"
          stroke-width="1.5"
          stroke-dasharray="5 3"
          opacity="0.5"
        />
      {/if}
    </svg>

    <!-- Nodes layer -->
    {#each canvasData.nodes as node (node.id)}
      {@const size = node.size || { width: 280, height: 200 }}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="node-wrapper"
        class:selected={selectedNodeId === node.id}
        class:node-sub-canvas={node.type === 'sub-canvas'}
        style="left: {node.position.x}px; top: {node.position.y}px; width: {size.width}px; height: {size.height}px;"
        onmousedown={(e) => handleNodeMouseDown(e, node.id)}
        oncontextmenu={(e) => handleNodeContextMenu(e, node.id)}
        role="article"
        aria-label={node.label}
      >
        <!-- Input ports -->
        {#each node.inputs as port, i}
          {@const pos = getPortPos(node, i, node.inputs.length, 'input')}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="port input-port"
            class:port-highlight={isConnecting}
            style="top: {pos.y - node.position.y - 6}px;"
            onmouseup={(e) => handlePortMouseUp(e, node.id, port.id, 'input')}
            title={port.name}
            role="button"
            aria-label="Input port {port.name}"
            tabindex="-1"
          ></div>
        {/each}

        <!-- Output ports -->
        {#each node.outputs as port, i}
          {@const pos = getPortPos(node, i, node.outputs.length, 'output')}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="port output-port"
            style="top: {pos.y - node.position.y - 6}px;"
            onmousedown={(e) => handlePortMouseDown(e, node.id, port.id, 'output')}
            title={port.name}
            role="button"
            aria-label="Output port {port.name}"
            tabindex="-1"
          ></div>
        {/each}

        <!-- Node content -->
        <div class="node-content">
          {#if node.type === 'text'}
            <TextCard {node} />
          {:else if node.type === 'sub-canvas'}
            <SubCanvasCard {node} onnavigate={(id) => canvasStore.navigateInto(id)} />
          {/if}
        </div>

        <!-- Resize handle -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="resize-handle"
          onmousedown={(e) => handleResizeMouseDown(e, node.id)}
          role="button"
          aria-label="Resize"
          tabindex="-1"
        ></div>
      </div>
    {/each}
  </div>

  <!-- Zoom indicator -->
  <div class="zoom-indicator" aria-live="polite" aria-label="Zoom level">
    {Math.round(zoom * 100)}%
  </div>
</div>

{#if ctxMenu}
  <ContextMenu
    x={ctxMenu.x}
    y={ctxMenu.y}
    items={ctxMenu.items}
    onclose={() => { ctxMenu = null; }}
  />
{/if}

<style>
  /* Obsidian-like canvas CSS variables */
  .canvas-container {
    --canvas-bg: var(--surface-1, #1e1e2e);
    --canvas-dot: rgba(255,255,255,0.06);
    --canvas-node-bg: var(--surface-2, #252535);
    --canvas-border: rgba(255,255,255,0.08);
    --canvas-border-strong: rgba(255,255,255,0.18);
    --canvas-accent: rgba(255,255,255,0.3);
    --canvas-select: rgba(180,160,255,0.8);
    --canvas-port: rgba(180,160,255,0.7);
  }

  .canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--canvas-bg);
    background-image: radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px);
    background-size: 24px 24px;
    overflow: hidden;
    cursor: default;
  }

  .canvas-container.panning {
    cursor: grab;
  }

  /* Breadcrumb navigation */
  .breadcrumb {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px var(--space-3, 1rem);
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--canvas-border);
    font-size: var(--font-size-0, 0.75rem);
    font-family: var(--font-mono);
  }

  .breadcrumb-item {
    color: var(--text-2, #a0a0b0);
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .breadcrumb-link {
    background: none;
    border: none;
    padding: 0 2px;
    cursor: pointer;
    color: var(--text-2, #a0a0b0);
    font-family: var(--font-mono);
    font-size: var(--font-size-0, 0.75rem);
    transition: color var(--transition-fast);
  }

  .breadcrumb-link:hover {
    color: var(--text-1, #e0e0e0);
  }

  .breadcrumb-current {
    color: var(--text-1, #e0e0e0);
  }

  .breadcrumb-sep {
    color: var(--text-3, #606070);
  }

  .breadcrumb-back {
    margin-left: auto;
    background: none;
    border: 1px solid var(--canvas-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-2, 4px);
    color: var(--text-2);
    font-size: var(--font-size-0, 0.75rem);
    padding: 2px 8px;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .breadcrumb-back:hover {
    background: var(--surface-3, #3a3a4a);
    color: var(--text-1);
  }

  .viewport {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 1;
  }

  .node-wrapper {
    position: absolute;
    cursor: move;
    border-radius: var(--radius-2, 4px);
    border: 1px solid var(--canvas-border, rgba(255,255,255,0.08));
    background: var(--canvas-node-bg, #252535);
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
    overflow: hidden;
    z-index: 2;
  }

  .node-wrapper:hover {
    border-color: var(--canvas-border-strong, rgba(255,255,255,0.18));
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  }

  .node-wrapper.selected {
    border-color: var(--canvas-select, rgba(180,160,255,0.8));
    box-shadow: 0 0 0 1px var(--canvas-select, rgba(180,160,255,0.8)), 0 4px 14px rgba(0,0,0,0.5);
  }

  /* Sub-canvas nodes get a subtle left border accent */
  .node-sub-canvas {
    border-left: 2px solid rgba(180,160,255,0.35);
  }

  .node-content {
    width: 100%;
    height: 100%;
  }

  /* Ports */
  .port {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--canvas-node-bg, #252535);
    border: 1.5px solid var(--canvas-port, rgba(180,160,255,0.5));
    border-radius: 50%;
    cursor: crosshair;
    z-index: 10;
    transition: transform 0.1s ease, background 0.1s ease;
  }

  .port:hover, .port-highlight {
    transform: scale(1.4);
    background: var(--canvas-port, rgba(180,160,255,0.5));
  }

  .input-port {
    left: -6px;
  }

  .output-port {
    right: -6px;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    z-index: 10;
    background: linear-gradient(
      135deg,
      transparent 40%,
      var(--text-3, rgba(255,255,255,0.2)) 40%,
      var(--text-3, rgba(255,255,255,0.2)) 50%,
      transparent 50%,
      transparent 70%,
      var(--text-3, rgba(255,255,255,0.2)) 70%,
      var(--text-3, rgba(255,255,255,0.2)) 80%,
      transparent 80%
    );
    opacity: 0.35;
    border-radius: 0 0 4px 0;
  }

  .resize-handle:hover {
    opacity: 0.7;
  }

  .zoom-indicator {
    position: absolute;
    bottom: var(--space-3, 12px);
    right: var(--space-3, 12px);
    background: rgba(0,0,0,0.4);
    color: var(--text-3, rgba(255,255,255,0.35));
    font-size: 10px;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 100;
    letter-spacing: 0.05em;
  }
</style>
