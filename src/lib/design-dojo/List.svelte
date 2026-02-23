<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    tui = false,
    class: cls = '',
    children
  }: Props = $props();
</script>

<ul class="dd-list {cls}" data-tui={tui}>
  {@render children?.()}
</ul>

<style>
  .dd-list {
    list-style: none;
    margin: 0;
    padding: 0;
    color: var(--text-1);
    font-size: var(--font-size-1);
  }

  :global(.dd-list li) {
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--border-color);
  }

  :global(.dd-list li:last-child) {
    border-bottom: none;
  }
</style>
