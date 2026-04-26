// RuneBook Core - Terminal Observer Module
// Main entry point for event capture and observability

export { createObserver, defaultObserverConfig, TerminalObserver } from './observer';
export type { ObserverConfig } from './types';
export type { EventType, ShellType, TerminalObserverEvent } from './types';
export { createEventStore } from './storage';
export type { EventStore } from './storage';
export { createShellAdapter, detectShellType } from './shell-adapters';
export type { ShellAdapter } from './shell-adapters';
export {
  isSecretKey,
  redactSecretsFromText,
  redactValue,
  sanitizeEnv,
  validateRedaction,
} from './redaction';

// Re-export types for convenience
export type {
  CommandEndEvent,
  CommandStartEvent,
  CwdChangeEvent,
  EnvChangeEvent,
  ExitStatusEvent,
  SessionEndEvent,
  SessionStartEvent,
  StderrChunkEvent,
  StdoutChunkEvent,
} from './types';
