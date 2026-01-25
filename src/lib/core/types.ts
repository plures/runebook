// Canonical event schema for terminal observer layer
// Low-level shell event capture

export type ShellType = 'bash' | 'zsh' | 'nushell' | 'unknown';

export type EventType = 
  | 'command_start'
  | 'command_end'
  | 'stdout_chunk'
  | 'stderr_chunk'
  | 'exit_status'
  | 'cwd_change'
  | 'env_change'
  | 'session_start'
  | 'session_end';

/**
 * Base event structure for all terminal observer events
 */
export interface BaseTerminalEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  shellType: ShellType;
  paneId?: string; // Terminal pane/tab identifier
  tabId?: string;  // Terminal tab identifier (if applicable)
}

/**
 * Command start event - fired when a command begins execution
 */
export interface CommandStartEvent extends BaseTerminalEvent {
  type: 'command_start';
  command: string;
  args: string[];
  cwd: string;
  envSummary: Record<string, string>; // Sanitized environment variables
  pid?: number; // Process ID if available
}

/**
 * Command end event - fired when a command completes
 */
export interface CommandEndEvent extends BaseTerminalEvent {
  type: 'command_end';
  commandId: string; // Reference to command_start event
  duration: number; // Milliseconds
}

/**
 * Stdout chunk event - incremental stdout output
 */
export interface StdoutChunkEvent extends BaseTerminalEvent {
  type: 'stdout_chunk';
  commandId: string; // Reference to command_start event
  chunk: string;
  chunkIndex: number; // Sequential chunk number for this command
}

/**
 * Stderr chunk event - incremental stderr output
 */
export interface StderrChunkEvent extends BaseTerminalEvent {
  type: 'stderr_chunk';
  commandId: string; // Reference to command_start event
  chunk: string;
  chunkIndex: number; // Sequential chunk number for this command
}

/**
 * Exit status event - command exit code
 */
export interface ExitStatusEvent extends BaseTerminalEvent {
  type: 'exit_status';
  commandId: string; // Reference to command_start event
  exitCode: number;
  success: boolean;
}

/**
 * CWD change event - working directory changed
 */
export interface CwdChangeEvent extends BaseTerminalEvent {
  type: 'cwd_change';
  cwd: string;
  previousCwd?: string;
}

/**
 * Environment change event - environment variables changed
 */
export interface EnvChangeEvent extends BaseTerminalEvent {
  type: 'env_change';
  envSummary: Record<string, string>; // Sanitized environment variables
  changedKeys: string[]; // Keys that were added/modified
}

/**
 * Session start event
 */
export interface SessionStartEvent extends BaseTerminalEvent {
  type: 'session_start';
  shellType: ShellType;
  cwd: string;
  envSummary: Record<string, string>;
}

/**
 * Session end event
 */
export interface SessionEndEvent extends BaseTerminalEvent {
  type: 'session_end';
  duration: number; // Session duration in milliseconds
}

/**
 * Union type for all terminal observer events
 */
export type TerminalObserverEvent =
  | CommandStartEvent
  | CommandEndEvent
  | StdoutChunkEvent
  | StderrChunkEvent
  | ExitStatusEvent
  | CwdChangeEvent
  | EnvChangeEvent
  | SessionStartEvent
  | SessionEndEvent;

// Re-export LLMProviderConfig from agent/llm/types
export type { LLMProviderConfig } from '../agent/llm/types';

/**
 * Configuration for terminal observer
 */
export interface ObserverConfig {
  enabled: boolean; // Opt-in flag
  shellType?: ShellType; // Auto-detect if not specified
  sessionId?: string; // Auto-generate if not specified
  paneId?: string;
  tabId?: string;
  storagePath?: string; // Path for local storage or PluresDB
  usePluresDB?: boolean; // Use PluresDB if available, otherwise local store
  redactSecrets: boolean; // Enable secret redaction
  secretPatterns?: string[]; // Additional patterns to redact
  chunkSize?: number; // Max size for stdout/stderr chunks (bytes)
  maxEvents?: number; // Maximum events to store (0 = unlimited)
  retentionDays?: number; // Days to retain events (0 = unlimited)
}

/**
 * Event storage interface
 */
export interface EventStore {
  saveEvent(event: TerminalObserverEvent): Promise<void>;
  getEvents(
    type?: EventType,
    since?: number,
    limit?: number
  ): Promise<TerminalObserverEvent[]>;
  getEventsByCommand(
    commandId: string
  ): Promise<TerminalObserverEvent[]>;
  getEventsBySession(
    sessionId: string,
    limit?: number
  ): Promise<TerminalObserverEvent[]>;
  clearEvents(olderThan?: number): Promise<void>;
  getStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<EventType, number>;
    sessions: number;
  }>;
}

