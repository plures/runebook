<!-- Input: styled input with design tokens and tui support -->
<script lang="ts">
  interface Props {
    tui?: boolean;
    type?: string;
    value?: any;
    placeholder?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  }

  let { tui = false, type = 'text', value = $bindable(''), placeholder = '', min, max, step, class: cls = '', oninput, onchange, ...rest }: Props = $props();
</script>

<input
  class="dojo-input {tui ? 'dojo-input--tui' : ''} {cls}"
  {type}
  bind:value
  {placeholder}
  {min}
  {max}
  {step}
  {oninput}
  {onchange}
  {...rest}
/>

<style>
  .dojo-input {
    width: 100%;
    padding: var(--space-md);
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    box-sizing: border-box;
  }

  .dojo-input:focus {
    outline: none;
    border-color: var(--interactive-primary);
  }

  .dojo-input--tui {
    border-radius: 0;
    font-family: var(--font-mono);
  }
</style>
