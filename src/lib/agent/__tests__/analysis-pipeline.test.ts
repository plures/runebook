// Tests for analysis pipeline

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisJobQueue } from '../analysis-pipeline';
import { createHeuristicAnalyzers, createLocalSearchAnalyzer } from '../analyzers';
import type { TerminalObserverEvent, EventStore } from '../../core/types';

/**
 * Mock event store for testing
 */
class MockEventStore implements EventStore {
  private events: TerminalObserverEvent[] = [];

  async saveEvent(event: TerminalObserverEvent): Promise<void> {
    this.events.push(event);
  }

  async getEvents(
    type?: import('../../core/types').EventType,
    since?: number,
    limit?: number
  ): Promise<TerminalObserverEvent[]> {
    let filtered = this.events;
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    
    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }

  async getEventsByCommand(commandId: string): Promise<TerminalObserverEvent[]> {
    return this.events.filter(e => {
      if ('commandId' in e) {
        return e.commandId === commandId;
      }
      if (e.type === 'command_start' && e.id === commandId) {
        return true;
      }
      return false;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  async getEventsBySession(sessionId: string, limit?: number): Promise<TerminalObserverEvent[]> {
    let filtered = this.events.filter(e => e.sessionId === sessionId);
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    return filtered;
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
    eventsByType: Record<import('../../core/types').EventType, number>;
    sessions: number;
  }> {
    const eventsByType: Record<string, number> = {};
    const sessions = new Set<string>();
    
    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      sessions.add(event.sessionId);
    }
    
    return {
      totalEvents: this.events.length,
      eventsByType: eventsByType as Record<import('../../core/types').EventType, number>,
      sessions: sessions.size,
    };
  }
}

describe('Analysis Pipeline', () => {
  let queue: AnalysisJobQueue;
  let store: EventStore;

  beforeEach(() => {
    store = new MockEventStore();
    queue = new AnalysisJobQueue(store);
    
    // Register analyzers
    const heuristicAnalyzers = createHeuristicAnalyzers();
    for (const analyzer of heuristicAnalyzers) {
      queue.registerAnalyzer(analyzer);
    }
    queue.registerAnalyzer(createLocalSearchAnalyzer());
  });

  describe('GitHub Rate Limit Error', () => {
    it('should detect GitHub rate limit and suggest token', async () => {
      const commandId = 'cmd_123';
      const events: TerminalObserverEvent[] = [
        {
          id: commandId,
          type: 'command_start',
          timestamp: Date.now(),
          sessionId: 'session_1',
          shellType: 'bash',
          command: 'nix',
          args: ['flake', 'update'],
          cwd: '/tmp',
          envSummary: {},
        },
        {
          id: 'stderr_1',
          type: 'stderr_chunk',
          timestamp: Date.now() + 100,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          chunk: 'error: GitHub API rate limit exceeded',
          chunkIndex: 0,
        },
        {
          id: 'exit_1',
          type: 'exit_status',
          timestamp: Date.now() + 200,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          exitCode: 1,
          success: false,
        },
      ];

      // Save events
      for (const event of events) {
        await store.saveEvent(event);
      }

      const jobId = await queue.enqueueFailure(commandId, events, store);
      expect(jobId).toBeTruthy();

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 1000));

      const job = queue.getJob(jobId!);
      expect(job).toBeTruthy();
      expect(job!.status).toBe('completed');

      // Check for GitHub rate limit suggestion
      const suggestions = job!.suggestions.filter(s => 
        s.title.includes('GitHub Rate Limit') || s.title.includes('rate limit')
      );
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestion = suggestions[0];
      expect(suggestion.confidence).toBeGreaterThan(0.8);
      expect(suggestion.actionableSnippet).toContain('GITHUB_TOKEN');
    });
  });

  describe('Missing Nix Attribute Error', () => {
    it('should detect missing attribute and suggest fix', async () => {
      const commandId = 'cmd_456';
      const events: TerminalObserverEvent[] = [
        {
          id: commandId,
          type: 'command_start',
          timestamp: Date.now(),
          sessionId: 'session_1',
          shellType: 'bash',
          command: 'nix',
          args: ['build'],
          cwd: '/tmp',
          envSummary: {},
        },
        {
          id: 'stderr_1',
          type: 'stderr_chunk',
          timestamp: Date.now() + 100,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          chunk: 'error: attribute "cursor" missing',
          chunkIndex: 0,
        },
        {
          id: 'exit_1',
          type: 'exit_status',
          timestamp: Date.now() + 200,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          exitCode: 1,
          success: false,
        },
      ];

      for (const event of events) {
        await store.saveEvent(event);
      }

      const jobId = await queue.enqueueFailure(commandId, events, store);
      expect(jobId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const job = queue.getJob(jobId!);
      expect(job).toBeTruthy();
      expect(job!.status).toBe('completed');

      const suggestions = job!.suggestions.filter(s => 
        s.title.includes('Missing Nix Attribute') || s.description.includes('cursor')
      );
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestion = suggestions[0];
      expect(suggestion.confidence).toBeGreaterThan(0.8);
      expect(suggestion.description).toContain('cursor');
    });
  });

  describe('Flake-Parts Template Path Error', () => {
    it('should detect flake-parts template path error', async () => {
      const commandId = 'cmd_789';
      const events: TerminalObserverEvent[] = [
        {
          id: commandId,
          type: 'command_start',
          timestamp: Date.now(),
          sessionId: 'session_1',
          shellType: 'bash',
          command: 'nix',
          args: ['flake', 'check'],
          cwd: '/tmp',
          envSummary: {},
        },
        {
          id: 'stderr_1',
          type: 'stderr_chunk',
          timestamp: Date.now() + 100,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          chunk: 'error: template path not found',
          chunkIndex: 0,
        },
        {
          id: 'exit_1',
          type: 'exit_status',
          timestamp: Date.now() + 200,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          exitCode: 1,
          success: false,
        },
      ];

      for (const event of events) {
        await store.saveEvent(event);
      }

      const jobId = await queue.enqueueFailure(commandId, events, store);
      expect(jobId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const job = queue.getJob(jobId!);
      expect(job).toBeTruthy();
      expect(job!.status).toBe('completed');

      const suggestions = job!.suggestions.filter(s => 
        s.title.includes('Flake-Parts Template') || s.title.includes('template')
      );
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestion = suggestions[0];
      expect(suggestion.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Nix buildEnv Font Conflict', () => {
    it('should detect font conflict in buildEnv', async () => {
      const commandId = 'cmd_font';
      const events: TerminalObserverEvent[] = [
        {
          id: commandId,
          type: 'command_start',
          timestamp: Date.now(),
          sessionId: 'session_1',
          shellType: 'bash',
          command: 'nix',
          args: ['build'],
          cwd: '/tmp',
          envSummary: {},
        },
        {
          id: 'stderr_1',
          type: 'stderr_chunk',
          timestamp: Date.now() + 100,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          chunk: 'error: font conflict in buildEnv',
          chunkIndex: 0,
        },
        {
          id: 'exit_1',
          type: 'exit_status',
          timestamp: Date.now() + 200,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          exitCode: 1,
          success: false,
        },
      ];

      for (const event of events) {
        await store.saveEvent(event);
      }

      const jobId = await queue.enqueueFailure(commandId, events, store);
      expect(jobId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const job = queue.getJob(jobId!);
      expect(job).toBeTruthy();
      expect(job!.status).toBe('completed');

      const suggestions = job!.suggestions.filter(s => 
        s.title.includes('Font Conflict') || s.title.includes('font')
      );
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestion = suggestions[0];
      expect(suggestion.confidence).toBeGreaterThan(0.7);
      expect(suggestion.actionableSnippet).toContain('buildEnv');
    });
  });

  describe('Token Environment Variable Missing', () => {
    it('should detect missing token env var', async () => {
      const commandId = 'cmd_token';
      const events: TerminalObserverEvent[] = [
        {
          id: commandId,
          type: 'command_start',
          timestamp: Date.now(),
          sessionId: 'session_1',
          shellType: 'bash',
          command: 'nix',
          args: ['flake', 'update'],
          cwd: '/tmp',
          envSummary: {},
        },
        {
          id: 'stderr_1',
          type: 'stderr_chunk',
          timestamp: Date.now() + 100,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          chunk: 'error: GITHUB_TOKEN not set',
          chunkIndex: 0,
        },
        {
          id: 'exit_1',
          type: 'exit_status',
          timestamp: Date.now() + 200,
          sessionId: 'session_1',
          shellType: 'bash',
          commandId,
          exitCode: 1,
          success: false,
        },
      ];

      for (const event of events) {
        await store.saveEvent(event);
      }

      const jobId = await queue.enqueueFailure(commandId, events, store);
      expect(jobId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const job = queue.getJob(jobId!);
      expect(job).toBeTruthy();
      expect(job!.status).toBe('completed');

      const suggestions = job!.suggestions.filter(s => 
        s.title.includes('Token') || s.description.includes('GITHUB_TOKEN')
      );
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestion = suggestions[0];
      expect(suggestion.confidence).toBeGreaterThan(0.7);
      expect(suggestion.actionableSnippet).toContain('GITHUB_TOKEN');
    });
  });
});

