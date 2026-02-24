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

<table class="dd-table {cls}" data-tui={tui}>
  {@render children?.()}
</table>

<style>
  .dd-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface-1);
    border-radius: var(--radius-2);
    font-size: var(--font-size-1);
    color: var(--text-1);
  }

  :global(.dd-table th) {
    background: var(--surface-2);
    font-weight: 600;
    padding: var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  :global(.dd-table td) {
    padding: var(--space-2);
    border-bottom: 1px solid var(--border-color);
  }

  :global(.dd-table tr:last-child td) {
    border-bottom: none;
  }
</style>
