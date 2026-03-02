<script lang="ts">
  import { Button } from '@plures/design-dojo';
  import { canvasStore } from '../stores/canvas';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  let canvasName = $derived($canvasStore.name || 'Untitled Canvas');

  // Detect Tauri environment (window.__TAURI__ is defined when running in Tauri)
  let isTauri = $derived(typeof window !== 'undefined' && '__TAURI__' in window);

  async function minimize() {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch { /* ignore in web mode */ }
  }

  async function maximize() {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch { /* ignore in web mode */ }
  }

  async function closeWindow() {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch { /* ignore in web mode */ }
  }
</script>

<header
  class="titlebar"
  class:titlebar--draggable={isTauri}
  data-tauri-drag-region
  data-tui={tui}
>
  <div class="titlebar-left">
    <span class="app-icon" aria-hidden="true">📓</span>
    <span class="app-name">RuneBook</span>
  </div>

  <div class="titlebar-center">
    <span class="canvas-name">{canvasName}</span>
  </div>

  <div class="titlebar-right">
    {#if isTauri}
      <Button variant="secondary" onclick={minimize} class="wc-btn wc-minimize" title="Minimize">
        <span aria-hidden="true">─</span>
      </Button>
      <Button variant="secondary" onclick={maximize} class="wc-btn wc-maximize" title="Maximize">
        <span aria-hidden="true">□</span>
      </Button>
      <Button variant="danger" onclick={closeWindow} class="wc-btn wc-close" title="Close">
        <span aria-hidden="true">✕</span>
      </Button>
    {/if}
  </div>
</header>

<style>
  .titlebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    z-index: 1100;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    user-select: none;
  }

  .titlebar--draggable {
    -webkit-app-region: drag;
  }

  .titlebar-left,
  .titlebar-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .titlebar-left {
    padding-left: var(--space-3);
    gap: var(--space-2);
  }

  .titlebar-right {
    justify-content: flex-end;
    padding-right: var(--space-2);
    -webkit-app-region: no-drag;
  }

  .app-icon {
    font-size: 1.1rem;
  }

  .app-name {
    font-size: var(--font-size-1);
    font-weight: 600;
    color: var(--text-1);
  }

  .titlebar-center {
    font-size: var(--font-size-1);
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  .canvas-name {
    font-family: var(--font-mono);
  }

  /* Window control buttons — override design-dojo Button defaults */
  :global(.wc-btn) {
    -webkit-app-region: no-drag;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 0.8rem !important;
    border-radius: var(--radius-2) !important;
  }
</style>
