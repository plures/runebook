<script lang="ts">
  import { onMount } from 'svelte';

  export interface ContextMenuItem {
    label: string;
    action: () => void;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
  }

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onclose: () => void;
  }

  let { x, y, items, onclose }: Props = $props();

  let menuEl = $state<HTMLElement | null>(null);

  // Clamp position so menu doesn't go off-screen
  let left = $derived.by(() => {
    if (!menuEl || !browser) return x;
    const w = menuEl.offsetWidth || 180;
    return x + w > window.innerWidth ? x - w : x;
  });
  let top = $derived.by(() => {
    if (!menuEl || !browser) return y;
    const h = menuEl.offsetHeight || 40 * items.length;
    return y + h > window.innerHeight ? y - h : y;
  });

  let browser = $state(false);
  onMount(() => { browser = true; });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ctx-backdrop" onclick={onclose}></div>

<menu
  bind:this={menuEl}
  class="ctx-menu"
  style="left: {left}px; top: {top}px;"
  role="menu"
>
  {#each items as item}
    {#if item.separator}
      <hr class="ctx-separator" />
    {:else}
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <li
        class="ctx-item"
        class:ctx-item--danger={item.danger}
        class:ctx-item--disabled={item.disabled}
        role="menuitem"
        aria-disabled={item.disabled}
        onclick={() => { if (!item.disabled) { item.action(); onclose(); } }}
      >
        {item.label}
      </li>
    {/if}
  {/each}
</menu>

<style>
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
  }

  .ctx-menu {
    position: fixed;
    z-index: 9001;
    min-width: 180px;
    padding: var(--space-1) 0;
    background: var(--surface-2);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-3);
    list-style: none;
    margin: 0;
  }

  .ctx-item {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-1);
    color: var(--text-1);
    cursor: pointer;
    user-select: none;
    transition: background var(--transition-fast);
  }

  .ctx-item:hover:not(.ctx-item--disabled) {
    background: var(--surface-3);
  }

  .ctx-item--danger {
    color: var(--error);
  }

  .ctx-item--disabled {
    color: var(--text-3);
    cursor: default;
  }

  .ctx-separator {
    margin: var(--space-1) 0;
    border: none;
    border-top: 1px solid var(--border-color);
  }
</style>
