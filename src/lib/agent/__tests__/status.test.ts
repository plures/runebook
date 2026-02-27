// Tests for agent/status.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { getAgentStatus, updateAgentStatus, formatStatus } from '../status';
import type { AgentStatusData } from '../status';

describe('agent status', () => {
  beforeEach(() => {
    // Reset to idle state before each test
    updateAgentStatus({
      status: 'idle',
      suggestionCount: 0,
      highPriorityCount: 0,
      lastUpdated: Date.now(),
      lastCommand: undefined,
      lastCommandTimestamp: undefined,
    });
  });

  describe('getAgentStatus', () => {
    it('should return initial idle status', () => {
      const status = getAgentStatus();
      expect(status.status).toBe('idle');
      expect(status.suggestionCount).toBe(0);
      expect(status.highPriorityCount).toBe(0);
    });
  });

  describe('updateAgentStatus', () => {
    it('should update status to analyzing', () => {
      updateAgentStatus({ status: 'analyzing' });
      expect(getAgentStatus().status).toBe('analyzing');
    });

    it('should update suggestion count', () => {
      updateAgentStatus({ suggestionCount: 3, highPriorityCount: 1 });
      const status = getAgentStatus();
      expect(status.suggestionCount).toBe(3);
      expect(status.highPriorityCount).toBe(1);
    });

    it('should update lastCommand', () => {
      updateAgentStatus({ lastCommand: 'git commit', lastCommandTimestamp: 12345 });
      const status = getAgentStatus();
      expect(status.lastCommand).toBe('git commit');
      expect(status.lastCommandTimestamp).toBe(12345);
    });

    it('should always update lastUpdated', () => {
      const before = Date.now();
      updateAgentStatus({ status: 'idle' });
      const after = Date.now();
      const status = getAgentStatus();
      expect(status.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(status.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('formatStatus', () => {
    it('should format idle status', () => {
      const status: AgentStatusData = {
        status: 'idle',
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      expect(formatStatus(status)).toContain('idle');
    });

    it('should format analyzing status', () => {
      const status: AgentStatusData = {
        status: 'analyzing',
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      expect(formatStatus(status)).toContain('analyzing');
    });

    it('should format issues_found status with count', () => {
      const status: AgentStatusData = {
        status: 'issues_found',
        suggestionCount: 3,
        highPriorityCount: 2,
        lastUpdated: Date.now(),
      };
      const result = formatStatus(status);
      expect(result).toContain('2');
      expect(result).toContain('issue');
    });

    it('should use singular "issue" when count is 1', () => {
      const status: AgentStatusData = {
        status: 'issues_found',
        suggestionCount: 1,
        highPriorityCount: 1,
        lastUpdated: Date.now(),
      };
      const result = formatStatus(status);
      expect(result).toContain('1 issue');
      expect(result).not.toContain('issues');
    });
  });
});
