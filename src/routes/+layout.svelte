<script lang="ts">
  import '../lib/design-dojo/tokens.css';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

{#if children}{@render children()}{/if}
