<!-- Text: semantic text display with design tokens -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    variant?: 'code' | 'mono' | 'normal' | 'accent' | 'muted' | 'error' | 'warning';
    as?: string;
    class?: string;
    style?: string;
    children?: Snippet;
    [key: string]: any;
  }

  let { tui = false, variant = 'normal', as: tag = 'span', class: cls = '', children, ...rest }: Props = $props();
</script>

<svelte:element
  this={tag}
  class="dojo-text dojo-text--{variant} {tui ? 'dojo-text--tui' : ''} {cls}"
  {...rest}
>
  {#if children}{@render children()}{/if}
</svelte:element>

<style>
  .dojo-text {
    margin: 0;
  }

  .dojo-text--normal {
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }

  .dojo-text--code {
    color: var(--text-code);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .dojo-text--mono {
    color: var(--text-code);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .dojo-text--accent {
    color: var(--text-accent);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .dojo-text--muted {
    color: var(--text-muted);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  .dojo-text--error {
    color: var(--text-error);
    font-size: var(--font-size-sm);
  }

  .dojo-text--warning {
    color: var(--text-warning);
    font-size: var(--font-size-sm);
  }
</style>
