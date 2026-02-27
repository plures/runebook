import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Must import after vi.useFakeTimers() setup so timer shims apply
// We re-import per test via dynamic import pattern; for simplicity with
// the singleton store we reset via remove() and spy on timers.

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast and returns an id', async () => {
    const { toast } = await import('../toast.svelte');
    const id = toast.info('hello');
    expect(id).toBeTruthy();
    expect(toast.toasts.some(t => t.id === id)).toBe(true);
    toast.remove(id);
  });

  it('adds toast with correct type', async () => {
    const { toast } = await import('../toast.svelte');
    const sid = toast.success('ok');
    const eid = toast.error('err');
    const wid = toast.warning('warn');
    const iid = toast.info('info');
    expect(toast.toasts.find(t => t.id === sid)?.type).toBe('success');
    expect(toast.toasts.find(t => t.id === eid)?.type).toBe('error');
    expect(toast.toasts.find(t => t.id === wid)?.type).toBe('warning');
    expect(toast.toasts.find(t => t.id === iid)?.type).toBe('info');
    [sid, eid, wid, iid].forEach(id => toast.remove(id));
  });

  it('removes a toast by id', async () => {
    const { toast } = await import('../toast.svelte');
    const id = toast.info('to remove');
    expect(toast.toasts.some(t => t.id === id)).toBe(true);
    toast.remove(id);
    expect(toast.toasts.some(t => t.id === id)).toBe(false);
  });

  it('auto-dismisses toast after default duration', async () => {
    const { toast } = await import('../toast.svelte');
    const id = toast.info('auto dismiss');
    expect(toast.toasts.some(t => t.id === id)).toBe(true);
    vi.advanceTimersByTime(3500);
    expect(toast.toasts.some(t => t.id === id)).toBe(false);
  });

  it('auto-dismisses toast after custom duration', async () => {
    const { toast } = await import('../toast.svelte');
    const id = toast.info('short lived', 1000);
    vi.advanceTimersByTime(999);
    expect(toast.toasts.some(t => t.id === id)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(toast.toasts.some(t => t.id === id)).toBe(false);
  });

  it('clears the auto-dismiss timer when removed early', async () => {
    const { toast } = await import('../toast.svelte');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const id = toast.info('early remove');
    toast.remove(id);
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
    expect(toast.toasts.some(t => t.id === id)).toBe(false);
    clearTimeoutSpy.mockRestore();
  });

  it('can add multiple toasts and they coexist', async () => {
    const { toast } = await import('../toast.svelte');
    const id1 = toast.success('first');
    const id2 = toast.error('second');
    expect(toast.toasts.length).toBeGreaterThanOrEqual(2);
    toast.remove(id1);
    toast.remove(id2);
  });

  it('removing a non-existent id is a no-op', async () => {
    const { toast } = await import('../toast.svelte');
    const before = toast.toasts.length;
    toast.remove('non-existent-id');
    expect(toast.toasts.length).toBe(before);
  });
});
