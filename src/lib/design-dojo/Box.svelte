<!-- Box: a generic container that respects design tokens and tui mode -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    variant?: 'node' | 'header' | 'body' | 'footer' | 'inset' | 'panel';
    class?: string;
    style?: string;
    children?: Snippet;
    [key: string]: any;
  }

  let { tui = false, variant = 'panel', class: cls = '', style = '', children, ...rest }: Props = $props();
</script>

<div
  class="dojo-box dojo-box--{variant} {tui ? 'dojo-box--tui' : ''} {cls}"
  {style}
  {...rest}
>
  {#if children}{@render children()}{/if}
</div>

<style>
  .dojo-box {
    box-sizing: border-box;
    color: var(--text-primary);
  }

  .dojo-box--node {
    background: var(--surface-2);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-node);
    font-family: var(--font-mono);
  }

  .dojo-box--header {
    background: var(--surface-3);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    gap: var(--space-md);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .dojo-box--body {
    padding: var(--space-lg);
  }

  .dojo-box--footer {
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--border-default);
    display: flex;
    gap: var(--space-md);
  }

  .dojo-box--inset {
    background: var(--surface-0);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
  }

  .dojo-box--panel {
    background: var(--surface-2);
  }

  /* TUI overrides: square corners, ASCII borders */
  .dojo-box--tui.dojo-box--node {
    border-radius: 0;
    border-style: solid;
  }

  .dojo-box--tui.dojo-box--header {
    border-radius: 0;
  }
</style>
