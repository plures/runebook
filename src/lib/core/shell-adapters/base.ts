// Base shell adapter interface
// All shell adapters must implement this interface

import type {
  TerminalObserverEvent,
  ObserverConfig,
  ShellType,
  CommandStartEvent,
} from '../types';
import type { EventStore } from '../storage';

export interface ShellAdapter {
  /**
   * Get the shell type this adapter supports
   */
  getShellType(): ShellType;

  /**
   * Initialize the adapter with config and event store
   */
  initialize(config: ObserverConfig, store: EventStore): Promise<void>;

  /**
   * Start capturing events
   */
  start(): Promise<void>;

  /**
   * Stop capturing events
   */
  stop(): Promise<void>;

  /**
   * Check if the adapter is active
   */
  isActive(): boolean;

  /**
   * Get shell hook script (for integration into shell init files)
   */
  getHookScript(): string;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseShellAdapter implements ShellAdapter {
  protected config: ObserverConfig | null = null;
  protected store: EventStore | null = null;
  protected active = false;
  protected currentCommandId: string | null = null;
  protected commandStartTime: number = 0;
  protected stdoutChunks: string[] = [];
  protected stderrChunks: string[] = [];
  protected stdoutChunkIndex = 0;
  protected stderrChunkIndex = 0;

  abstract getShellType(): ShellType;
  abstract getHookScript(): string;

  async initialize(config: ObserverConfig, store: EventStore): Promise<void> {
    this.config = config;
    this.store = store;
  }

  async start(): Promise<void> {
    if (!this.config || !this.store) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }
    
    if (!this.config.enabled) {
      return;
    }
    
    this.active = true;
    
    // Emit session start event
    await this.emitSessionStart();
  }

  async stop(): Promise<void> {
    if (this.active) {
      // Emit session end event
      await this.emitSessionEnd();
    }
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Generate a unique event ID
   */
  protected generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique command ID
   */
  protected generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit an event to the store
   */
  protected async emitEvent(event: TerminalObserverEvent): Promise<void> {
    if (!this.store) {
      return;
    }
    
    await this.store.saveEvent(event);
  }

  /**
   * Capture command start
   */
  protected async captureCommandStart(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string>
  ): Promise<string> {
    if (!this.config || !this.store) {
      throw new Error('Adapter not initialized');
    }

    const commandId = this.generateCommandId();
    this.currentCommandId = commandId;
    this.commandStartTime = Date.now();
    this.stdoutChunks = [];
    this.stderrChunks = [];
    this.stdoutChunkIndex = 0;
    this.stderrChunkIndex = 0;

    const { sanitizeEnv } = await import('../redaction.js');
    const envSummary = this.config.redactSecrets
      ? sanitizeEnv(env, this.config.secretPatterns || [])
      : env;

    const event: CommandStartEvent = {
      id: this.generateEventId(),
      type: 'command_start',
      timestamp: this.commandStartTime,
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      command,
      args,
      cwd,
      envSummary,
    };

    await this.emitEvent(event);
    return commandId;
  }

  /**
   * Capture command end
   */
  protected async captureCommandEnd(commandId: string): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    const duration = Date.now() - this.commandStartTime;

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'command_end',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      commandId,
      duration,
    });
  }

  /**
   * Capture stdout chunk
   */
  protected async captureStdoutChunk(
    commandId: string,
    chunk: string
  ): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    const { redactSecretsFromText } = await import('../redaction.js');
    const processedChunk = this.config.redactSecrets
      ? redactSecretsFromText(chunk, this.config.secretPatterns || [])
      : chunk;

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'stdout_chunk',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      commandId,
      chunk: processedChunk,
      chunkIndex: this.stdoutChunkIndex++,
    });
  }

  /**
   * Capture stderr chunk
   */
  protected async captureStderrChunk(
    commandId: string,
    chunk: string
  ): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    const { redactSecretsFromText } = await import('../redaction.js');
    const processedChunk = this.config.redactSecrets
      ? redactSecretsFromText(chunk, this.config.secretPatterns || [])
      : chunk;

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'stderr_chunk',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      commandId,
      chunk: processedChunk,
      chunkIndex: this.stderrChunkIndex++,
    });
  }

  /**
   * Capture exit status
   */
  protected async captureExitStatus(
    commandId: string,
    exitCode: number
  ): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'exit_status',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      commandId,
      exitCode,
      success: exitCode === 0,
    });
  }

  /**
   * Emit session start event
   */
  protected async emitSessionStart(): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    const { sanitizeEnv } = await import('../redaction.js');
    const envSummary = this.config.redactSecrets
      ? sanitizeEnv(process.env as Record<string, string>, this.config.secretPatterns || [])
      : (process.env as Record<string, string>);

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'session_start',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      shellType: this.getShellType(),
      cwd: process.cwd(),
      envSummary,
    });
  }

  /**
   * Emit session end event
   */
  protected async emitSessionEnd(): Promise<void> {
    if (!this.config || !this.store) {
      return;
    }

    const sessionStart = this.config.sessionId 
      ? await this.store.getEventsBySession(this.config.sessionId, 1)
      : [];
    
    const startEvent = sessionStart.find(e => e.type === 'session_start');
    const duration = startEvent
      ? Date.now() - startEvent.timestamp
      : 0;

    await this.emitEvent({
      id: this.generateEventId(),
      type: 'session_end',
      timestamp: Date.now(),
      sessionId: this.config.sessionId || 'unknown',
      shellType: this.getShellType(),
      paneId: this.config.paneId,
      tabId: this.config.tabId,
      duration,
    });
  }
}

