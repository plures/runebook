// Golden tests for status formatting

import { describe, it, expect } from 'vitest';
import { formatStatus } from '../status';
import type { AgentStatusData } from '../status';

describe('Status Formatting (Golden Tests)', () => {
  describe('formatStatus', () => {
    it('should format idle status', () => {
      const status: AgentStatusData = {
        status: 'idle',
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      
      const output = formatStatus(status);
      expect(output).toBe('● idle');
    });

    it('should format analyzing status', () => {
      const status: AgentStatusData = {
        status: 'analyzing',
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      
      const output = formatStatus(status);
      expect(output).toBe('⟳ analyzing');
    });

    it('should format issues_found status with count', () => {
      const status: AgentStatusData = {
        status: 'issues_found',
        suggestionCount: 5,
        highPriorityCount: 2,
        lastUpdated: Date.now(),
      };
      
      const output = formatStatus(status);
      expect(output).toBe('⚠ 2 issues');
    });

    it('should format issues_found status with singular', () => {
      const status: AgentStatusData = {
        status: 'issues_found',
        suggestionCount: 1,
        highPriorityCount: 1,
        lastUpdated: Date.now(),
      };
      
      const output = formatStatus(status);
      expect(output).toBe('⚠ 1 issue');
    });

    it('should handle zero high priority issues', () => {
      const status: AgentStatusData = {
        status: 'issues_found',
        suggestionCount: 3,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      
      const output = formatStatus(status);
      expect(output).toBe('⚠ 0 issues');
    });
  });
});

