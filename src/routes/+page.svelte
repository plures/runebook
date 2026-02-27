<script lang="ts">
  import {
    SvelteFlow,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    type NodeTypes,
    type Node,
    type Edge,
    type Connection
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { untrack } from 'svelte';

  import TerminalNode from '$lib/components/TerminalNode.svelte';
  import InputNode from '$lib/components/InputNode.svelte';
  import DisplayNode from '$lib/components/DisplayNode.svelte';
  import TransformNode from '$lib/components/TransformNode.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';

  const nodeTypes: NodeTypes = {
    terminal: TerminalNode as any,
    input: InputNode as any,
    display: DisplayNode as any,
    transform: TransformNode as any
  };

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);

  let nodeIdCounter = $state(0);
  function nextId() {
    nodeIdCounter++;
    return `node-${nodeIdCounter}`;
  }

  function addNode(type: string) {
    const id = nextId();
    const baseX = 100 + Math.random() * 400;
    const baseY = 100 + Math.random() * 300;

    const defaults: Record<string, Partial<Node>> = {
      terminal: {
        data: { label: 'Terminal', command: '', args: [], env: {}, cwd: '' },
        style: 'width: 480px;'
      },
      input: {
        data: { label: 'Input', inputType: 'text', value: '' },
        style: 'width: 280px;'
      },
      display: {
        data: { label: 'Display', displayType: 'text', content: '' },
        style: 'width: 360px;'
      },
      transform: {
        data: { label: 'Transform', transformType: 'map', code: 'item' },
        style: 'width: 320px;'
      }
    };

    const def = defaults[type] || defaults.terminal;

    const node: Node = {
      id,
      type,
      position: { x: baseX, y: baseY },
      data: def.data!,
      style: def.style
    };

    nodes = [...nodes, node];
  }

  function onConnect(connection: Connection) {
    const source = connection.source!;
    const target = connection.target!;
    const sourceHandle = connection.sourceHandle ?? 'default';
    const targetHandle = connection.targetHandle ?? 'default';

    const edgeId = `e-${source}-${sourceHandle}-${target}-${targetHandle}`;

    const edge: Edge = {
      id: edgeId,
      source,
      target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      animated: true,
      style: 'stroke: var(--brand, #00d4ff); stroke-width: 2px;'
    };

    edges = [
      // remove any existing edge with the same connection (source/target/handles)
      ...edges.filter(
        (e) =>
          !(
            e.source === source &&
            e.target === target &&
            (e.sourceHandle ?? 'default') === sourceHandle &&
            (e.targetHandle ?? 'default') === targetHandle
          )
      ),
      edge
    ];
  }

  function onDelete({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) {
    const nodeIds = new Set(deletedNodes.map(n => n.id));
    const edgeIds = new Set(deletedEdges.map(e => e.id));
    nodes = nodes.filter(n => !nodeIds.has(n.id));
    edges = edges.filter(e => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target));
  }

  // Propagate input node values to connected display nodes through edges
  $effect(() => {
    const currentEdges = edges;
    const sourceValueMap = new Map(
      nodes
        .filter(n => n.type === 'input')
        .map(n => [n.id, n.data.value])
    );

    untrack(() => {
      const incomingEdgeMap = new Map(currentEdges.map(e => [e.target, e.source]));
      let changed = false;
      const next = nodes.map(node => {
        if (node.type !== 'display') return node;
        const sourceId = incomingEdgeMap.get(node.id);
        if (sourceId === undefined || !sourceValueMap.has(sourceId)) return node;
        const newContent = String(sourceValueMap.get(sourceId) ?? '');
        if (node.data.content === newContent) return node;
        changed = true;
        return { ...node, data: { ...node.data, content: newContent } };
      });
      if (changed) nodes = next;
    });
  });
</script>

<div class="app">
  <CommandBar onAddNode={addNode} {nodes} {edges} onLoad={(n, e) => { nodes = n; edges = e; }} onClear={() => { nodes = []; edges = []; }} />
  <div class="flow-wrapper">
    <SvelteFlow
      bind:nodes
      {edges}
      {nodeTypes}
      onconnect={onConnect}
      ondelete={onDelete}
      fitView
      colorMode="dark"
      defaultEdgeOptions={{ animated: true, style: 'stroke: #00d4ff; stroke-width: 2px;' }}
      proOptions={{ hideAttribution: true }}
    >
      <Controls position="bottom-right" />
      <MiniMap
        position="bottom-left"
        style="background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);"
      />
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
    </SvelteFlow>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .flow-wrapper {
    flex: 1;
    position: relative;
  }

  /* SvelteFlow dark theme overrides */
  :global(.svelte-flow) {
    background: #1a1a2e !important;
  }

  :global(.svelte-flow__node) {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
  }

  :global(.svelte-flow__handle) {
    width: 10px !important;
    height: 10px !important;
    background: #0f3460 !important;
    border: 2px solid #00d4ff !important;
  }

  :global(.svelte-flow__handle:hover) {
    background: #00d4ff !important;
    transform: scale(1.3);
  }

  :global(.svelte-flow__edge-path) {
    stroke: #00d4ff !important;
    stroke-width: 2px;
  }

  :global(.svelte-flow__controls) {
    background: #16213e !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 8px !important;
    overflow: hidden;
  }

  :global(.svelte-flow__controls button) {
    background: #16213e !important;
    color: #e0e0e0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
  }

  :global(.svelte-flow__controls button:hover) {
    background: #0f3460 !important;
  }

  :global(.svelte-flow__controls button svg) {
    fill: #e0e0e0 !important;
  }

  :global(.svelte-flow__minimap) {
    background: #1a1a2e !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 8px !important;
  }

  :global(.svelte-flow__background pattern circle) {
    fill: rgba(255,255,255,0.08) !important;
  }

  :global(.svelte-flow__node.selected .node-shell) {
    border-color: #00d4ff !important;
    box-shadow: 0 0 0 2px #00d4ff, 0 8px 24px rgba(0,0,0,0.6) !important;
  }
</style>
