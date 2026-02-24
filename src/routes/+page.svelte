<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import { settingsStore } from '$lib/stores/settings';
  import { onMount } from 'svelte';

  const tui = false;

  let settingsOpen = $state(false);
  let helpOpen = $state(false);
  let helpView = $state<'shortcuts' | 'about'>('shortcuts');

  function openHelp(view: 'shortcuts' | 'about') {
    helpView = view;
    helpOpen = true;
  }

  onMount(() => {
    settingsStore.init();
  });
</script>

<TitleBar {tui} />

<div class="app">
  <Toolbar
    {tui}
    onOpenSettings={() => { settingsOpen = true; }}
    onOpenHelp={openHelp}
  />
  <div class="canvas-wrapper">
    <Canvas {tui} />
  </div>
</div>

<SettingsPanel
  open={settingsOpen}
  onclose={() => { settingsOpen = false; }}
  {tui}
/>

<HelpPanel
  open={helpOpen}
  bind:view={helpView}
  onclose={() => { helpOpen = false; }}
  {tui}
/>

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
    margin-left: 200px;
  }
</style>
