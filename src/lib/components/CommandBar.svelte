<script lang="ts">
  interface Props {
    onAddNode: (type: string) => void;
  }

  let { onAddNode }: Props = $props();
</script>

<div class="command-bar">
  <div class="bar-left">
    <span class="logo">◇ RuneBook</span>
  </div>
  <div class="bar-center">
    <button class="add-btn" onclick={() => onAddNode('terminal')} title="Add Terminal (Ctrl+T)">
      <span class="btn-icon">⚡</span> Terminal
    </button>
    <button class="add-btn" onclick={() => onAddNode('input')} title="Add Input">
      <span class="btn-icon">📝</span> Input
    </button>
    <button class="add-btn" onclick={() => onAddNode('transform')} title="Add Transform">
      <span class="btn-icon">🔄</span> Transform
    </button>
    <button class="add-btn" onclick={() => onAddNode('display')} title="Add Display">
      <span class="btn-icon">📊</span> Display
    </button>
  </div>
  <div class="bar-right">
    <span class="hint">Drag to connect • Delete to remove • Scroll to zoom</span>
  </div>
</div>

<style>
  .command-bar {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    background: #16213e;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 16px;
    flex-shrink: 0;
    z-index: 100;
    -webkit-app-region: drag;
  }

  .bar-left {
    display: flex;
    align-items: center;
  }

  .logo {
    font-weight: 700;
    font-size: 14px;
    color: #00d4ff;
    letter-spacing: 0.5px;
    -webkit-app-region: drag;
  }

  .bar-center {
    display: flex;
    gap: 4px;
    -webkit-app-region: no-drag;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    color: #a0a0b0;
    font-size: 12px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: inherit;
  }

  .add-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.15);
  }

  .add-btn:active {
    background: rgba(0,212,255,0.1);
    border-color: #00d4ff;
    color: #00d4ff;
  }

  .btn-icon {
    font-size: 13px;
  }

  .bar-right {
    margin-left: auto;
  }

  .hint {
    font-size: 11px;
    color: #606070;
  }
</style>
