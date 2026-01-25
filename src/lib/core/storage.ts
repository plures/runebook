// Event storage layer for terminal observer
// Supports both PluresDB and local file-based storage

import type {
  TerminalObserverEvent,
  EventStore,
  EventType,
  ObserverConfig,
} from './types';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

// Re-export EventStore from types for convenience
export type { EventStore } from './types';

/**
 * Local file-based storage adapter
 * Stores events as JSON files in a directory
 */
export class LocalFileStore implements EventStore {
  private events: TerminalObserverEvent[] = [];
  private config: ObserverConfig;
  private initialized = false;
  private storagePath: string;
  private eventsFile: string;

  constructor(config: ObserverConfig) {
    this.config = config;
    this.storagePath = config.storagePath || join(homedir(), '.runebook', 'observer');
    this.eventsFile = join(this.storagePath, 'events.json');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create storage directory if it doesn't exist
    if (!existsSync(this.storagePath)) {
      await mkdir(this.storagePath, { recursive: true });
    }

    // Load existing events from file
    if (existsSync(this.eventsFile)) {
      try {
        const data = await readFile(this.eventsFile, 'utf-8');
        this.events = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load events from file:', error);
        this.events = [];
      }
    }

    this.initialized = true;
  }

  private async persistEvents(): Promise<void> {
    try {
      await writeFile(this.eventsFile, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to persist events to file:', error);
    }
  }

  async saveEvent(event: TerminalObserverEvent): Promise<void> {
    await this.ensureInitialized();
    
    this.events.push(event);
    
    // Enforce max events limit
    if (this.config.maxEvents && this.config.maxEvents > 0) {
      if (this.events.length > this.config.maxEvents) {
        // Remove oldest events
        this.events = this.events.slice(-this.config.maxEvents);
      }
    }

    // Persist to file
    await this.persistEvents();
  }

  async getEvents(
    type?: EventType,
    since?: number,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    await this.ensureInitialized();
    
    let filtered = this.events;
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    
    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }

  async getEventsByCommand(
    commandId: string
  ): Promise<TerminalObserverEvent[]> {
    await this.ensureInitialized();
    
    return this.events.filter(e => {
      // command_start events use their id as the command identifier
      if (e.type === 'command_start' && e.id === commandId) {
        return true;
      }
      // Other events reference the command via commandId field
      if ('commandId' in e && e.commandId === commandId) {
        return true;
      }
      return false;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  async getEventsBySession(
    sessionId: string,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    await this.ensureInitialized();
    
    let filtered = this.events.filter(e => e.sessionId === sessionId);
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }

  async clearEvents(olderThan?: number): Promise<void> {
    await this.ensureInitialized();
    
    if (olderThan) {
      this.events = this.events.filter(e => e.timestamp >= olderThan);
    } else {
      this.events = [];
    }

    // Persist changes to file
    await this.persistEvents();
  }

  async getStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<EventType, number>;
    sessions: number;
  }> {
    await this.ensureInitialized();
    
    const eventsByType: Record<string, number> = {};
    const sessions = new Set<string>();
    
    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      sessions.add(event.sessionId);
    }
    
    return {
      totalEvents: this.events.length,
      eventsByType: eventsByType as Record<EventType, number>,
      sessions: sessions.size,
    };
  }
}

/**
 * PluresDB storage adapter
 */
export class PluresDBEventStore implements EventStore {
  private db: any = null;
  private readonly eventPrefix = 'observer:event:';
  private initialized = false;
  private config: ObserverConfig;

  constructor(config: ObserverConfig) {
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
      console.error('Failed to initialize PluresDB for observer storage:', error);
      throw new Error('PluresDB initialization failed for observer storage');
    }
  }

  async saveEvent(event: TerminalObserverEvent): Promise<void> {
    await this.ensureInitialized();
    const key = `${this.eventPrefix}${event.id}`;
    await this.db.put(key, event);
  }

  async getEvents(
    type?: EventType,
    since?: number,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    await this.ensureInitialized();
    const keys = await this.db.list(this.eventPrefix);
    const events: TerminalObserverEvent[] = [];

    for (const key of keys) {
      try {
        const event = await this.db.getValue(key);
        if (event) {
          if (type && event.type !== type) {
            continue;
          }
          if (since && event.timestamp < since) {
            continue;
          }
          events.push(event as TerminalObserverEvent);
        }
      } catch (error) {
        console.error('Failed to load event:', error);
      }
    }

    events.sort((a, b) => b.timestamp - a.timestamp);
    return limit && limit > 0 ? events.slice(0, limit) : events;
  }

  async getEventsByCommand(
    commandId: string
  ): Promise<TerminalObserverEvent[]> {
    const allEvents = await this.getEvents();
    return allEvents.filter(e => {
      // command_start events use their id as the command identifier
      if (e.type === 'command_start' && e.id === commandId) {
        return true;
      }
      // Other events reference the command via commandId field
      if ('commandId' in e && e.commandId === commandId) {
        return true;
      }
      return false;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  async getEventsBySession(
    sessionId: string,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    const allEvents = await this.getEvents();
    let filtered = allEvents.filter(e => e.sessionId === sessionId);
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
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
    eventsByType: Record<EventType, number>;
    sessions: number;
  }> {
    const events = await this.getEvents();
    const eventsByType: Record<string, number> = {};
    const sessions = new Set<string>();
    
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      sessions.add(event.sessionId);
    }
    
    return {
      totalEvents: events.length,
      eventsByType: eventsByType as Record<EventType, number>,
      sessions: sessions.size,
    };
  }
}

/**
 * Create event store based on config
 */
export function createEventStore(config: ObserverConfig): EventStore {
  if (config.usePluresDB && config.storagePath) {
    return new PluresDBEventStore(config);
  }
  return new LocalFileStore(config);
}

