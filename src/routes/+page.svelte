<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { saveCanvas, loadCanvas } from '$lib/utils/storage';
  import { browser } from '$app/environment';

  const tui = false;

  /** Shared canvas ID used by both auto-save and toolbar Save/Load. */
  const CANVAS_ID = 'default';
  let saveDebounce: ReturnType<typeof setTimeout> | null = null;
  let hasInitializedAutoSave = false;

  // Auto-load on mount via the same storage utility as Toolbar Save/Load
  if (browser) {
    loadCanvas(CANVAS_ID).then(canvas => {
      if (canvas) canvasStore.loadCanvas(canvas);
      hasInitializedAutoSave = true;
    });
  }

  // Auto-save with 1 s debounce — uses saveCanvas so Toolbar Load can find it
  $effect(() => {
    const canvas = $canvasStore;
    if (!hasInitializedAutoSave || !browser) return;
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      saveCanvas({ ...canvas, id: CANVAS_ID }).catch(() => {/* ignore */});
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
