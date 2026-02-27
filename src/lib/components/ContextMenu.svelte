<script lang="ts">
  import { onMount } from 'svelte';

  export interface ContextMenuItem {
    label: string;
    /** Handler called when the item is activated. Omit for separator items (`separator: true`). */
    action?: () => void;
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
    const unclamped = x + w > window.innerWidth ? x - w : x;
    const maxLeft = Math.max(0, window.innerWidth - w);
    return Math.min(Math.max(0, unclamped), maxLeft);
  });
  let top = $derived.by(() => {
    if (!menuEl || !browser) return y;
    const h = menuEl.offsetHeight || 40 * items.length;
    const unclamped = y + h > window.innerHeight ? y - h : y;
    const maxTop = Math.max(0, window.innerHeight - h);
    return Math.min(Math.max(0, unclamped), maxTop);
  });

  let browser = $state(false);
  onMount(() => { browser = true; });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { onclose(); return; }
    const focusable = Array.from(
      menuEl?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []
    );
    if (focusable.length === 0) return;
    const idx = focusable.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusable[(idx + 1) % focusable.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusable[(idx - 1 + focusable.length) % focusable.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusable[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ctx-backdrop" onclick={onclose}></div>

<ul
  bind:this={menuEl}
  class="ctx-menu"
  style="left: {left}px; top: {top}px;"
  role="menu"
>
  {#each items as item}
    {#if item.separator}
      <li class="ctx-separator" role="separator" aria-hidden="true">
        <hr class="ctx-separator" />
      </li>
    {:else}
      <li
        class="ctx-item"
        class:ctx-item--danger={item.danger}
        class:ctx-item--disabled={item.disabled}
        role="menuitem"
        tabindex={item.disabled ? -1 : 0}
        aria-disabled={item.disabled}
        onclick={() => { if (!item.disabled) { item.action?.(); onclose(); } }}
        onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !item.disabled) { item.action?.(); onclose(); } }}
      >
        {item.label}
      </li>
    {/if}
  {/each}
</ul>

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
