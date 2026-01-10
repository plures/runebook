// Event capture system for Ambient Agent Mode
// Captures terminal commands, outputs, and context

import type { TerminalEvent, EventContext } from '../types/agent';

let sessionId: string | null = null;
let currentContext: EventContext | null = null;
let captureEnabled = false;

/**
 * Initialize event capture with a session ID
 */
export function initCapture(sessionIdParam: string, context?: Partial<EventContext>): void {
  sessionId = sessionIdParam;
  currentContext = {
    sessionId: sessionIdParam,
    workingDirectory: context?.workingDirectory || '',
    environment: context?.environment || {},
    ...context,
  };
  captureEnabled = true;
}

/**
 * Stop event capture
 */
export function stopCapture(): void {
  captureEnabled = false;
  sessionId = null;
  currentContext = null;
}

/**
 * Check if capture is enabled
 */
export function isCaptureEnabled(): boolean {
  return captureEnabled && sessionId !== null;
}

/**
 * Update the current context
 */
export function updateContext(updates: Partial<EventContext>): void {
  if (currentContext) {
    currentContext = { ...currentContext, ...updates };
  }
}

/**
 * Capture a terminal command execution
 */
export function captureCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
  cwd: string,
  startTime: number
): TerminalEvent {
  if (!isCaptureEnabled()) {
    throw new Error('Capture not initialized. Call initCapture() first.');
  }

  return {
    id: generateEventId(),
    timestamp: startTime,
    command,
    args,
    env,
    cwd,
    success: false, // Will be updated when result is captured
    context: currentContext ? { ...currentContext } : undefined,
  };
}

/**
 * Capture command result
 */
export function captureResult(
  event: TerminalEvent,
  stdout: string,
  stderr: string,
  exitCode: number,
  endTime: number
): TerminalEvent {
  const duration = endTime - event.timestamp;
  const success = exitCode === 0;

  // Update context with previous command
  if (currentContext) {
    currentContext.previousCommand = event.command;
  }

  return {
    ...event,
    stdout,
    stderr,
    exitCode,
    duration,
    success,
  };
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current session ID
 */
export function getSessionId(): string | null {
  return sessionId;
}

/**
 * Get current context
 */
export function getContext(): EventContext | null {
  return currentContext;
}

