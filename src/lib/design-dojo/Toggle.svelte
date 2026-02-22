<!-- Toggle: checkbox or toggle switch with tui support -->
<script lang="ts">
  interface Props {
    tui?: boolean;
    checked?: boolean;
    label?: string;
    class?: string;
  }

  let { tui = false, checked = $bindable(false), label = '', class: cls = '', ...rest }: Props = $props();
</script>

<label class="dojo-toggle {tui ? 'dojo-toggle--tui' : ''} {cls}">
  <input type="checkbox" bind:checked {...rest} />
  {#if label}<span class="dojo-toggle__label">{label}</span>{/if}
</label>

<style>
  .dojo-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    cursor: pointer;
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }

  .dojo-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--interactive-primary);
  }

  .dojo-toggle__label {
    user-select: none;
  }

  .dojo-toggle--tui input[type="checkbox"] {
    appearance: none;
    width: 14px;
    height: 14px;
    border: 1px solid var(--border-default);
    background: var(--surface-0);
    position: relative;
    border-radius: 0;
  }

  .dojo-toggle--tui input[type="checkbox"]:checked::after {
    content: 'x';
    position: absolute;
    top: -2px;
    left: 2px;
    color: var(--text-accent);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
  }
</style>
