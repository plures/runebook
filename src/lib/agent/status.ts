// Agent status tracking for UX surfaces

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export type AgentStatus = 'idle' | 'analyzing' | 'issues_found';

export interface AgentStatusData {
  status: AgentStatus;
  lastCommand?: string;
  lastCommandTimestamp?: number;
  suggestionCount: number;
  highPriorityCount: number;
  lastUpdated: number;
}

const STATUS_FILE = join(homedir(), '.runebook', 'agent-status.json');

/**
 * Get current agent status
 */
export function getAgentStatus(): AgentStatusData {
  if (existsSync(STATUS_FILE)) {
    try {
      const content = readFileSync(STATUS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return {
        status: data.status || 'idle',
        lastCommand: data.lastCommand,
        lastCommandTimestamp: data.lastCommandTimestamp,
        suggestionCount: data.suggestionCount || 0,
        highPriorityCount: data.highPriorityCount || 0,
        lastUpdated: data.lastUpdated || Date.now(),
      };
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  }
  
  return {
    status: 'idle',
    suggestionCount: 0,
    highPriorityCount: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Update agent status
 */
export function updateAgentStatus(updates: Partial<AgentStatusData>): void {
  const configDir = join(homedir(), '.runebook');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  const current = getAgentStatus();
  const updated: AgentStatusData = {
    ...current,
    ...updates,
    lastUpdated: Date.now(),
  };
  
  writeFileSync(STATUS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Format status for display
 */
export function formatStatus(status: AgentStatusData): string {
  const statusSymbol = {
    idle: '●',
    analyzing: '⟳',
    issues_found: '⚠',
  };
  
  const statusText = {
    idle: 'idle',
    analyzing: 'analyzing',
    issues_found: `${status.highPriorityCount} issue${status.highPriorityCount !== 1 ? 's' : ''}`,
  };
  
  return `${statusSymbol[status.status]} ${statusText[status.status]}`;
}

