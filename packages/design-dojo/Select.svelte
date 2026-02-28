<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    value?: string;
    id?: string;
    class?: string;
    onchange?: (e: Event) => void;
    children?: Snippet;
  }

  let {
    tui = false,
    value = '',
    id,
    class: cls = '',
    onchange,
    children
  }: Props = $props();
</script>

<select
  class="dd-select {cls}"
  {value}
  {id}
  {onchange}
  data-tui={tui}
>
  {@render children?.()}
</select>

<style>
  .dd-select {
    width: 100%;
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    color: var(--text-1);
    font-size: var(--font-size-1);
  }

  .dd-select:focus {
    outline: none;
    border-color: var(--brand);
  }
</style>
