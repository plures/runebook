export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

function createToastStore() {
  let _toasts = $state<Toast[]>([]);
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  function add(message: string, type: Toast['type'] = 'info', duration = 3500): string {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    _toasts = [..._toasts, { id, message, type }];

    const timeout = setTimeout(() => {
      timeouts.delete(id);
      remove(id);
    }, duration);
    timeouts.set(id, timeout);
    return id;
  }

  function remove(id: string) {
    const timeout = timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(id);
    }
    _toasts = _toasts.filter(t => t.id !== id);
  }

  return {
    get toasts() { return _toasts; },
    success: (msg: string, dur?: number) => add(msg, 'success', dur),
    error:   (msg: string, dur?: number) => add(msg, 'error',   dur),
    info:    (msg: string, dur?: number) => add(msg, 'info',    dur),
    warning: (msg: string, dur?: number) => add(msg, 'warning', dur),
    remove,
  };
}

export const toast = createToastStore();
