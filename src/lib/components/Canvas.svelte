<script lang="ts">
  import { untrack } from 'svelte';
  import { canvasStore, nodeDataStore, navStore, makeConnectionId } from '../stores/canvas';
  import { syncValidationNodes, validateConnection, scheduleExecution } from '../praxis/runtime';
  import TextCard from './TextCard.svelte';
  import TerminalNodeComponent from './TerminalNode.svelte';
  import InputNodeComponent from './InputNode.svelte';
  import DisplayNodeComponent from './DisplayNode.svelte';
  import TransformNodeComponent from './TransformNode.svelte';
  import SubCanvasCardComponent from './SubCanvasCard.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import { createSubCanvasNode } from '../utils/canvas-nodes';
  import type {
    CanvasNode,
    Connection,
    DisplayNode,
    ContextMenuItem,
  } from '../types/canvas';
  import { createTextNode, createTerminalNode, createInputNode, createDisplayNode, createTransformNode } from '../utils/canvas-nodes';

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
  let selectedNodeIds = $state<Set<string>>(new Set());

  // Convenience derived for single-selected-node compatibility
  const selectedNodeId = $derived(selectedNodeIds.size === 1 ? [...selectedNodeIds][0] : null);

  // --- Context menu ---
  let ctxMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const canvasData = $derived($canvasStore);

  // Graph execution layer: propagate source node outputs → connected DisplayNode content
  $effect(() => {
    const nodeData = $nodeDataStore;
    const canvas = $canvasStore;

    untrack(() => {
      // Build a node lookup map once per effect run to avoid O(E * N) scans.
      const nodeById = new Map(canvas.nodes.map((n) => [n.id, n] as const));

      for (const conn of canvas.connections) {
        const sourceValue = nodeData[`${conn.from}:${conn.fromPort}`];
        if (sourceValue === undefined) continue;
        const targetNode = nodeById.get(conn.to);
        if (!targetNode || targetNode.type !== 'display') continue;
        const currentContent = (targetNode as DisplayNode).content;
        if (currentContent === sourceValue) continue;
        canvasStore.updateNode(conn.to, { content: sourceValue } as Partial<CanvasNode>);
      }
    });
  });

  // Keep the execution-policy engine in sync with the canvas graph so that
  // topological order and cycle detection are always up-to-date.
  $effect(() => {
    const canvas = $canvasStore;
    untrack(() => {
      scheduleExecution(canvas.nodes, canvas.connections);
    });
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

    if (event.shiftKey) {
      // Shift+click: toggle this node in the selection
      const next = new Set(selectedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      selectedNodeIds = next;
    } else {
      // Normal click: select only this node and start drag
      if (!selectedNodeIds.has(nodeId)) {
        selectedNodeIds = new Set([nodeId]);
      }
    }

    isDragging = true;
    draggedNodeId = nodeId;
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
    const fromNodeId = connectFrom.nodeId;
    const fromPortId = connectFrom.portId;

    // Check for duplicate (defense-in-depth; store also deduplicates)
    const exists = canvasData.connections.some(
      c => c.from === fromNodeId && c.to === nodeId && c.fromPort === fromPortId && c.toPort === portId
    );
    if (!exists) {
      // Validate the connection through the canvas-validation Praxis module
      // before committing it to the store.
      syncValidationNodes(canvasData.nodes);
      if (validateConnection(fromNodeId, fromPortId, nodeId, portId)) {
        const id = makeConnectionId(fromNodeId, fromPortId, nodeId, portId);
        canvasStore.addConnection({ id, from: fromNodeId, to: nodeId, fromPort: fromPortId, toPort: portId });
      }
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
      const primaryNode = canvasData.nodes.find(n => n.id === draggedNodeId);
      if (primaryNode) {
        const newX = Math.max(0, (event.clientX - panX) / zoom - dragOffset.x);
        const newY = Math.max(0, (event.clientY - panY) / zoom - dragOffset.y);
        const dx = newX - primaryNode.position.x;
        const dy = newY - primaryNode.position.y;
        // Move all selected nodes by the same delta
        for (const id of selectedNodeIds) {
          const node = canvasData.nodes.find(n => n.id === id);
          if (node) {
            canvasStore.updateNodePosition(id, Math.max(0, node.position.x + dx), Math.max(0, node.position.y + dy));
          }
        }
      }
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
    selectedNodeIds = new Set();
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
      if (selectedNodeIds.size > 0) {
        event.preventDefault();
        for (const id of selectedNodeIds) {
          canvasStore.removeNode(id);
        }
        selectedNodeIds = new Set();
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
        { label: '⚡ Add Terminal', action: () => addTerminalNode(p.x, p.y) },
        { label: '📝 Add Input', action: () => addInputNode(p.x, p.y) },
        { label: '📊 Add Display', action: () => addDisplayNode(p.x, p.y) },
        { label: '🔄 Add Transform', action: () => addTransformNode(p.x, p.y) },
        { label: '⬡ Add Sub-Canvas', action: () => addSubCanvasNode(p.x, p.y) },
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
    selectedNodeIds = new Set([nodeId]);
    ctxMenu = {
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: '🗑️ Delete', danger: true, action: () => { canvasStore.removeNode(nodeId); selectedNodeIds = new Set(); } },
        { label: '📋 Duplicate', action: () => duplicateNode(nodeId) },
      ],
    };
  }

  function addTextCard(x: number, y: number) {
    canvasStore.addNode(createTextNode({ id: `text-${Date.now()}`, x, y }));
  }

  function addTerminalNode(x: number, y: number) {
    canvasStore.addNode(createTerminalNode({ id: `terminal-${Date.now()}`, x, y }));
  }

  function addInputNode(x: number, y: number) {
    canvasStore.addNode(createInputNode({ id: `input-${Date.now()}`, x, y }));
  }

  function addDisplayNode(x: number, y: number) {
    canvasStore.addNode(createDisplayNode({ id: `display-${Date.now()}`, x, y }));
  }

  function addTransformNode(x: number, y: number) {
    canvasStore.addNode(createTransformNode({ id: `transform-${Date.now()}`, x, y }));
  }

  function addSubCanvasNode(x: number, y: number) {
    canvasStore.addNode(createSubCanvasNode({ id: `sub-canvas-${Date.now()}`, x, y }));
  }

  function handleNavigateInto(nodeId: string) {
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'sub-canvas') return;
    canvasStore.navigateInto(nodeId, node.label);
    // Reset pan/zoom for the new level
    panX = 0;
    panY = 0;
    zoom = 1;
  }

  function handleNavigateUp() {
    canvasStore.navigateUp();
    panX = 0;
    panY = 0;
    zoom = 1;
  }

  function handleNavigateTo(index: number) {
    const depth = $navStore.length - index;
    for (let i = 0; i < depth; i++) {
      canvasStore.navigateUp();
    }
    panX = 0;
    panY = 0;
    zoom = 1;
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
  {#if $navStore.length > 0}
    <nav class="breadcrumb" aria-label="Canvas navigation">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <button
        class="breadcrumb-item breadcrumb-root"
        onclick={(e) => { e.stopPropagation(); handleNavigateTo(0); }}
        aria-label="Go to root canvas"
      >
        {($navStore[0]?.canvas?.name || $navStore[0]?.label || canvasData.name || 'Root')}
      </button>
      {#each $navStore as entry, i (entry.nodeId + '-' + i)}
        <span class="breadcrumb-sep" aria-hidden="true">›</span>
        {#if i < $navStore.length - 1}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <button
            class="breadcrumb-item"
            onclick={(e) => { e.stopPropagation(); handleNavigateTo(i + 1); }}
            aria-label="Go to {entry.label}"
          >
            {entry.label}
          </button>
        {:else}
          <span class="breadcrumb-item breadcrumb-current" aria-current="page">
            {entry.label}
          </span>
        {/if}
      {/each}
      <!-- Back button -->
      <button
        class="breadcrumb-back"
        onclick={(e) => { e.stopPropagation(); handleNavigateUp(); }}
        aria-label="Go up to parent canvas"
        title="Back"
      >
        ← Back
      </button>
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
            stroke="var(--brand, #00d4ff)"
            stroke-width="2"
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
          stroke="var(--brand, #00d4ff)"
          stroke-width="2"
          stroke-dasharray="6 3"
          opacity="0.6"
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
        class:selected={selectedNodeIds.has(node.id)}
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
          {:else if node.type === 'terminal'}
            <TerminalNodeComponent {node} {tui} />
          {:else if node.type === 'input'}
            <InputNodeComponent {node} {tui} />
          {:else if node.type === 'display'}
            <DisplayNodeComponent {node} {tui} />
          {:else if node.type === 'transform'}
            <TransformNodeComponent {node} {tui} />
          {:else if node.type === 'sub-canvas'}
            <SubCanvasCardComponent {node} onnavigate={handleNavigateInto} />
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
  .canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--surface-1, #1a1a2e);
    background-image: radial-gradient(circle, var(--border-color, rgba(255,255,255,0.1)) 1px, transparent 1px);
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
    top: var(--space-2, 6px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    align-items: center;
    gap: var(--space-1, 4px);
    background: var(--surface-2, #16213e);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 0.75rem;
    font-family: var(--font-sans);
    max-width: 70%;
    overflow: hidden;
    pointer-events: all;
  }

  .breadcrumb-item {
    background: transparent;
    border: none;
    color: var(--text-2, #aaa);
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .breadcrumb-item:hover {
    color: var(--text-1, #e0e0e0);
    background: var(--surface-3, rgba(255, 255, 255, 0.05));
  }

  .breadcrumb-root {
    color: var(--text-1, #e0e0e0);
  }

  .breadcrumb-current {
    color: var(--brand, #00d4ff);
    font-weight: 600;
    background: transparent;
    border: none;
    padding: 1px 4px;
    font-size: 0.75rem;
    font-family: var(--font-sans);
  }

  .breadcrumb-sep {
    color: var(--text-3, #555);
    flex-shrink: 0;
  }

  .breadcrumb-back {
    margin-left: var(--space-2, 6px);
    background: transparent;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    color: var(--text-2, #aaa);
    border-radius: 12px;
    padding: 1px 8px;
    font-size: 0.7rem;
    cursor: pointer;
    flex-shrink: 0;
    font-family: var(--font-sans);
  }

  .breadcrumb-back:hover {
    color: var(--text-1, #e0e0e0);
    border-color: var(--text-2, #aaa);
  }

  .breadcrumb-back:focus-visible,
  .breadcrumb-item:focus-visible {
    outline: 2px solid var(--brand, #00d4ff);
    outline-offset: 2px;
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
    border-radius: var(--radius-2, 8px);
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    background: var(--surface-2, #16213e);
    box-shadow: var(--shadow-2, 0 4px 8px rgba(0,0,0,0.5));
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
    overflow: hidden;
    z-index: 2;
  }

  .node-wrapper:hover {
    border-color: var(--border-color-strong, rgba(255,255,255,0.25));
    box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
  }

  .node-wrapper.selected {
    border-color: var(--brand, #00d4ff);
    box-shadow: 0 0 0 2px var(--brand, #00d4ff), var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
  }

  .node-content {
    width: 100%;
    height: 100%;
  }

  /* Ports */
  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--surface-3, #0f3460);
    border: 2px solid var(--brand, #00d4ff);
    border-radius: 50%;
    cursor: crosshair;
    z-index: 10;
    transition: transform 0.1s ease, background 0.1s ease;
  }

  .port:hover, .port-highlight {
    transform: scale(1.4);
    background: var(--brand, #00d4ff);
  }

  .input-port {
    left: -7px;
  }

  .output-port {
    right: -7px;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 10;
    background: linear-gradient(
      135deg,
      transparent 40%,
      var(--text-3, #606070) 40%,
      var(--text-3, #606070) 50%,
      transparent 50%,
      transparent 70%,
      var(--text-3, #606070) 70%,
      var(--text-3, #606070) 80%,
      transparent 80%
    );
    opacity: 0.4;
    border-radius: 0 0 8px 0;
  }

  .resize-handle:hover {
    opacity: 0.8;
  }

  .zoom-indicator {
    position: absolute;
    bottom: var(--space-3, 12px);
    right: var(--space-3, 12px);
    background: var(--surface-2, rgba(0,0,0,0.5));
    color: var(--text-2, #aaa);
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
    z-index: 100;
  }
</style>
