<script lang="ts">
  import { untrack } from 'svelte';
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

  import TerminalNode from '$lib/components/TerminalNode.svelte';
  import InputNode from '$lib/components/InputNode.svelte';
  import DisplayNode from '$lib/components/DisplayNode.svelte';
  import TransformNode from '$lib/components/TransformNode.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';
  import { runTransform } from '$lib/utils/transform';

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
        data: { label: 'Transform', transformType: 'map', code: 'item => item', input: undefined, output: undefined, error: null },
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
    const edge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      animated: true,
      style: 'stroke: var(--brand, #00d4ff); stroke-width: 2px;'
    };
    edges = [...edges, edge];
  }

  function onDelete({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) {
    const nodeIds = new Set(deletedNodes.map(n => n.id));
    const edgeIds = new Set(deletedEdges.map(e => e.id));
    nodes = nodes.filter(n => !nodeIds.has(n.id));
    edges = edges.filter(e => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target));
  }

  // --- Transform pipeline ---

  /**
   * Walk the edge graph and propagate output values from source nodes to their
   * downstream transform and display nodes.  Runs synchronously; repeated
   * passes handle arbitrarily long chains.
   */
  function propagateData(): void {
    // Seed the output map with every input node's current value.
    const outputs = new Map<string, unknown>();
    for (const node of nodes) {
      if (node.type === 'input') {
        let val: unknown = node.data.value;
        // Attempt JSON parse so arrays / objects flow correctly.
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { /* keep as string */ }
        }
        outputs.set(node.id, val);
      }
    }

    // Multi-pass propagation handles chains (A→B→C etc.).
    // Break early once a full pass produces no new outputs.
    const maxPasses = nodes.length + 1;
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;
      for (const edge of edges) {
        const sourceOutput = outputs.get(edge.source);
        if (sourceOutput === undefined) continue;

        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) continue;

        if (targetNode.type === 'transform') {
          targetNode.data.input = sourceOutput;
          const { result, error } = runTransform(
            String(targetNode.data.transformType ?? 'map'),
            String(targetNode.data.code ?? ''),
            sourceOutput
          );
          targetNode.data.output = result;
          targetNode.data.error = error;
          if (error === null && !outputs.has(targetNode.id)) {
            outputs.set(targetNode.id, result);
            changed = true;
          }
        } else if (targetNode.type === 'display') {
          targetNode.data.content = sourceOutput;
        }
      }
      if (!changed) break;
    }
  }

  // Re-run propagation whenever input values, transform code/type, or graph
  // topology changes.  Writes use untrack() to avoid feedback loops.
  $effect(() => {
    for (const node of nodes) {
      if (node.type === 'input') void node.data.value;
      if (node.type === 'transform') {
        void node.data.code;
        void node.data.transformType;
      }
    }
    // Track edge topology.
    for (const e of edges) void e.id;

    untrack(() => propagateData());
  });
</script>

<div class="app">
  <CommandBar onAddNode={addNode} />
  <div class="flow-wrapper">
    <SvelteFlow
      {nodes}
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
