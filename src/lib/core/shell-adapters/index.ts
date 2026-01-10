// Shell adapter factory and utilities

import { BashAdapter } from './bash';
import { ZshAdapter } from './zsh';
import type { ShellAdapter } from './base';
import type { ShellType, ObserverConfig } from '../types';
import type { EventStore } from '../storage';

/**
 * Detect the current shell type
 */
export function detectShellType(): ShellType {
  const shell = process.env.SHELL || '';
  
  if (shell.includes('bash')) {
    return 'bash';
  }
  
  if (shell.includes('zsh')) {
    return 'zsh';
  }
  
  if (shell.includes('nu')) {
    return 'nushell';
  }
  
  return 'unknown';
}

/**
 * Create a shell adapter for the specified shell type
 */
export function createShellAdapter(shellType?: ShellType): ShellAdapter {
  const type = shellType || detectShellType();
  
  switch (type) {
    case 'bash':
      return new BashAdapter();
    case 'zsh':
      return new ZshAdapter();
    case 'nushell':
      // TODO: Implement nushell adapter
      throw new Error('Nushell adapter not yet implemented');
    default:
      throw new Error(`Unsupported shell type: ${type}`);
  }
}

/**
 * Get all available shell adapters
 */
export function getAvailableAdapters(): ShellAdapter[] {
  return [
    new BashAdapter(),
    new ZshAdapter(),
    // Nushell adapter will be added later
  ];
}

export { BashAdapter, ZshAdapter };
export type { ShellAdapter } from './base';

