<script lang="ts">
  import { toast } from '../stores/toast';
</script>

<div class="toast-container" aria-live="polite">
  {#each $toast as t (t.id)}
    <div class="toast toast--{t.type}" role="status">
      <span class="toast-icon" aria-hidden="true">
        {#if t.type === 'success'}✓{:else if t.type === 'error'}✕{:else if t.type === 'warning'}⚠{:else}ℹ{/if}
      </span>
      <span class="toast-message">{t.message}</span>
      <button class="toast-dismiss" onclick={() => toast.remove(t.id)} aria-label="Dismiss notification">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-3);
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: var(--text-1);
    font-size: var(--font-size-1);
    box-shadow: var(--shadow-3);
    pointer-events: all;
    animation: slideIn var(--transition-base);
    min-width: 200px;
    max-width: 380px;
  }

  @keyframes slideIn {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .toast--success { border-color: var(--success); }
  .toast--error   { border-color: var(--error); }
  .toast--warning { border-color: var(--warning); }
  .toast--info    { border-color: var(--brand); }

  .toast-icon {
    font-size: var(--font-size-2);
    flex-shrink: 0;
  }

  .toast--success .toast-icon { color: var(--success); }
  .toast--error   .toast-icon { color: var(--error); }
  .toast--warning .toast-icon { color: var(--warning); }
  .toast--info    .toast-icon { color: var(--brand); }

  .toast-message { flex: 1; word-break: break-word; }

  .toast-dismiss {
    background: none;
    border: none;
    color: var(--text-2);
    cursor: pointer;
    font-size: var(--font-size-3);
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }

  .toast-dismiss:hover { color: var(--text-1); }
</style>
