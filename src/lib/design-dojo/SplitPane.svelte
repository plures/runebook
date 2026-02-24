<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    left?: Snippet;
    right?: Snippet;
    children?: Snippet;
  }

  let {
    tui = false,
    left,
    right,
    children
  }: Props = $props();
</script>

<div class="dd-split-pane" data-tui={tui}>
  {#if left || right}
    <div class="dd-split-pane__left">{@render left?.()}</div>
    <div class="dd-split-pane__right">{@render right?.()}</div>
  {:else}
    {@render children?.()}
  {/if}
</div>

<style>
  .dd-split-pane {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .dd-split-pane__left {
    flex-shrink: 0;
  }

  .dd-split-pane__right {
    flex: 1;
    overflow: hidden;
  }
</style>
