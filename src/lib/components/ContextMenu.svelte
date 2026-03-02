<script lang="ts">
  import { ContextMenu } from '@plures/design-dojo';
  import type { ContextMenuItem } from '../types/canvas';

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onclose: () => void;
  }

  let { x, y, items, onclose }: Props = $props();
</script>

<ContextMenu {x} {y} {items} {onclose} />
