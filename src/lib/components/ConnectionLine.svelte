<script lang="ts">
  import type { Connection, CanvasNode } from '../types/canvas';

  interface Props {
    connection: Connection;
    nodes: CanvasNode[];
  }

  let { connection, nodes }: Props = $props();

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
  stroke="#4ec9b0"
  stroke-width="2"
  stroke-linecap="round"
/>
