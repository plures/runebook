<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    mono?: boolean;
    variant?: 1 | 2 | 3;
    class?: string;
    children?: Snippet;
  }

  let {
    tui = false,
    mono = false,
    variant = 1,
    class: cls = '',
    children
  }: Props = $props();
</script>

<span
  class="dd-text dd-text--{variant} {mono ? 'dd-text--mono' : ''} {cls}"
  data-tui={tui}
>
  {@render children?.()}
</span>

<style>
  .dd-text--1 { color: var(--text-1); }
  .dd-text--2 { color: var(--text-2); }
  .dd-text--3 { color: var(--text-3); }

  .dd-text--mono {
    font-family: var(--font-mono);
  }
</style>
