<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    width?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    tui = false,
    position = 'left',
    width = '200px',
    class: cls = '',
    children
  }: Props = $props();

  const isVertical = $derived(position === 'left' || position === 'right');
  const sizeStyle = $derived(isVertical ? `width: ${width}` : `height: ${width}`);
  const positionStyle = $derived(
    position === 'left'   ? 'left: 0; top: 0; bottom: 0;' :
    position === 'right'  ? 'right: 0; top: 0; bottom: 0;' :
    position === 'top'    ? 'top: 0; left: 0; right: 0;' :
                            'bottom: 0; left: 0; right: 0;'
  );
</script>

<aside
  class="dd-status-bar {cls}"
  style="{sizeStyle}; {positionStyle}"
  data-position={position}
  data-tui={tui}
>
  {@render children?.()}
</aside>

<style>
  .dd-status-bar {
    position: fixed;
    background: var(--surface-2);
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .dd-status-bar[data-position='top'],
  .dd-status-bar[data-position='bottom'] {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    flex-direction: row;
  }

  .dd-status-bar[data-position='right'] {
    border-right: none;
    border-left: 1px solid var(--border-color);
  }
</style>
