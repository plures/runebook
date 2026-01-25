// Main Ambient Agent Mode coordinator
// Orchestrates event capture, storage, analysis, and suggestions

import { initCapture, stopCapture, captureCommand, captureResult, updateContext } from './capture';
import { createStorage, type EventStorage } from './memory';
import { createAnalyzer, type Analyzer } from './analysis';
import { MemorySuggestionStore, formatSuggestionsForCLI, type SuggestionStore } from './suggestions';
import { updateAgentStatus, getAgentStatus } from './status';
import type { TerminalEvent, AgentConfig, Suggestion } from '../types/agent';

export class AmbientAgent {
  private storage: EventStorage;
  private analyzer: Analyzer;
  private suggestionStore: SuggestionStore;
  private config: AgentConfig;
  private sessionId: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.storage = createStorage(config);
    this.analyzer = createAnalyzer();
    
    // Initialize with MemorySuggestionStore (browser-safe)
    this.suggestionStore = new MemorySuggestionStore();
    
    // In Node.js environment, upgrade to file-based store
    if (typeof process !== 'undefined' && process.versions?.node) {
      import('./node-suggestions').then(({ FileSuggestionStore }) => {
        this.suggestionStore = new FileSuggestionStore();
        this.suggestionStore.load().catch(err => 
          console.error('Failed to load suggestions:', err)
        );
      }).catch(() => {
        // Fallback already initialized with MemorySuggestionStore
        console.warn('FileSuggestionStore not available, using MemorySuggestionStore');
      });
    }

    if (config.enabled && config.captureEvents) {
      initCapture(this.sessionId, {
        workingDirectory: process.cwd?.() || '',
        environment: process.env as Record<string, string>,
      });
    }
    
    // Initialize status
    updateAgentStatus({ status: 'idle' });
  }

  /**
   * Capture and analyze a terminal command execution
   */
  async captureAndAnalyze(
    command: string,
    args: string[],
    env: Record<string, string>,
    cwd: string,
    startTime: number
  ): Promise<TerminalEvent> {
    if (!this.config.enabled || !this.config.captureEvents) {
      throw new Error('Agent not enabled or capture disabled');
    }

    const event = captureCommand(command, args, env, cwd, startTime);
    return event;
  }

  /**
   * Record command result and generate suggestions
   */
  async recordResult(
    event: TerminalEvent,
    stdout: string,
    stderr: string,
    exitCode: number,
    endTime: number
  ): Promise<Suggestion[]> {
    if (!this.config.enabled || !this.config.captureEvents) {
      return [];
    }

    // Update status to analyzing
    updateAgentStatus({ 
      status: 'analyzing',
      lastCommand: event.command,
      lastCommandTimestamp: event.timestamp,
    });

    const completedEvent = captureResult(event, stdout, stderr, exitCode, endTime);
    
    // Save to storage
    await this.storage.saveEvent(completedEvent);

    // Update context
    updateContext({
      previousCommand: completedEvent.command,
      workingDirectory: completedEvent.cwd,
    });

    // Analyze and generate suggestions
    let suggestions: Suggestion[] = [];
    if (this.config.analyzePatterns && this.config.suggestImprovements) {
      suggestions = await this.analyzer.analyzeEvent(completedEvent, this.storage);
      
      for (const suggestion of suggestions) {
        this.suggestionStore.add(suggestion);
      }
    }

    // Update status based on suggestions
    const allSuggestions = this.suggestionStore.suggestions;
    const highPriorityCount = allSuggestions.filter(s => s.priority === 'high').length;
    const status = highPriorityCount > 0 ? 'issues_found' : 'idle';
    
    updateAgentStatus({
      status,
      suggestionCount: allSuggestions.length,
      highPriorityCount,
      lastCommand: event.command,
      lastCommandTimestamp: event.timestamp,
    });

    return suggestions;
  }

  /**
   * Get current suggestions
   */
  getSuggestions(priority?: 'low' | 'medium' | 'high'): Suggestion[] {
    if (priority) {
      return this.suggestionStore.getByPriority(priority);
    }
    return this.suggestionStore.suggestions;
  }

  /**
   * Get suggestions formatted for CLI
   */
  getSuggestionsCLI(priority?: 'low' | 'medium' | 'high'): string {
    const suggestions = this.getSuggestions(priority);
    return formatSuggestionsForCLI(suggestions);
  }

  /**
   * Get suggestions for the last command
   */
  getSuggestionsForLastCommand(): Suggestion[] {
    const status = getAgentStatus();
    if (!status.lastCommand) {
      return [];
    }
    return this.suggestionStore.getForCommand(status.lastCommand);
  }

  /**
   * Get top suggestion
   */
  getTopSuggestion(limit: number = 1): Suggestion[] {
    return this.suggestionStore.getTop(limit);
  }

  /**
   * Analyze all patterns and generate suggestions
   */
  async analyzeAllPatterns(): Promise<Suggestion[]> {
    if (!this.config.enabled || !this.config.analyzePatterns) {
      return [];
    }

    const suggestions = await this.analyzer.analyzePatterns(this.storage);
    
    for (const suggestion of suggestions) {
      this.suggestionStore.add(suggestion);
    }

    return suggestions;
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    return await this.storage.getStats();
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 10): Promise<TerminalEvent[]> {
    return await this.storage.getEvents(limit);
  }

  /**
   * Clear old events
   */
  async clearOldEvents(days: number = 30): Promise<void> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    await this.storage.clearEvents(cutoff);
  }

  /**
   * Stop the agent
   */
  stop(): void {
    stopCapture();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (!this.config.enabled) {
      stopCapture();
    } else if (this.config.captureEvents) {
      initCapture(this.sessionId, {
        workingDirectory: process.cwd?.() || '',
        environment: process.env as Record<string, string>,
      });
    }
  }
}

/**
 * Create an Ambient Agent instance
 */
export function createAgent(config: AgentConfig): AmbientAgent {
  return new AmbientAgent(config);
}

/**
 * Default agent configuration
 */
export const defaultAgentConfig: AgentConfig = {
  enabled: false, // Opt-in by default
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
  maxEvents: 10000,
  retentionDays: 30,
};

