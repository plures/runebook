<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    surface?: 1 | 2 | 3 | 4;
    border?: boolean;
    pad?: 1 | 2 | 3 | 4 | 5 | 6;
    radius?: 1 | 2 | 3 | 4;
    shadow?: 1 | 2 | 3;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    tui = false,
    surface,
    border = false,
    pad,
    radius,
    shadow,
    class: cls = '',
    style = '',
    children
  }: Props = $props();

  const inlineStyle = $derived([
    surface != null ? `background: var(--surface-${surface})` : null,
    border ? `border: 1px solid var(--border-color)` : null,
    pad != null ? `padding: var(--space-${pad})` : null,
    radius != null ? `border-radius: var(--radius-${radius})` : null,
    shadow != null ? `box-shadow: var(--shadow-${shadow})` : null,
    style || null,
  ].filter(Boolean).join('; '));
</script>

<div class="dd-box {cls}" style={inlineStyle} data-tui={tui}>
  {@render children?.()}
</div>

<style>
  .dd-box {
    color: var(--text-1);
    box-sizing: border-box;
  }
</style>
