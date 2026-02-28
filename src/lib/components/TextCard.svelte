<script lang="ts">
  import { Box, Text } from '@plures/design-dojo';
  import type { TextNode } from '../types/canvas';
  import { canvasStore } from '../stores/canvas';

  interface Props {
    node: TextNode;
    selected?: boolean;
  }

  let { node, selected = false }: Props = $props();

  let editing = $state(false);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  function startEdit(e: MouseEvent) {
    e.stopPropagation();
    editing = true;
  }

  $effect(() => {
    if (editing && textareaEl) {
      textareaEl.focus();
    }
  });

  function handleBlur() {
    editing = false;
  }

  function handleContentInput(e: Event) {
    const val = (e.target as HTMLTextAreaElement).value;
    canvasStore.updateNode(node.id, { content: val } as Partial<TextNode>);
  }

  function handleLabelInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    canvasStore.updateNode(node.id, { label: val });
  }
</script>

<Box surface={2} border radius={2} shadow={2} class="text-card" style="width:100%;height:100%;display:flex;flex-direction:column;">
  <!-- Card header / title -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="card-header" onclick={(e) => e.stopPropagation()}>
    <input
      class="card-title"
      type="text"
      value={node.label}
      oninput={handleLabelInput}
      aria-label="Card title"
    />
  </div>

  <!-- Card body -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="card-body" ondblclick={startEdit}>
    {#if editing}
      <textarea
        bind:this={textareaEl}
        class="card-textarea"
        value={node.content}
        oninput={handleContentInput}
        onblur={handleBlur}
        aria-label="Card content"
      ></textarea>
    {:else}
      <Text class="card-text">{node.content || ''}</Text>
    {/if}
  </div>
</Box>

<style>
  :global(.text-card) {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
    flex-shrink: 0;
  }

  .card-title {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-size: var(--font-size-1, 0.875rem);
    font-weight: 600;
    width: 100%;
    cursor: text;
  }

  .card-body {
    flex: 1;
    padding: var(--space-3);
    overflow: auto;
    cursor: default;
  }

  .card-textarea {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: var(--font-size-1, 0.875rem);
    line-height: 1.5;
  }

  :global(.card-text) {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: var(--font-size-1, 0.875rem);
    line-height: 1.5;
    color: var(--text-1);
  }
</style>
