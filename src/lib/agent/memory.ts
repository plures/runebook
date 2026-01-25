// Memory/storage layer for Ambient Agent Mode
// Stores terminal events and patterns for analysis

import type { TerminalEvent, CommandPattern, Suggestion, AgentConfig } from '../types/agent';

export interface EventStorage {
  saveEvent(event: TerminalEvent): Promise<void>;
  getEvents(limit?: number, since?: number): Promise<TerminalEvent[]>;
  getEventsByCommand(command: string, limit?: number): Promise<TerminalEvent[]>;
  getPatterns(): Promise<CommandPattern[]>;
  savePattern(pattern: CommandPattern): Promise<void>;
  saveSuggestion(suggestion: Suggestion): Promise<void>;
  getSuggestions(limit: number): Promise<Suggestion[]>;
  clearEvents(olderThan?: number): Promise<void>;
  getStats(): Promise<{
    totalEvents: number;
    uniqueCommands: number;
    avgSuccessRate: number;
    totalDuration: number;
  }>;
}

/**
 * In-memory storage adapter (for testing and headless mode)
 */
export class MemoryStorage implements EventStorage {
  private events: TerminalEvent[] = [];
  private patterns: Map<string, CommandPattern> = new Map();
  private suggestions: Suggestion[] = [];
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async saveEvent(event: TerminalEvent): Promise<void> {
    this.events.push(event);
    
    // Enforce max events limit
    if (this.config.maxEvents && this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Update patterns
    await this.updatePattern(event);
  }

  async getEvents(limit?: number, since?: number): Promise<TerminalEvent[]> {
    let filtered = this.events;
    
    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getEventsByCommand(command: string, limit?: number): Promise<TerminalEvent[]> {
    let filtered = this.events.filter(e => e.command === command);
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getPatterns(): Promise<CommandPattern[]> {
    return Array.from(this.patterns.values());
  }

  async savePattern(pattern: CommandPattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);
  }

  async saveSuggestion(suggestion: Suggestion): Promise<void> {
    this.suggestions.push(suggestion);
    // Keep only recent suggestions (last 100)
    if (this.suggestions.length > 100) {
      this.suggestions = this.suggestions.slice(-100);
    }
  }

  async getSuggestions(limit: number): Promise<Suggestion[]> {
    return this.suggestions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async clearEvents(olderThan?: number): Promise<void> {
    if (olderThan) {
      this.events = this.events.filter(e => e.timestamp >= olderThan);
    } else {
      this.events = [];
    }
  }

  async getStats(): Promise<{
    totalEvents: number;
    uniqueCommands: number;
    avgSuccessRate: number;
    totalDuration: number;
  }> {
    const uniqueCommands = new Set(this.events.map(e => e.command)).size;
    const successful = this.events.filter(e => e.success).length;
    const avgSuccessRate = this.events.length > 0 ? successful / this.events.length : 0;
    const totalDuration = this.events.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      totalEvents: this.events.length,
      uniqueCommands,
      avgSuccessRate,
      totalDuration,
    };
  }

  private async updatePattern(event: TerminalEvent): Promise<void> {
    const patternId = `pattern_${event.command}`;
    let pattern = this.patterns.get(patternId);

    if (!pattern) {
      pattern = {
        id: patternId,
        command: event.command,
        frequency: 0,
        lastUsed: event.timestamp,
        successRate: 0,
        avgDuration: 0,
        commonArgs: [],
        commonEnv: {},
      };
    }

    pattern.frequency += 1;
    pattern.lastUsed = Math.max(pattern.lastUsed, event.timestamp);
    
    // Update success rate
    const commandEvents = await this.getEventsByCommand(event.command);
    const successful = commandEvents.filter(e => e.success).length;
    pattern.successRate = commandEvents.length > 0 ? successful / commandEvents.length : 0;
    
    // Update average duration
    const durations = commandEvents.filter(e => e.duration !== undefined).map(e => e.duration!);
    pattern.avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
    
    // Track common args
    if (event.args.length > 0) {
      const argKey = event.args.join(' ');
      const existing = pattern.commonArgs.find(a => a === argKey);
      if (!existing) {
        pattern.commonArgs.push(argKey);
        if (pattern.commonArgs.length > 10) {
          pattern.commonArgs = pattern.commonArgs.slice(-10);
        }
      }
    }

    this.patterns.set(patternId, pattern);
  }
}

/**
 * PluresDB storage adapter (for persistent storage)
 */
export class PluresDBStorage implements EventStorage {
  private db: any = null;
  private readonly eventPrefix = 'agent:event:';
  private readonly patternPrefix = 'agent:pattern:';
  private readonly suggestionPrefix = 'agent:suggestion:';
  private initialized = false;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      const { SQLiteCompatibleAPI } = await import('pluresdb');
      
      this.db = new SQLiteCompatibleAPI({
        config: {
          port: 34567,
          host: 'localhost',
          dataDir: this.config.storagePath || './pluresdb-data',
        },
        autoStart: true,
      });

      await this.db.start();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PluresDB for agent storage:', error);
      throw new Error('PluresDB initialization failed for agent storage');
    }
  }

