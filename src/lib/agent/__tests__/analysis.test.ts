// Tests for analysis engine

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultAnalyzer } from '../analysis';
import { MemoryStorage } from '../memory';
import type { TerminalEvent, AgentConfig } from '../../types/agent';

const testConfig: AgentConfig = {
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
};

describe('Analysis Engine', () => {
  let analyzer: DefaultAnalyzer;
  let storage: MemoryStorage;

  beforeEach(() => {
    analyzer = new DefaultAnalyzer();
    storage = new MemoryStorage(testConfig);
  });

  it('should detect repeated failures', async () => {
    // Create multiple failed events
    for (let i = 0; i < 3; i++) {
      const event: TerminalEvent = {
        id: `fail-${i}`,
        timestamp: Date.now() + i,
        command: 'invalid-command',
        args: [],
        env: {},
        cwd: '/test',
        success: false,
        exitCode: 1,
      };
      await storage.saveEvent(event);
    }

    const lastEvent: TerminalEvent = {
      id: 'fail-last',
      timestamp: Date.now() + 10,
      command: 'invalid-command',
      args: [],
      env: {},
      cwd: '/test',
      success: false,
      exitCode: 1,
    };

    const suggestions = await analyzer.analyzeEvent(lastEvent, storage);
    const warning = suggestions.find(s => s.type === 'warning');
    
    expect(warning).toBeDefined();
    expect(warning?.priority).toBe('high');
  });

  it('should detect slow commands', async () => {
    const slowEvent: TerminalEvent = {
      id: 'slow',
      timestamp: Date.now(),
      command: 'slow-command',
      args: [],
      env: {},
      cwd: '/test',
      success: true,
      duration: 6000, // 6 seconds
    };

    const suggestions = await analyzer.analyzeEvent(slowEvent, storage);
    const optimization = suggestions.find(s => s.type === 'optimization');
    
    expect(optimization).toBeDefined();
    expect(optimization?.priority).toBe('medium');
  });

  it('should suggest shortcuts for frequent commands', async () => {
    // Create multiple events with the same command
    for (let i = 0; i < 6; i++) {
      const event: TerminalEvent = {
        id: `freq-${i}`,
        timestamp: Date.now() + i,
        command: 'frequent-command',
        args: ['--common-arg'],
        env: {},
        cwd: '/test',
        success: true,
      };
      await storage.saveEvent(event);
    }

    const event: TerminalEvent = {
      id: 'freq-new',
      timestamp: Date.now() + 10,
      command: 'frequent-command',
      args: [],
      env: {},
      cwd: '/test',
      success: true,
    };

    const suggestions = await analyzer.analyzeEvent(event, storage);
    const tip = suggestions.find(s => s.type === 'tip');
    
    expect(tip).toBeDefined();
  });

  it('should analyze patterns and generate suggestions', async () => {
    // Create multiple events to form patterns
    for (let i = 0; i < 10; i++) {
      const event: TerminalEvent = {
        id: `pattern-${i}`,
        timestamp: Date.now() + i,
        command: 'pattern-command',
        args: [],
        env: {},
        cwd: '/test',
        success: true,
        duration: 100,
      };
      await storage.saveEvent(event);
    }

    const suggestions = await analyzer.analyzePatterns(storage);
    
    expect(suggestions.length).toBeGreaterThan(0);
    const shortcut = suggestions.find(s => s.type === 'shortcut');
    expect(shortcut).toBeDefined();
  });
});

