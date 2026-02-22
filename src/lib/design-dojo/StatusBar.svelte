<!-- StatusBar: fixed sidebar/toolbar area with tui support -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    class?: string;
    children?: Snippet;
  }

  let { tui = false, class: cls = '', children }: Props = $props();
</script>

<nav class="dojo-statusbar {tui ? 'dojo-statusbar--tui' : ''} {cls}">
  {#if children}{@render children()}{/if}
</nav>

<style>
  .dojo-statusbar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 200px;
    background: var(--surface-1);
    border-right: 1px solid var(--border-subtle);
    padding: var(--space-xl);
    overflow-y: auto;
    z-index: 1000;
    color: var(--text-primary);
  }

  .dojo-statusbar--tui {
    border-right: 1px solid var(--border-default);
    font-family: var(--font-mono);
  }
</style>
