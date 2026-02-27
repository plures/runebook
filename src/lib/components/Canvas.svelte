<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import TerminalNodeComponent from './TerminalNode.svelte';
  import InputNodeComponent from './InputNode.svelte';
  import DisplayNodeComponent from './DisplayNode.svelte';
  import TransformNodeComponent from './TransformNode.svelte';
  import ConnectionLine from './ConnectionLine.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { CanvasNode, Connection } from '../types/canvas';
  import type { ContextMenuItem } from './ContextMenu.svelte';
  import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';
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

  // Context menu state
  let ctxMenu = $state<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // Constants
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_TO_FIT_PADDING = 48;
  const INTERACTIVE_SELECTOR = 'input, textarea, button, select, [contenteditable]';

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

  // --- Node accent colors for connections ---
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
    const paddedMinX = minX - ZOOM_TO_FIT_PADDING;
    const paddedMinY = minY - ZOOM_TO_FIT_PADDING;
    panX = (rect.width - contentW * newZoom) / 2 - paddedMinX * newZoom;
    panY = (rect.height - contentH * newZoom) / 2 - paddedMinY * newZoom;
  }

  // --- Wheel zoom (registered as non-passive via $effect so preventDefault works) ---
  function handleWheel(event: WheelEvent) {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
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

  // Register wheel listener as non-passive so preventDefault() actually works
  $effect(() => {
    if (!canvasEl) return;
    const el = canvasEl;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  });

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
    if (spaceHeld || event.button === 1) return;
    if (isResizing || isConnecting) return;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
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
    if (portType !== 'output') return;
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
    if (connectFrom.nodeId === nodeId) return;

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
      const dx = event.clientX - resizeStart.x;
      const dy = event.clientY - resizeStart.y;
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
    isConnecting = false;
    connectFrom = null;
    isPanning = false;
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
    if (event.key === ' ') {
      if (!event.repeat) spaceHeld = true;
      const target = event.target as HTMLElement;
      if (!target.closest(INTERACTIVE_SELECTOR)) {
        event.preventDefault();
      }
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedNodeId && !(event.target as HTMLElement)?.closest(INTERACTIVE_SELECTOR)) {
        event.preventDefault();
        canvasStore.removeNode(selectedNodeId);
        selectedNodeId = null;
      }
    }
    if (event.key === 'Escape') {
      ctxMenu = null;
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === ' ') {
      spaceHeld = false;
    }
  }

  function handleConnectionContextMenu(event: MouseEvent, conn: Connection) {
    event.preventDefault();
    event.stopPropagation();
    ctxMenu = {
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: '🗑️ Delete connection',
          danger: true,
          action: () => canvasStore.removeConnection(conn.from, conn.to, conn.fromPort, conn.toPort),
        },
      ],
    };
  }

  function handleCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    const canvasPoint = clientToCanvas(event.clientX, event.clientY);
    const cx = canvasPoint.x;
    const cy = canvasPoint.y;

    ctxMenu = {
      x,
      y,
      items: [
        { label: '⚡ Add Terminal Node',   action: () => addNodeAt('terminal',  cx, cy) },
        { label: '📝 Add Input Node',     action: () => addNodeAt('input',     cx, cy) },
        { label: '📊 Add Display Node',   action: () => addNodeAt('display',   cx, cy) },
        { label: '🔄 Add Transform Node', action: () => addNodeAt('transform', cx, cy) },
      ],
    };
  }

  function handleNodeContextMenu(event: MouseEvent, nodeId: string) {
    event.preventDefault();
    event.stopPropagation();
    selectedNodeId = nodeId;
    ctxMenu = {
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: '🗑️ Delete',
          danger: true,
          action: () => { canvasStore.removeNode(nodeId); selectedNodeId = null; },
        },
        {
          label: '📋 Duplicate',
          action: () => duplicateNode(nodeId),
        },
        { separator: true, label: '', action: () => {} },
        {
          label: '✂️ Disconnect all',
          action: () => disconnectAll(nodeId),
        },
      ],
    };
  }

  function addNodeAt(type: 'terminal' | 'input' | 'display' | 'transform', x: number, y: number) {
    const id = `${type}-${Date.now()}`;
    if (type === 'terminal') {
      canvasStore.addNode({
        id, type, position: { x, y },
        label: 'Terminal', command: 'echo', args: ['Hello, RuneBook!'], autoStart: false,
        inputs: [], outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }],
      } satisfies TerminalNode);
    } else if (type === 'input') {
      canvasStore.addNode({
        id, type, position: { x, y },
        label: 'Text Input', inputType: 'text', value: '',
        inputs: [], outputs: [{ id: 'value', name: 'value', type: 'output' }],
      } satisfies InputNode);
    } else if (type === 'display') {
      canvasStore.addNode({
        id, type, position: { x, y },
        label: 'Display', displayType: 'text', content: '',
        inputs: [{ id: 'input', name: 'input', type: 'input' }], outputs: [],
      } satisfies DisplayNode);
    } else if (type === 'transform') {
      canvasStore.addNode({
        id, type, position: { x, y },
        label: 'Transform', transformType: 'map', code: 'item',
        inputs: [{ id: 'input', name: 'input', type: 'input' }],
        outputs: [{ id: 'output', name: 'output', type: 'output' }],
      } satisfies TransformNode);
    }
  }

  function duplicateNode(nodeId: string) {
    const node = canvasData.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newId = `${node.type}-${Date.now()}`;

    const clonedNode = structuredClone(node) as CanvasNode;
    clonedNode.id = newId;
    clonedNode.position = {
      x: node.position.x + 30,
      y: node.position.y + 30,
    };

    canvasStore.addNode(clonedNode);
  }

  function disconnectAll(nodeId: string) {
    const conns = canvasData.connections.filter(c => c.from === nodeId || c.to === nodeId);
    for (const c of conns) {
      canvasStore.removeConnection(c.from, c.to, c.fromPort, c.toPort);
    }
  }

  // --- Minimap calculations ---
  const MINIMAP_W = 160;
  const MINIMAP_H = 100;

  type MinimapMetrics = {
    hasNodes: boolean;
    minX: number;
    minY: number;
    scale: number;
    offsetX: number;
    offsetY: number;
  };

  let minimapMetrics: MinimapMetrics = {
    hasNodes: false,
    minX: 0,
    minY: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  $: {
    if (canvasData.nodes.length === 0) {
      minimapMetrics = {
        hasNodes: false,
        minX: 0,
        minY: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    } else {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const n of canvasData.nodes) {
        const s = n.size || { width: 320, height: 200 };
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + s.width);
        maxY = Math.max(maxY, n.position.y + s.height);
      }

      const rangeX = Math.max(maxX - minX, 1);
      const rangeY = Math.max(maxY - minY, 1);
      const scaleX = MINIMAP_W / rangeX;
      const scaleY = MINIMAP_H / rangeY;
      const scale = Math.min(scaleX, scaleY) * 0.9;
      const offsetX = (MINIMAP_W - rangeX * scale) / 2;
      const offsetY = (MINIMAP_H - rangeY * scale) / 2;

      minimapMetrics = {
        hasNodes: true,
        minX,
        minY,
        scale,
        offsetX,
        offsetY,
      };
    }
  }

  function minimapNodeStyle(node: CanvasNode): string {
    if (!minimapMetrics.hasNodes) return '';

    const { minX, minY, scale, offsetX, offsetY } = minimapMetrics;
    const size = node.size || { width: 320, height: 200 };

    const left = (node.position.x - minX) * scale + offsetX;
    const top = (node.position.y - minY) * scale + offsetY;
    const w = Math.max(4, size.width * scale);
    const h = Math.max(3, size.height * scale);
    return `left:${left}px;top:${top}px;width:${w}px;height:${h}px;`;
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
<div
  class="canvas-container"
  bind:this={canvasEl}
  onclick={handleCanvasClick}
  onmousedown={handleCanvasMouseDown}
  oncontextmenu={handleCanvasContextMenu}
  class:panning={spaceHeld || isPanning}
>
  <svg
    class="connections-layer"
    style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
  >
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
          <path
            d="M {fp.x} {fp.y} C {fp.x + dx} {fp.y}, {tp.x - dx} {tp.y}, {tp.x} {tp.y}"
            fill="none"
            stroke={getNodeAccentColor(fromNode.type)}
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- Wider transparent hit area for right-click -->
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

  <div
    class="nodes-layer"
    style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
  >
    {#each canvasData.nodes as node (node.id)}
      {@const size = node.size || { width: 320, height: 200 }}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="node-wrapper"
        class:selected={selectedNodeId === node.id}
        style="left: {node.position.x}px; top: {node.position.y}px; width: {size.width}px; height: {size.height}px;"
        onmousedown={(e) => handleNodeMouseDown(e, node.id)}
        oncontextmenu={(e) => handleNodeContextMenu(e, node.id)}
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

  <!-- Empty state -->
  {#if canvasData.nodes.length === 0}
    <div class="empty-state">
      <span class="empty-state-icon">🎨</span>
      <p class="empty-state-title">Canvas is empty</p>
      <p class="empty-state-hint">Drag nodes from the sidebar or right-click to add</p>
    </div>
  {/if}

  <!-- Minimap -->
  {#if canvasData.nodes.length > 0}
    <div class="minimap" aria-hidden="true">
      {#each canvasData.nodes as node (node.id)}
        <div
          class="minimap-node minimap-node--{node.type}"
          style={minimapNodeStyle(node)}
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Canvas controls (zoom) -->
  <div class="canvas-controls" role="group" aria-label="Canvas zoom controls">
    <button
      class="canvas-ctrl-btn"
      onclick={() => { zoom = Math.min(MAX_ZOOM, zoom * 1.2); }}
      title="Zoom in"
      aria-label="Zoom in"
    >+</button>
    <span class="zoom-label" aria-live="polite">{Math.round(zoom * 100)}%</span>
    <button
      class="canvas-ctrl-btn"
      onclick={() => { zoom = Math.max(MIN_ZOOM, zoom * 0.8); }}
      title="Zoom out"
      aria-label="Zoom out"
    >−</button>
    <button
      class="canvas-ctrl-btn"
      onclick={zoomToFit}
      title="Zoom to fit (all nodes)"
      aria-label="Zoom to fit all nodes"
    >⊡</button>
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
    height: 100vh;
    background-color: var(--surface-1, #1a1a2e);
    background-image:
      radial-gradient(circle, var(--border-color, rgba(255,255,255,0.1)) 1px, transparent 1px);
    background-size: 24px 24px;
    overflow: hidden;
    cursor: default;
  }

  .canvas-container.panning {
    cursor: grab;
  }

  .connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: visible;
  }

  .connections-layer path {
    pointer-events: all;
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
    transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    overflow: hidden;
  }

  .node-wrapper:hover {
    border-color: var(--border-color-strong, rgba(255,255,255,0.25));
    box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
    transform: translateY(-1px);
  }

  .node-wrapper.selected {
    border-color: var(--brand, #00d4ff);
    box-shadow: 0 0 0 2px var(--brand, #00d4ff), var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
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
