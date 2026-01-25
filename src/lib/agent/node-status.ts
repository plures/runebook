// Node.js-only agent status tracking with file persistence
// This file should only be imported in Node.js environments

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { AgentStatusData } from './status';

const STATUS_FILE = join(homedir(), '.runebook', 'agent-status.json');

/**
 * Get current agent status from file (Node.js only)
 */
export function getAgentStatusFromFile(): AgentStatusData {
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
 * Update agent status to file (Node.js only)
 */
export function updateAgentStatusToFile(current: AgentStatusData, updates: Partial<AgentStatusData>): void {
  const configDir = join(homedir(), '.runebook');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  const updated: AgentStatusData = {
    ...current,
    ...updates,
    lastUpdated: Date.now(),
  };
  
  writeFileSync(STATUS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}
