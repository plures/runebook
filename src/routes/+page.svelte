<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { saveCanvas } from '$lib/utils/storage';
  import { browser } from '$app/environment';

  const tui = false;

  const AUTO_SAVE_KEY = 'runebook_autosave';
  let saveDebounce: ReturnType<typeof setTimeout> | null = null;
  let hasInitializedAutoSave = false;

  // Auto-load on mount
  if (browser) {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) {
      try {
        const canvas = JSON.parse(saved);
        canvasStore.loadCanvas(canvas);
      } catch { /* ignore */ }
    }
    hasInitializedAutoSave = true;
  }

  // Auto-save with 1 s debounce
  $effect(() => {
    const canvas = $canvasStore;
    if (!hasInitializedAutoSave || !browser) return;
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(canvas));
    }, 1000);
  });
</script>

<TitleBar {tui} />

<div class="app">
  <Toolbar {tui} />
  <div class="canvas-wrapper">
    <Canvas {tui} />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: calc(100vh - 40px);
    width: 100vw;
    margin-top: 40px;
  }

  .canvas-wrapper {
    flex: 1;
    margin-left: 56px;
    overflow: hidden;
  }
</style>
