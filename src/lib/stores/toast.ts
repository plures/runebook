import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(message: string, type: Toast['type'] = 'info', duration = 3500): string {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    update(ts => [...ts, { id, message, type }]);
    setTimeout(() => remove(id), duration);
    return id;
  }

  function remove(id: string) {
    update(ts => ts.filter(t => t.id !== id));
  }

  return {
    subscribe,
    success: (msg: string, dur?: number) => add(msg, 'success', dur),
    error: (msg: string, dur?: number) => add(msg, 'error', dur),
    info: (msg: string, dur?: number) => add(msg, 'info', dur),
    warning: (msg: string, dur?: number) => add(msg, 'warning', dur),
    remove,
  };
}

export const toast = createToastStore();
