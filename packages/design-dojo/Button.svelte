<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tui?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    title?: string;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children?: Snippet;
  }

  let {
    tui = false,
    variant = 'secondary',
    disabled = false,
    title,
    onclick,
    class: cls = '',
    children
  }: Props = $props();
</script>

<button
  class="dd-btn dd-btn--{variant} {cls}"
  {disabled}
  {title}
  {onclick}
  data-tui={tui}
>
  {@render children?.()}
</button>

<style>
  .dd-btn {
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-2);
    cursor: pointer;
    font-size: var(--font-size-1);
    font-weight: 500;
    transition: background-color var(--transition-base);
  }

  .dd-btn--primary {
    background: var(--brand);
    color: var(--surface-1);
  }

  .dd-btn--primary:hover:not(:disabled) {
    filter: brightness(1.15);
  }

  .dd-btn--secondary {
    background: var(--surface-3);
    color: var(--text-1);
  }

  .dd-btn--secondary:hover:not(:disabled) {
    filter: brightness(1.2);
  }

  .dd-btn--danger {
    background: var(--error);
    color: var(--text-1);
  }

  .dd-btn--danger:hover:not(:disabled) {
    filter: brightness(1.15);
  }

  .dd-btn:disabled {
    background: var(--surface-2);
    color: var(--text-3);
    cursor: not-allowed;
  }
</style>
