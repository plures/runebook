<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import TerminalNodeComponent from './TerminalNode.svelte';
  import InputNodeComponent from './InputNode.svelte';
  import DisplayNodeComponent from './DisplayNode.svelte';
  import TransformNodeComponent from './TransformNode.svelte';
  import ConnectionLine from './ConnectionLine.svelte';
  import type { CanvasNode, Connection } from '../types/canvas';
  import Box from '../design-dojo/Box.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  // Canvas viewport element (for coordinate conversion)
  let canvasEl = $state<HTMLDivElement | null>(null);

  // Viewport transform (zoom + pan)
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);

  // Pan gesture state
  let isPanning = $state(false);
  let panStartClient = $state({ x: 0, y: 0 });
  let panStartPan = $state({ x: 0, y: 0 });
  let spaceHeld = $state(false);

  // Drag state
  let isDragging = $state(false);
  let draggedNodeId = $state<string | null>(null);
  let dragOffset = $state({ x: 0, y: 0 });

  // Resize state
  let isResizing = $state(false);
  let resizingNodeId = $state<string | null>(null);
  let resizeStart = $state({ x: 0, y: 0, w: 0, h: 0 });

  // Connection drawing state
  let isConnecting = $state(false);
  let connectFrom = $state<{ nodeId: string; portId: string; x: number; y: number } | null>(null);
  let connectMousePos = $state({ x: 0, y: 0 });

  // Selection
  let selectedNodeId = $state<string | null>(null);

  // Constants
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_TO_FIT_PADDING = 48;
  const INTERACTIVE_SELECTOR = 'input, textarea, button, select, [contenteditable]';
  const INTERACTIVE_TEXT_SELECTOR = 'input, textarea, [contenteditable]';

  const canvasData = $derived($canvasStore);

  // Convert client coordinates to canvas (logical) coordinates
  function clientToCanvas(clientX: number, clientY: number) {
    if (!canvasEl) return { x: clientX, y: clientY };
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    };
  }

  // --- Node accent colors for connections and ports ---
  function getNodeAccentColor(nodeType: string): string {
    switch (nodeType) {
      case 'terminal':  return 'var(--node-accent-terminal)';
      case 'input':     return 'var(--node-accent-input)';
      case 'display':   return 'var(--node-accent-display)';
      case 'transform': return 'var(--node-accent-transform)';
      default:          return 'var(--brand)';
    }
  }

  // --- Zoom to fit ---
  function zoomToFit() {
    if (canvasData.nodes.length === 0 || !canvasEl) {
      zoom = 1; panX = 0; panY = 0;
      return;
    }
    const rect = canvasEl.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of canvasData.nodes) {
      const size = node.size || { width: 320, height: 200 };
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + size.width);
      maxY = Math.max(maxY, node.position.y + size.height);
    }
    const contentW = maxX - minX + ZOOM_TO_FIT_PADDING * 2;
    const contentH = maxY - minY + ZOOM_TO_FIT_PADDING * 2;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(rect.width / contentW, rect.height / contentH)));
    zoom = newZoom;
    panX = (rect.width - (maxX - minX) * newZoom) / 2 - minX * newZoom;
    panY = (rect.height - (maxY - minY) * newZoom) / 2 - minY * newZoom;
  }

  // --- Wheel zoom ---
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
  }

  // --- Canvas-level mousedown (pan handling) ---
  function handleCanvasMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && spaceHeld)) {
      isPanning = true;
      panStartClient = { x: event.clientX, y: event.clientY };
      panStartPan = { x: panX, y: panY };
      event.preventDefault();
    }
  }

  // --- Node drag ---
  function handleNodeMouseDown(event: MouseEvent, nodeId: string) {
    if (spaceHeld || event.button === 1) return; // Let canvas pan handle it
    if (isResizing || isConnecting) return;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    // Don't drag if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;

    isDragging = true;
    draggedNodeId = nodeId;
    selectedNodeId = nodeId;
    const canvasPoint = clientToCanvas(event.clientX, event.clientY);
    dragOffset = {
      x: canvasPoint.x - node.position.x,
      y: canvasPoint.y - node.position.y,
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
    const size = node.size || { width: 320, height: 200 };
    resizeStart = { x: event.clientX, y: event.clientY, w: size.width, h: size.height };
    event.preventDefault();
    event.stopPropagation();
  }

  // --- Connection drawing ---
  function handlePortMouseDown(event: MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') {
    if (portType !== 'output') return; // Can only start connections from output ports
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const size = node.size || { width: 320, height: 200 };
    isConnecting = true;
    connectFrom = {
      nodeId,
      portId,
      x: node.position.x + size.width,
      y: node.position.y + size.height / 2
    };
    connectMousePos = clientToCanvas(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePortMouseUp(event: MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') {
    if (!isConnecting || !connectFrom || portType !== 'input') return;
    if (connectFrom.nodeId === nodeId) return; // No self-connections

    // Check for duplicate
    const exists = canvasData.connections.some(
      c => c.from === connectFrom!.nodeId && c.to === nodeId && c.fromPort === connectFrom!.portId && c.toPort === portId
    );
    if (!exists) {
      canvasStore.addConnection({
        from: connectFrom.nodeId,
        to: nodeId,
        fromPort: connectFrom.portId,
        toPort: portId
      });
    }
    isConnecting = false;
    connectFrom = null;
  }

  // --- Global mouse handlers ---
  function handleMouseMove(event: MouseEvent) {
    if (isPanning) {
      panX = panStartPan.x + (event.clientX - panStartClient.x);
      panY = panStartPan.y + (event.clientY - panStartClient.y);
    } else if (isDragging && draggedNodeId) {
      const canvasPoint = clientToCanvas(event.clientX, event.clientY);
      const newX = canvasPoint.x - dragOffset.x;
      const newY = canvasPoint.y - dragOffset.y;
      canvasStore.updateNodePosition(draggedNodeId, Math.max(0, newX), Math.max(0, newY));
    } else if (isResizing && resizingNodeId) {
      const dx = (event.clientX - resizeStart.x) / zoom;
      const dy = (event.clientY - resizeStart.y) / zoom;
      const newW = Math.max(200, resizeStart.w + dx);
      const newH = Math.max(120, resizeStart.h + dy);
      canvasStore.updateNode(resizingNodeId, { size: { width: newW, height: newH } });
    } else if (isConnecting) {
      connectMousePos = clientToCanvas(event.clientX, event.clientY);
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
  }

  function getPortPos(node: CanvasNode, port: { id: string; type: string }, side: 'input' | 'output') {
    const size = node.size || { width: 320, height: 200 };
    const ports = side === 'input' ? node.inputs : node.outputs;
    const idx = ports.findIndex(p => p.id === port.id);
    const count = ports.length;
    const spacing = size.height / (count + 1);
    return {
      x: side === 'input' ? node.position.x : node.position.x + size.width,
      y: node.position.y + spacing * (idx + 1)
    };
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === ' ' && !(event.target as HTMLElement)?.closest(INTERACTIVE_TEXT_SELECTOR)) {
      spaceHeld = true;
      event.preventDefault();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedNodeId && !(event.target as HTMLElement)?.closest(INTERACTIVE_TEXT_SELECTOR)) {
        canvasStore.removeNode(selectedNodeId);
        selectedNodeId = null;
      }
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === ' ') spaceHeld = false;
  }

  // --- Minimap computed layout ---
  const MINIMAP_W = 160;
  const MINIMAP_H = 100;

  const minimapLayout = $derived((() => {
    if (canvasData.nodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of canvasData.nodes) {
      const size = node.size || { width: 320, height: 200 };
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + size.width);
      maxY = Math.max(maxY, node.position.y + size.height);
    }
    const pad = 20;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const scale = Math.min(MINIMAP_W / contentW, MINIMAP_H / contentH, 0.3);
    return { minX: minX - pad, minY: minY - pad, scale };
  })());

  // Display zoom as percentage
  const zoomPct = $derived(Math.round(zoom * 100));
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onkeydown={handleKeydown}
  onkeyup={handleKeyup}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="canvas-container"
  class:space-pan={spaceHeld}
  bind:this={canvasEl}
  onclick={handleCanvasClick}
  onmousedown={handleCanvasMouseDown}
  onwheel={handleWheel}
>
  <!-- Viewport: receives zoom + pan transform -->
  <div
    class="canvas-viewport"
    style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
  >
    <svg class="connections-layer">
      <!-- Existing connections -->
      {#each canvasData.connections as connection}
        {@const fromNode = canvasData.nodes.find(n => n.id === connection.from)}
        {@const toNode = canvasData.nodes.find(n => n.id === connection.to)}
        {#if fromNode && toNode}
          {@const fromPort = fromNode.outputs.find(p => p.id === connection.fromPort)}
          {@const toPort = toNode.inputs.find(p => p.id === connection.toPort)}
          {#if fromPort && toPort}
            {@const fp = getPortPos(fromNode, fromPort, 'output')}
            {@const tp = getPortPos(toNode, toPort, 'input')}
            {@const dx = Math.abs(tp.x - fp.x) * 0.5}
            {@const strokeColor = getNodeAccentColor(fromNode.type)}
            <path
              d="M {fp.x} {fp.y} C {fp.x + dx} {fp.y}, {tp.x - dx} {tp.y}, {tp.x} {tp.y}"
              fill="none"
              stroke={strokeColor}
              stroke-width="2"
              stroke-linecap="round"
              opacity="0.85"
            />
          {/if}
        {/if}
      {/each}

      <!-- In-progress connection line -->
      {#if isConnecting && connectFrom}
        {@const dx = Math.abs(connectMousePos.x - connectFrom.x) * 0.5}
        <path
          d="M {connectFrom.x} {connectFrom.y} C {connectFrom.x + dx} {connectFrom.y}, {connectMousePos.x - dx} {connectMousePos.y}, {connectMousePos.x} {connectMousePos.y}"
          fill="none"
          stroke="var(--brand)"
          stroke-width="2"
          stroke-dasharray="6 3"
          opacity="0.6"
        />
      {/if}
    </svg>

    <div class="nodes-layer">
      {#each canvasData.nodes as node (node.id)}
        {@const size = node.size || { width: 320, height: 200 }}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="node-wrapper node-wrapper--{node.type}"
          class:selected={selectedNodeId === node.id}
          style="left: {node.position.x}px; top: {node.position.y}px; width: {size.width}px; height: {size.height}px;"
          onmousedown={(e) => handleNodeMouseDown(e, node.id)}
        >
          <!-- Input ports -->
          {#each node.inputs as port}
            {@const pos = getPortPos(node, port, 'input')}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="port input-port"
              class:port-highlight={isConnecting}
              style="top: {pos.y - node.position.y - 6}px;"
              onmouseup={(e) => handlePortMouseUp(e, node.id, port.id, 'input')}
              title={port.name}
            ></div>
          {/each}

          <!-- Output ports -->
          {#each node.outputs as port}
            {@const pos = getPortPos(node, port, 'output')}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="port output-port"
              style="top: {pos.y - node.position.y - 6}px;"
              onmousedown={(e) => handlePortMouseDown(e, node.id, port.id, 'output')}
              title={port.name}
            ></div>
          {/each}

          <!-- Node content -->
          <div class="node-content">
            {#if node.type === 'terminal'}
              <TerminalNodeComponent {node} {tui} />
            {:else if node.type === 'input'}
              <InputNodeComponent {node} {tui} />
            {:else if node.type === 'display'}
              <DisplayNodeComponent {node} {tui} />
            {:else if node.type === 'transform'}
              <TransformNodeComponent {node} {tui} />
            {/if}
          </div>

          <!-- Resize handle -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="resize-handle"
            onmousedown={(e) => handleResizeMouseDown(e, node.id)}
          ></div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Empty state overlay -->
  {#if canvasData.nodes.length === 0}
    <div class="empty-state" aria-label="Empty canvas">
      <div class="empty-state-icon">🎨</div>
      <h2 class="empty-state-title">Canvas is empty</h2>
      <p class="empty-state-hint">Drag nodes from the sidebar or click a node button to get started</p>
    </div>
  {/if}

  <!-- Zoom indicator + controls -->
  <div class="canvas-controls">
    <button class="canvas-ctrl-btn" onclick={zoomToFit} title="Zoom to fit (all nodes)">⊡</button>
    <button
      class="canvas-ctrl-btn"
      onclick={() => {
        zoom = Math.min(MAX_ZOOM, zoom * 1.2);
      }}
      title="Zoom in"
    >
      +
    </button>
    <span class="zoom-label">{zoomPct}%</span>
    <button
      class="canvas-ctrl-btn"
      onclick={() => {
        zoom = Math.max(MIN_ZOOM, zoom / 1.2);
      }}
      title="Zoom out"
    >
      −
    </button>
  </div>

  <!-- Minimap -->
  {#if minimapLayout !== null}
    <div class="minimap" role="img" aria-label="Canvas minimap">
      {#each canvasData.nodes as node}
        {@const size = node.size || { width: 320, height: 200 }}
        <div
          class="minimap-node minimap-node--{node.type}"
          style="
            left: {(node.position.x - minimapLayout.minX) * minimapLayout.scale}px;
            top:  {(node.position.y - minimapLayout.minY) * minimapLayout.scale}px;
            width:  {Math.max(4, size.width  * minimapLayout.scale)}px;
            height: {Math.max(3, size.height * minimapLayout.scale)}px;
          "
        ></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .canvas-container {
    position: relative;
    width: 100%;
    height: 100vh;
    background-color: var(--surface-1, #1a1a2e);
    background-image:
      radial-gradient(circle, var(--border-color, rgba(255,255,255,0.1)) 1px, transparent 1px);
    background-size: 24px 24px;
    overflow: hidden;
    cursor: default;
  }

  .canvas-container.space-pan {
    cursor: grab;
  }

  .canvas-viewport {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
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
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    background: var(--surface-2, #16213e);
    box-shadow: var(--shadow-2, 0 4px 8px rgba(0,0,0,0.5));
    transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
    overflow: hidden;
  }

  .node-wrapper:hover {
    transform: translateY(-2px);
    border-color: var(--border-color-strong, rgba(255,255,255,0.25));
    box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
  }

  /* Per-type accent color: set --node-accent then use it for selection/ports */
  .node-wrapper--terminal  { --node-accent: var(--node-accent-terminal); }
  .node-wrapper--input     { --node-accent: var(--node-accent-input); }
  .node-wrapper--display   { --node-accent: var(--node-accent-display); }
  .node-wrapper--transform { --node-accent: var(--node-accent-transform); }

  .node-wrapper.selected {
    border-color: var(--node-accent, var(--brand, #00d4ff));
    box-shadow: 0 0 0 2px var(--node-accent, var(--brand, #00d4ff)), var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
    animation: selectPulse 2s ease-in-out infinite;
  }

  @keyframes selectPulse {
    0%, 100% { box-shadow: 0 0 0 2px var(--node-accent, var(--brand)), var(--shadow-3); }
    50%       { box-shadow: 0 0 0 4px var(--node-accent, var(--brand)), var(--shadow-3); }
  }

  .node-content {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  /* Ports */
  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--surface-3, #0f3460);
    border: 2px solid var(--node-accent, var(--brand, #00d4ff));
    border-radius: 50%;
    cursor: crosshair;
    z-index: 10;
    transition: transform 0.1s ease, background 0.1s ease;
  }

  .port:hover, .port-highlight {
    transform: scale(1.4);
    background: var(--node-accent, var(--brand, #00d4ff));
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

  /* Empty state */
  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    pointer-events: none;
    z-index: 0;
  }

  .empty-state-icon {
    font-size: 3rem;
    opacity: 0.4;
  }

  .empty-state-title {
    margin: 0;
    color: var(--text-2);
    font-size: var(--font-size-3);
    font-weight: 600;
    opacity: 0.7;
  }

  .empty-state-hint {
    margin: 0;
    color: var(--text-3);
    font-size: var(--font-size-1);
    text-align: center;
    max-width: 300px;
    line-height: 1.5;
  }

  /* Canvas controls (zoom) */
  .canvas-controls {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-round);
    padding: 4px 8px;
    z-index: 100;
    box-shadow: var(--shadow-2);
  }

  .canvas-ctrl-btn {
    background: none;
    border: none;
    color: var(--text-2);
    cursor: pointer;
    font-size: var(--font-size-2);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2);
    transition: background var(--transition-fast), color var(--transition-fast);
    line-height: 1;
  }

  .canvas-ctrl-btn:hover,
  .canvas-ctrl-btn:focus-visible {
    background: var(--surface-3);
    color: var(--text-1);
    outline: none;
  }

  .canvas-ctrl-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--brand);
  }

  .zoom-label {
    font-size: var(--font-size-0);
    color: var(--text-2);
    min-width: 38px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  /* Minimap */
  .minimap {
    position: absolute;
    bottom: 3.5rem;
    right: 1rem;
    width: 160px;
    height: 100px;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    overflow: hidden;
    z-index: 100;
    opacity: 0.85;
    box-shadow: var(--shadow-2);
  }

  .minimap-node {
    position: absolute;
    border-radius: 1px;
    opacity: 0.8;
  }

  .minimap-node--terminal  { background: var(--node-accent-terminal); }
  .minimap-node--input     { background: var(--node-accent-input); }
  .minimap-node--display   { background: var(--node-accent-display); }
  .minimap-node--transform { background: var(--node-accent-transform); }
</style>

