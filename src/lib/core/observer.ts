// Terminal Observer - Main coordinator for event capture
// Orchestrates shell adapters, event storage, and configuration

import { createShellAdapter, detectShellType } from './shell-adapters';
import { createEventStore } from './storage';
import type {
  ObserverConfig,
  TerminalObserverEvent,
  EventType,
  ShellType,
} from './types';
import type { ShellAdapter } from './shell-adapters';
import type { EventStore } from './storage';

// Re-export ObserverConfig for convenience
export type { ObserverConfig } from './types';

export class TerminalObserver {
  private config: ObserverConfig;
  private adapter: ShellAdapter | null = null;
  private store: EventStore | null = null;
  private sessionId: string;

  constructor(config: Partial<ObserverConfig> = {}) {
    this.sessionId = config.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.config = {
      enabled: false, // Opt-in by default
      redactSecrets: true,
      usePluresDB: false,
      chunkSize: 4096,
      maxEvents: 10000,
      retentionDays: 30,
      ...config,
      sessionId: this.sessionId,
      shellType: config.shellType || detectShellType(),
    };
  }

  /**
   * Initialize the observer with storage and shell adapter
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Create event store
    this.store = createEventStore(this.config);

    // Create shell adapter
    this.adapter = createShellAdapter(this.config.shellType);

    // Initialize adapter
    await this.adapter.initialize(this.config, this.store);
  }

  /**
   * Start capturing events
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Observer is not enabled. Set enabled: true in config.');
    }

    if (!this.adapter || !this.store) {
      await this.initialize();
    }

    if (this.adapter) {
      await this.adapter.start();
    }
  }

  /**
   * Stop capturing events
   */
  async stop(): Promise<void> {
    if (this.adapter) {
      await this.adapter.stop();
    }
  }

  /**
   * Check if observer is active
   */
  isActive(): boolean {
    return this.adapter?.isActive() || false;
  }

  /**
   * Get the shell hook script for manual integration
   */
  getHookScript(): string {
    if (!this.adapter) {
      this.adapter = createShellAdapter(this.config.shellType);
    }
    return this.adapter.getHookScript();
  }

  /**
   * Programmatically capture a command execution
   * Useful when shell hooks are not available
   */
  async captureCommand(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string>
  ): Promise<string> {
    if (!this.config.enabled || !this.adapter || !this.store) {
      throw new Error('Observer not initialized or not enabled');
    }

    // Use adapter's programmatic capture
    const { BashAdapter } = await import('./shell-adapters/bash.js');
    const { ZshAdapter } = await import('./shell-adapters/zsh.js');
    
    if (this.adapter instanceof BashAdapter) {
      return await (this.adapter as any).captureCommand(command, args, cwd, env);
    }
    
    if (this.adapter instanceof ZshAdapter) {
      return await (this.adapter as any).captureCommand(command, args, cwd, env);
    }

    throw new Error('Programmatic capture not supported for this shell adapter');
  }

  /**
   * Programmatically capture command result
   */
  async captureCommandResult(
    commandId: string,
    stdout: string,
    stderr: string,
    exitCode: number
  ): Promise<void> {
    if (!this.config.enabled || !this.adapter || !this.store) {
      return;
    }

    const { BashAdapter } = await import('./shell-adapters/bash.js');
    const { ZshAdapter } = await import('./shell-adapters/zsh.js');
    
    if (this.adapter instanceof BashAdapter) {
      await (this.adapter as any).captureCommandResult(commandId, stdout, stderr, exitCode);
      return;
    }
    
    if (this.adapter instanceof ZshAdapter) {
      await (this.adapter as any).captureCommandResult(commandId, stdout, stderr, exitCode);
      return;
    }
  }

  /**
   * Get events from storage
   */
  async getEvents(
    type?: EventType,
    since?: number,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    if (!this.store) {
      await this.initialize();
    }
    
    if (!this.store) {
      return [];
    }

    return await this.store.getEvents(type, since, limit);
  }

  /**
   * Get events for a specific command
   */
  async getEventsByCommand(commandId: string): Promise<TerminalObserverEvent[]> {
    if (!this.store) {
      await this.initialize();
    }
    
    if (!this.store) {
      return [];
    }

    return await this.store.getEventsByCommand(commandId);
  }

  /**
   * Get events for current session
   */
  async getEventsBySession(limit?: number): Promise<TerminalObserverEvent[]> {
    if (!this.store) {
      await this.initialize();
    }
    
    if (!this.store) {
      return [];
    }

    return await this.store.getEventsBySession(this.sessionId, limit);
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    if (!this.store) {
      await this.initialize();
    }
    
    if (!this.store) {
      return {
        totalEvents: 0,
        eventsByType: {},
        sessions: 0,
      };
    }

    return await this.store.getStats();
  }

  /**
   * Clear old events
   */
  async clearEvents(days?: number): Promise<void> {
    if (!this.store) {
      await this.initialize();
    }
    
    if (!this.store) {
      return;
    }

    const olderThan = days
      ? Date.now() - (days * 24 * 60 * 60 * 1000)
      : undefined;

    await this.store.clearEvents(olderThan);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ObserverConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ObserverConfig {
    return { ...this.config };
  }
}

/**
 * Create a terminal observer instance
 */
export function createObserver(config: Partial<ObserverConfig> = {}): TerminalObserver {
  return new TerminalObserver(config);
}

/**
 * Default observer configuration
 */
export const defaultObserverConfig: ObserverConfig = {
  enabled: false,
  redactSecrets: true,
  usePluresDB: false,
  chunkSize: 4096,
  maxEvents: 10000,
  retentionDays: 30,
  shellType: detectShellType(),
};

