<!-- SplitPane: horizontal/vertical split layout with tui support -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    direction?: 'horizontal' | 'vertical';
    sidebarWidth?: string;
    class?: string;
    sidebar?: Snippet;
    children?: Snippet;
  }

  let { tui = false, direction = 'horizontal', sidebarWidth = '200px', class: cls = '', sidebar, children }: Props = $props();
</script>

<div
  class="dojo-split dojo-split--{direction} {tui ? 'dojo-split--tui' : ''} {cls}"
  style="--sidebar-width: {sidebarWidth}"
>
  {#if sidebar}
    <aside class="dojo-split__sidebar">
      {@render sidebar()}
    </aside>
  {/if}
  <main class="dojo-split__main">
    {#if children}{@render children()}{/if}
  </main>
</div>

<style>
  .dojo-split {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .dojo-split--horizontal {
    flex-direction: row;
  }

  .dojo-split--vertical {
    flex-direction: column;
  }

  .dojo-split__sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    background: var(--surface-1);
    border-right: 1px solid var(--border-subtle);
    overflow-y: auto;
  }

  .dojo-split--vertical .dojo-split__sidebar {
    width: 100%;
    height: var(--sidebar-width);
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
  }

  .dojo-split__main {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .dojo-split--tui .dojo-split__sidebar {
    border-right: 1px solid var(--border-default);
  }
</style>
