// Tests for agent/node-status.ts

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAgentStatusFromFile, updateAgentStatusToFile } from '../node-status';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_FILE = join(homedir(), '.runebook', 'agent-status.json');
const CONFIG_DIR = join(homedir(), '.runebook');

describe('node-status', () => {
  afterEach(() => {
    // Clean up status file after each test
    if (existsSync(STATUS_FILE)) {
      rmSync(STATUS_FILE);
    }
  });

  describe('getAgentStatusFromFile', () => {
    it('should return default status when file does not exist', () => {
      const status = getAgentStatusFromFile();
      expect(status.status).toBe('idle');
      expect(status.suggestionCount).toBe(0);
      expect(status.highPriorityCount).toBe(0);
    });

    it('should read status from file when it exists', () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(
        STATUS_FILE,
        JSON.stringify({
          status: 'analyzing',
          suggestionCount: 3,
          highPriorityCount: 1,
          lastUpdated: 12345,
          lastCommand: 'git push',
          lastCommandTimestamp: 999,
        }),
        'utf-8',
      );

      const status = getAgentStatusFromFile();
      expect(status.status).toBe('analyzing');
      expect(status.suggestionCount).toBe(3);
      expect(status.highPriorityCount).toBe(1);
      expect(status.lastCommand).toBe('git push');
    });

    it('should return defaults when file contains invalid JSON', () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(STATUS_FILE, 'not-json', 'utf-8');

      const status = getAgentStatusFromFile();
      expect(status.status).toBe('idle');
    });

    it('should use defaults for missing fields in file', () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(
        STATUS_FILE,
        JSON.stringify({ status: 'issues_found' }),
        'utf-8',
      );

      const status = getAgentStatusFromFile();
      expect(status.status).toBe('issues_found');
      expect(status.suggestionCount).toBe(0);
      expect(status.highPriorityCount).toBe(0);
    });
  });

  describe('updateAgentStatusToFile', () => {
    it('should create the config directory if it does not exist', () => {
      if (existsSync(CONFIG_DIR)) {
        // Only test creation if directory doesn't exist - skip creation test if present
      }
      const current = {
        status: 'idle' as const,
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: Date.now(),
      };
      updateAgentStatusToFile(current, { status: 'analyzing' });
      expect(existsSync(STATUS_FILE)).toBe(true);
    });

    it('should write merged status to file', () => {
      const current = {
        status: 'idle' as const,
        suggestionCount: 0,
        highPriorityCount: 0,
        lastUpdated: 100,
      };
      updateAgentStatusToFile(current, {
        status: 'analyzing',
        suggestionCount: 5,
      });

      const written = getAgentStatusFromFile();
      expect(written.status).toBe('analyzing');
      expect(written.suggestionCount).toBe(5);
    });
  });
});
