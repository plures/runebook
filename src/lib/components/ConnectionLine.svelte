<script lang="ts">
  import type { Connection, CanvasNode } from '../types/canvas';

  interface Props {
    connection: Connection;
    nodes: CanvasNode[];
    tui?: boolean;
  }

  let { connection, nodes, tui = false }: Props = $props();

  function getNodePosition(nodeId: string) {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.position : { x: 0, y: 0 };
  }

  const fromPos = $derived(getNodePosition(connection.from));
  const toPos = $derived(getNodePosition(connection.to));

  // Calculate control points for a smooth curve
  const path = $derived(() => {
    const fromX = fromPos.x + 300; // Approximate node width
    const fromY = fromPos.y + 50;  // Approximate mid-height
    const toX = toPos.x;
    const toY = toPos.y + 50;

    const controlOffset = Math.abs(toX - fromX) * 0.5;
    const cp1x = fromX + controlOffset;
    const cp1y = fromY;
    const cp2x = toX - controlOffset;
    const cp2y = toY;

    return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
  });
</script>

<path
  d={path()}
  fill="none"
  stroke="var(--brand)"
  stroke-width="2"
  stroke-linecap="round"
  data-tui={tui}
  data-from={connection.from}
  data-to={connection.to}
/>
