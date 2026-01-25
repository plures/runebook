// Agent status tracking for UX surfaces

export type AgentStatus = 'idle' | 'analyzing' | 'issues_found';

export interface AgentStatusData {
  status: AgentStatus;
  lastCommand?: string;
  lastCommandTimestamp?: number;
  suggestionCount: number;
  highPriorityCount: number;
  lastUpdated: number;
}

// In-memory status for browser environment
let inMemoryStatus: AgentStatusData = {
  status: 'idle',
  suggestionCount: 0,
  highPriorityCount: 0,
  lastUpdated: Date.now(),
};

// Check if we're in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;

/**
 * Get current agent status
 */
export function getAgentStatus(): AgentStatusData {
  if (isNode) {
    // Dynamically load from file in Node.js
    try {
      // Use dynamic import to avoid bundling Node.js modules
      return inMemoryStatus; // Return in-memory for now, will be updated async
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  }
  
  return inMemoryStatus;
}

/**
 * Update agent status
 */
export function updateAgentStatus(updates: Partial<AgentStatusData>): void {
  inMemoryStatus = {
    ...inMemoryStatus,
    ...updates,
    lastUpdated: Date.now(),
  };
  
  // In Node.js, also persist to file
  if (isNode) {
    import('./node-status').then(({ updateAgentStatusToFile }) => {
      updateAgentStatusToFile(inMemoryStatus, updates);
    }).catch(err => {
      console.error('Failed to persist status to file:', err);
    });
  }
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

