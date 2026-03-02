<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  export interface ContextMenuItem {
    label: string;
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
    children?: Snippet;
  }

  let { x, y, items, onclose, children }: Props = $props();

  let menuEl = $state<HTMLElement | null>(null);
  let browser = $state(false);
  onMount(() => { browser = true; });

  const DEFAULT_MENU_WIDTH = 180;
  const DEFAULT_ITEM_HEIGHT = 40;

  const left = $derived.by(() => {
    if (!menuEl || !browser) return x;
    const w = menuEl.offsetWidth || DEFAULT_MENU_WIDTH;
    const unclamped = x + w > window.innerWidth ? x - w : x;
    const maxLeft = Math.max(0, window.innerWidth - w);
    return Math.min(Math.max(0, unclamped), maxLeft);
  });
  const top = $derived.by(() => {
    if (!menuEl || !browser) return y;
    const h = menuEl.offsetHeight || DEFAULT_ITEM_HEIGHT * items.length;
    const unclamped = y + h > window.innerHeight ? y - h : y;
    const maxTop = Math.max(0, window.innerHeight - h);
    return Math.min(Math.max(0, unclamped), maxTop);
  });

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
<div class="dd-ctx-backdrop" onclick={onclose}></div>

<ul
  bind:this={menuEl}
  class="dd-ctx-menu"
  style="left: {left}px; top: {top}px;"
  role="menu"
>
  {#if children}
    {@render children()}
  {:else}
    {#each items as item}
      {#if item.separator}
        <li class="dd-ctx-separator" role="separator" aria-hidden="true">
          <hr />
        </li>
      {:else}
        <li
          class="dd-ctx-item"
          class:dd-ctx-item--danger={item.danger}
          class:dd-ctx-item--disabled={item.disabled}
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
  {/if}
</ul>

<style>
  .dd-ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
  }

  .dd-ctx-menu {
    position: fixed;
    z-index: 9001;
    min-width: 180px;
    padding: var(--space-1, 4px) 0;
    background: var(--surface-2, #16213e);
    border: 1px solid var(--border-color-strong, rgba(255,255,255,0.2));
    border-radius: var(--radius-2, 6px);
    box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.6));
    list-style: none;
    margin: 0;
  }

  .dd-ctx-item {
    padding: var(--space-2, 6px) var(--space-3, 12px);
    font-size: var(--font-size-1, 0.875rem);
    color: var(--text-1, #e0e0e0);
    cursor: pointer;
    user-select: none;
    transition: background var(--transition-fast, 80ms);
  }

  .dd-ctx-item:hover:not(.dd-ctx-item--disabled) {
    background: var(--surface-3, #0f3460);
  }

  .dd-ctx-item--danger {
    color: var(--error, #ff4d4d);
  }

  .dd-ctx-item--disabled {
    color: var(--text-3, #606070);
    cursor: default;
  }

  .dd-ctx-separator hr {
    margin: var(--space-1, 4px) 0;
    border: none;
    border-top: 1px solid var(--border-color, rgba(255,255,255,0.08));
  }
</style>
