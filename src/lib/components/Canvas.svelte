<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import TerminalNodeComponent from './TerminalNode.svelte';
  import InputNodeComponent from './InputNode.svelte';
  import DisplayNodeComponent from './DisplayNode.svelte';
  import TransformNodeComponent from './TransformNode.svelte';
  import ConnectionLine from './ConnectionLine.svelte';
  import type { CanvasNode, Connection, TerminalNode, InputNode } from '../types/canvas';
  import Box from '../design-dojo/Box.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

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

  const canvasData = $derived($canvasStore);

  // --- Node drag ---
  function handleNodeMouseDown(event: MouseEvent, nodeId: string) {
    if (isResizing || isConnecting) return;
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    // Don't drag if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, button, select, [contenteditable]')) return;

    isDragging = true;
    draggedNodeId = nodeId;
    selectedNodeId = nodeId;
    dragOffset = {
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y
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
    connectMousePos = { x: event.clientX, y: event.clientY };
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
    if (isDragging && draggedNodeId) {
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;
      canvasStore.updateNodePosition(draggedNodeId, Math.max(0, newX), Math.max(0, newY));
    } else if (isResizing && resizingNodeId) {
      const dx = event.clientX - resizeStart.x;
      const dy = event.clientY - resizeStart.y;
      const newW = Math.max(200, resizeStart.w + dx);
      const newH = Math.max(120, resizeStart.h + dy);
      canvasStore.updateNode(resizingNodeId, { size: { width: newW, height: newH } });
    } else if (isConnecting) {
      connectMousePos = { x: event.clientX, y: event.clientY };
    }
  }

  function handleMouseUp() {
    isDragging = false;
    draggedNodeId = null;
    isResizing = false;
    resizingNodeId = null;
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
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedNodeId && !(event.target as HTMLElement)?.closest('input, textarea, [contenteditable]')) {
        canvasStore.removeNode(selectedNodeId);
        selectedNodeId = null;
      }
    }

    // Ctrl+T — add Terminal node
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      const node: TerminalNode = {
        id: `terminal-${Date.now()}`,
        type: 'terminal',
        position: { x: 160 + Math.random() * 120, y: 100 + Math.random() * 120 },
        label: 'Terminal',
        command: 'echo',
        args: ['Hello, RuneBook!'],
        autoStart: false,
        inputs: [],
        outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }]
      };
      canvasStore.addNode(node);
    }

    // Ctrl+I — add Input node
    if (event.ctrlKey && event.key === 'i') {
      event.preventDefault();
      const node: InputNode = {
        id: `input-${Date.now()}`,
        type: 'input',
        position: { x: 160 + Math.random() * 120, y: 280 + Math.random() * 120 },
        label: 'Text Input',
        inputType: 'text',
        value: '',
        inputs: [],
        outputs: [{ id: 'value', name: 'value', type: 'output' }]
      };
      canvasStore.addNode(node);
    }
  }
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onkeydown={handleKeydown}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="canvas-container" onclick={handleCanvasClick}>
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
          <path
            d="M {fp.x} {fp.y} C {fp.x + dx} {fp.y}, {tp.x - dx} {tp.y}, {tp.x} {tp.y}"
            fill="none"
            stroke="var(--brand)"
            stroke-width="2"
            stroke-linecap="round"
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
        {#each node.inputs as port, i}
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
        {#each node.outputs as port, i}
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
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
    overflow: hidden;
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
    overflow: auto;
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

  /* Per-type node accent stripe */
  .node-wrapper--terminal { border-top: 2px solid #4caf50; }
  .node-wrapper--input    { border-top: 2px solid #00d4ff; }
  .node-wrapper--display  { border-top: 2px solid #7b2fff; }
  .node-wrapper--transform { border-top: 2px solid #ff9800; }
</style>
