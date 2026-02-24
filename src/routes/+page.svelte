<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { saveCanvas } from '$lib/utils/storage';

  const tui = false;

  // Auto-save to LocalStorage whenever the canvas changes (debounced 1 s)
  let _autoSaveTimer: ReturnType<typeof setTimeout>;
  $effect(() => {
    const canvas = $canvasStore;
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
      saveCanvas(canvas).catch((e: unknown) => console.error('Auto-save failed:', e));
    }, 1000);
  });
</script>

<div class="app">
  <CommandBar {tui} />
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
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .canvas-wrapper {
    flex: 1;
    min-height: 0;
  }
</style>
