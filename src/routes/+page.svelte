<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';

  const tui = false;
</script>

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
    height: 100vh;
    width: 100vw;
  }

  .canvas-wrapper {
    flex: 1;
    margin-left: 200px;
  }
</style>
