<!-- Button: design-token-aware button with tui support -->
<script lang="ts">
  interface Props {
    tui?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let { tui = false, variant = 'secondary', disabled = false, onclick, class: cls = '', children, ...rest }: Props = $props();
</script>

<button
  class="dojo-btn dojo-btn--{variant} {tui ? 'dojo-btn--tui' : ''} {cls}"
  {disabled}
  {onclick}
  {...rest}
>
  {#if children}{@render children()}{/if}
</button>

<style>
  .dojo-btn {
    padding: var(--space-sm) var(--space-lg);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .dojo-btn--primary {
    background: var(--interactive-primary);
    color: #ffffff;
    flex: 1;
  }

  .dojo-btn--primary:hover:not(:disabled) {
    background: var(--interactive-primary-hover);
  }

  .dojo-btn--primary:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
  }

  .dojo-btn--secondary {
    background: var(--surface-3);
    color: var(--text-primary);
  }

  .dojo-btn--secondary:hover:not(:disabled) {
    background: var(--surface-4);
  }

  .dojo-btn--danger {
    background: var(--interactive-danger);
    color: var(--text-primary);
  }

  .dojo-btn--danger:hover:not(:disabled) {
    background: var(--interactive-danger-hover);
  }

  /* TUI: square corners */
  .dojo-btn--tui {
    border-radius: 0;
    border: 1px solid var(--border-default);
  }
</style>
