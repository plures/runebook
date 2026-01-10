// RuneBook Core - Terminal Observer Module
// Main entry point for event capture and observability

export { TerminalObserver, createObserver, defaultObserverConfig } from './observer';
export type { ObserverConfig } from './types';
export type { TerminalObserverEvent, EventType, ShellType } from './types';
export { createEventStore } from './storage';
export type { EventStore } from './storage';
export { createShellAdapter, detectShellType } from './shell-adapters';
export type { ShellAdapter } from './shell-adapters';
export {
  sanitizeEnv,
  redactSecretsFromText,
  isSecretKey,
  redactValue,
  validateRedaction,
} from './redaction';

// Re-export types for convenience
export type {
  CommandStartEvent,
  CommandEndEvent,
  StdoutChunkEvent,
  StderrChunkEvent,
  ExitStatusEvent,
  CwdChangeEvent,
  EnvChangeEvent,
  SessionStartEvent,
  SessionEndEvent,
} from './types';

