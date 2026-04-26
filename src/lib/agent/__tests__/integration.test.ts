// Tests for agent/integration.ts

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureCommandResult,
  captureCommandStart,
  getAgent,
  initAgent,
  isAgentEnabled,
  stopAgent,
} from '../integration';

describe('agent integration', () => {
  afterEach(() => {
    stopAgent();
  });

  describe('initAgent', () => {
    it('should create and return an agent instance', () => {
      const agent = initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      expect(agent).not.toBeNull();
      expect(getAgent()).toBe(agent);
    });

    it('should use default config when no config provided', () => {
      initAgent();
      // The agent is created (may be disabled by default)
      expect(getAgent()).not.toBeNull();
    });
  });

  describe('getAgent', () => {
    it('should return null before initAgent is called', () => {
      expect(getAgent()).toBeNull();
    });

    it('should return the agent after init', () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      expect(getAgent()).not.toBeNull();
    });
  });

  describe('isAgentEnabled', () => {
    it('should return false when no agent initialized', () => {
      expect(isAgentEnabled()).toBe(false);
    });

    it('should return false when agent is disabled', () => {
      initAgent({
        enabled: false,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      expect(isAgentEnabled()).toBe(false);
    });

    it('should return true when agent is enabled', () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      expect(isAgentEnabled()).toBe(true);
    });
  });

  describe('captureCommandStart', () => {
    it('should return null when agent is not enabled', async () => {
      const result = await captureCommandStart('echo', [], {}, '/tmp');
      expect(result).toBeNull();
    });

    it('should return a terminal event when agent is enabled', async () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      const event = await captureCommandStart('echo', ['hello'], {}, '/tmp');
      expect(event).not.toBeNull();
      expect(event!.command).toBe('echo');
    });
  });

  describe('captureCommandResult', () => {
    it('should do nothing when agent is not enabled', async () => {
      await expect(
        captureCommandResult(null, 'out', 'err', 0),
      ).resolves.toBeUndefined();
    });

    it('should do nothing when event is null', async () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      await expect(
        captureCommandResult(null, 'out', 'err', 0),
      ).resolves.toBeUndefined();
    });

    it('should process a command result when agent is enabled', async () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      const event = await captureCommandStart('echo', ['hello'], {}, '/tmp');
      await expect(
        captureCommandResult(event, 'hello\n', '', 0),
      ).resolves.toBeUndefined();
    });
  });

  describe('stopAgent', () => {
    it('should stop and clear the agent', () => {
      initAgent({
        enabled: true,
        captureEvents: true,
        analyzePatterns: false,
        suggestImprovements: false,
      });
      stopAgent();
      expect(getAgent()).toBeNull();
    });

    it('should be safe to call when no agent is running', () => {
      expect(() => stopAgent()).not.toThrow();
    });
  });
});
