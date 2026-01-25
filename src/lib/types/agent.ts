// Types for Ambient Agent Mode (term-agent capabilities)

export interface TerminalEvent {
  id: string;
  timestamp: number;
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration?: number; // milliseconds
  success: boolean;
  context?: EventContext;
}

export interface EventContext {
  sessionId: string;
  workingDirectory: string;
  environment: Record<string, string>;
  previousCommand?: string;
  canvasId?: string;
  nodeId?: string;
}

export interface CommandPattern {
  id: string;
  command: string;
  frequency: number;
  lastUsed: number;
  successRate: number;
  avgDuration: number;
  commonArgs: string[];
  commonEnv: Record<string, string>;
}

export interface Suggestion {
  id: string;
  type: 'command' | 'optimization' | 'shortcut' | 'warning' | 'tip';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  command?: string;
  args?: string[];
  context?: Record<string, any>;
  timestamp: number;
}

import type { LLMProviderConfig } from '../agent/llm/types';

export interface EventStorage {
  saveEvent(event: TerminalEvent): Promise<void>;
  getEvents(limit?: number, since?: number): Promise<TerminalEvent[]>;
  getEventsByCommand(command: string, limit: number): Promise<TerminalEvent[]>;
  getPatterns(): Promise<CommandPattern[]>;
  savePattern(pattern: CommandPattern): Promise<void>;
  saveSuggestion(suggestion: Suggestion): Promise<void>;
  getSuggestions(limit: number): Promise<Suggestion[]>;
  getStats(): Promise<{
    totalEvents: number;
    uniqueCommands: number;
    avgSuccessRate: number;
    totalDuration: number;
  }>;
}

export interface AgentConfig {
  enabled: boolean;
  captureEvents: boolean;
  analyzePatterns: boolean;
  suggestImprovements: boolean;
  storagePath?: string;
  maxEvents?: number;
  retentionDays?: number;
  llm?: LLMProviderConfig; // LLM/MCP integration config (disabled by default)
}

