// Integration layer for Ambient Agent Mode
// Connects agent to terminal execution

import { createAgent, defaultAgentConfig, type AmbientAgent } from './index';
import type { AgentConfig, TerminalEvent } from '../types/agent';

let agentInstance: AmbientAgent | null = null;
let agentConfig: AgentConfig = { ...defaultAgentConfig };

/**
 * Initialize the agent (opt-in)
 */
export function initAgent(config?: Partial<AgentConfig>): AmbientAgent {
  agentConfig = { ...defaultAgentConfig, ...config };
  agentInstance = createAgent(agentConfig);
  return agentInstance;
}

/**
 * Get the current agent instance
 */
export function getAgent(): AmbientAgent | null {
  return agentInstance;
}

/**
 * Check if agent is enabled
 */
export function isAgentEnabled(): boolean {
  return agentInstance !== null && agentConfig.enabled;
}

/**
 * Capture terminal command before execution
 */
export async function captureCommandStart(
  command: string,
  args: string[],
  env: Record<string, string>,
  cwd: string
): Promise<TerminalEvent | null> {
  if (!isAgentEnabled()) {
    return null;
  }

  const startTime = Date.now();
  return await agentInstance!.captureAndAnalyze(command, args, env, cwd, startTime);
}

/**
 * Capture terminal command result
 */
export async function captureCommandResult(
  event: TerminalEvent | null,
  stdout: string,
  stderr: string,
  exitCode: number
): Promise<void> {
  if (!isAgentEnabled() || !event) {
    return;
  }

  const endTime = Date.now();
  const suggestions = await agentInstance!.recordResult(event, stdout, stderr, exitCode, endTime);
  
  // Log suggestions if any (can be enhanced to show in UI)
  if (suggestions.length > 0 && agentConfig.suggestImprovements) {
    console.log('Agent suggestions:', suggestions);
  }
}

/**
 * Stop the agent
 */
export function stopAgent(): void {
  if (agentInstance) {
    agentInstance.stop();
    agentInstance = null;
  }
}