  async saveEvent(event: TerminalEvent): Promise<void> {
    await this.ensureInitialized();
    const key = `${this.eventPrefix}${event.id}`;
    await this.db.put(key, event);
    await this.updatePattern(event);
  }

  async getEvents(limit?: number, since?: number): Promise<TerminalEvent[]> {
    await this.ensureInitialized();
    const keys = await this.db.list(this.eventPrefix);
    const events: TerminalEvent[] = [];

    for (const key of keys) {
      try {
        const event = await this.db.getValue(key);
        if (event && (!since || event.timestamp >= since)) {
          events.push(event as TerminalEvent);
        }
      } catch (error) {
        console.error('Failed to load event:', error);
      }
    }

    events.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  async getEventsByCommand(command: string, limit?: number): Promise<TerminalEvent[]> {
    const allEvents = await this.getEvents();
    const filtered = allEvents.filter(e => e.command === command);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getPatterns(): Promise<CommandPattern[]> {
    await this.ensureInitialized();
    const keys = await this.db.list(this.patternPrefix);
    const patterns: CommandPattern[] = [];

    for (const key of keys) {
      try {
        const pattern = await this.db.getValue(key);
        if (pattern) {
          patterns.push(pattern as CommandPattern);
        }
      } catch (error) {
        console.error('Failed to load pattern:', error);
      }
    }

    return patterns;
  }

  async savePattern(pattern: CommandPattern): Promise<void> {
    await this.ensureInitialized();
    const key = `${this.patternPrefix}${pattern.id}`;
    await this.db.put(key, pattern);
  }

  async saveSuggestion(suggestion: Suggestion): Promise<void> {
    await this.ensureInitialized();
    const key = `${this.suggestionPrefix}${suggestion.id}`;
    await this.db.put(key, suggestion);
  }

  async getSuggestions(limit: number): Promise<Suggestion[]> {
    await this.ensureInitialized();
    const keys = await this.db.list(this.suggestionPrefix);
    const suggestions: Suggestion[] = [];

    for (const key of keys) {
      try {
        const suggestion = await this.db.getValue(key);
        if (suggestion) {
          suggestions.push(suggestion as Suggestion);
        }
      } catch (error) {
        console.error('Failed to load suggestion:', error);
      }
    }

    suggestions.sort((a, b) => b.timestamp - a.timestamp);
    return suggestions.slice(0, limit);
  }

  async clearEvents(olderThan?: number): Promise<void> {
    await this.ensureInitialized();
    const keys = await this.db.list(this.eventPrefix);
    
    for (const key of keys) {
      try {
        const event = await this.db.getValue(key);
        if (event && (!olderThan || event.timestamp < olderThan)) {
          await this.db.delete(key);
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  }

  async getStats(): Promise<{
    totalEvents: number;
    uniqueCommands: number;
    avgSuccessRate: number;
    totalDuration: number;
  }> {
    const events = await this.getEvents();
    const uniqueCommands = new Set(events.map(e => e.command)).size;
    const successful = events.filter(e => e.success).length;
    const avgSuccessRate = events.length > 0 ? successful / events.length : 0;
    const totalDuration = events.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      totalEvents: events.length,
      uniqueCommands,
      avgSuccessRate,
      totalDuration,
    };
  }

  private async updatePattern(event: TerminalEvent): Promise<void> {
    const patternId = `pattern_${event.command}`;
    const existingEvents = await this.getEventsByCommand(event.command);
    
    const successful = existingEvents.filter(e => e.success).length;
    const successRate = existingEvents.length > 0 ? successful / existingEvents.length : 0;
    const durations = existingEvents.filter(e => e.duration !== undefined).map(e => e.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const pattern: CommandPattern = {
      id: patternId,
      command: event.command,
      frequency: existingEvents.length,
      lastUsed: Math.max(...existingEvents.map(e => e.timestamp)),
      successRate,
      avgDuration,
      commonArgs: [...new Set(existingEvents.flatMap(e => e.args.join(' ')))].slice(0, 10),
      commonEnv: {},
    };

    await this.savePattern(pattern);
  }
}

/**
 * Create storage instance based on config
 */
export function createStorage(config: AgentConfig): EventStorage {
  if (config.storagePath) {
    return new PluresDBStorage(config);
  }
  return new MemoryStorage(config);
}

