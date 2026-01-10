// Unit tests for event schema validation

import { describe, it, expect } from 'vitest';
import type {
  TerminalObserverEvent,
  CommandStartEvent,
  CommandEndEvent,
  StdoutChunkEvent,
  StderrChunkEvent,
  ExitStatusEvent,
  CwdChangeEvent,
  EnvChangeEvent,
  SessionStartEvent,
  SessionEndEvent,
} from '../types';

describe('Event Schema Validation', () => {
  const baseEvent = {
    id: 'evt_123',
    timestamp: Date.now(),
    sessionId: 'session_123',
    shellType: 'bash' as const,
  };

  describe('CommandStartEvent', () => {
    it('should have all required fields', () => {
      const event: CommandStartEvent = {
        ...baseEvent,
        type: 'command_start',
        command: 'ls',
        args: ['-la'],
        cwd: '/home/user',
        envSummary: { PATH: '/usr/bin' },
      };

      expect(event.type).toBe('command_start');
      expect(event.command).toBe('ls');
      expect(event.args).toEqual(['-la']);
      expect(event.cwd).toBe('/home/user');
      expect(event.envSummary).toBeDefined();
    });

    it('should support optional fields', () => {
      const event: CommandStartEvent = {
        ...baseEvent,
        type: 'command_start',
        command: 'ls',
        args: [],
        cwd: '/home/user',
        envSummary: {},
        pid: 12345,
        paneId: 'pane_1',
        tabId: 'tab_1',
      };

      expect(event.pid).toBe(12345);
      expect(event.paneId).toBe('pane_1');
      expect(event.tabId).toBe('tab_1');
    });
  });

  describe('CommandEndEvent', () => {
    it('should have all required fields', () => {
      const event: CommandEndEvent = {
        ...baseEvent,
        type: 'command_end',
        commandId: 'cmd_123',
        duration: 100,
      };

      expect(event.type).toBe('command_end');
      expect(event.commandId).toBe('cmd_123');
      expect(event.duration).toBe(100);
    });
  });

  describe('StdoutChunkEvent', () => {
    it('should have all required fields', () => {
      const event: StdoutChunkEvent = {
        ...baseEvent,
        type: 'stdout_chunk',
        commandId: 'cmd_123',
        chunk: 'output text',
        chunkIndex: 0,
      };

      expect(event.type).toBe('stdout_chunk');
      expect(event.commandId).toBe('cmd_123');
      expect(event.chunk).toBe('output text');
      expect(event.chunkIndex).toBe(0);
    });
  });

  describe('StderrChunkEvent', () => {
    it('should have all required fields', () => {
      const event: StderrChunkEvent = {
        ...baseEvent,
        type: 'stderr_chunk',
        commandId: 'cmd_123',
        chunk: 'error text',
        chunkIndex: 0,
      };

      expect(event.type).toBe('stderr_chunk');
      expect(event.commandId).toBe('cmd_123');
      expect(event.chunk).toBe('error text');
      expect(event.chunkIndex).toBe(0);
    });
  });

  describe('ExitStatusEvent', () => {
    it('should have all required fields', () => {
      const event: ExitStatusEvent = {
        ...baseEvent,
        type: 'exit_status',
        commandId: 'cmd_123',
        exitCode: 0,
        success: true,
      };

      expect(event.type).toBe('exit_status');
      expect(event.commandId).toBe('cmd_123');
      expect(event.exitCode).toBe(0);
      expect(event.success).toBe(true);
    });

    it('should set success to false for non-zero exit codes', () => {
      const event: ExitStatusEvent = {
        ...baseEvent,
        type: 'exit_status',
        commandId: 'cmd_123',
        exitCode: 1,
        success: false,
      };

      expect(event.success).toBe(false);
    });
  });

  describe('CwdChangeEvent', () => {
    it('should have all required fields', () => {
      const event: CwdChangeEvent = {
        ...baseEvent,
        type: 'cwd_change',
        cwd: '/home/user/projects',
      };

      expect(event.type).toBe('cwd_change');
      expect(event.cwd).toBe('/home/user/projects');
    });

    it('should support previousCwd', () => {
      const event: CwdChangeEvent = {
        ...baseEvent,
        type: 'cwd_change',
        cwd: '/home/user/projects',
        previousCwd: '/home/user',
      };

      expect(event.previousCwd).toBe('/home/user');
    });
  });

  describe('EnvChangeEvent', () => {
    it('should have all required fields', () => {
      const event: EnvChangeEvent = {
        ...baseEvent,
        type: 'env_change',
        envSummary: { PATH: '/usr/bin' },
        changedKeys: ['PATH'],
      };

      expect(event.type).toBe('env_change');
      expect(event.envSummary).toBeDefined();
      expect(event.changedKeys).toEqual(['PATH']);
    });
  });

  describe('SessionStartEvent', () => {
    it('should have all required fields', () => {
      const event: SessionStartEvent = {
        ...baseEvent,
        type: 'session_start',
        shellType: 'bash',
        cwd: '/home/user',
        envSummary: { PATH: '/usr/bin' },
      };

      expect(event.type).toBe('session_start');
      expect(event.shellType).toBe('bash');
      expect(event.cwd).toBe('/home/user');
      expect(event.envSummary).toBeDefined();
    });
  });

  describe('SessionEndEvent', () => {
    it('should have all required fields', () => {
      const event: SessionEndEvent = {
        ...baseEvent,
        type: 'session_end',
        duration: 3600000,
      };

      expect(event.type).toBe('session_end');
      expect(event.duration).toBe(3600000);
    });
  });

  describe('TerminalObserverEvent union', () => {
    it('should accept all event types', () => {
      const events: TerminalObserverEvent[] = [
        {
          ...baseEvent,
          type: 'command_start',
          command: 'ls',
          args: [],
          cwd: '/home/user',
          envSummary: {},
        },
        {
          ...baseEvent,
          type: 'command_end',
          commandId: 'cmd_123',
          duration: 100,
        },
        {
          ...baseEvent,
          type: 'stdout_chunk',
          commandId: 'cmd_123',
          chunk: 'output',
          chunkIndex: 0,
        },
        {
          ...baseEvent,
          type: 'exit_status',
          commandId: 'cmd_123',
          exitCode: 0,
          success: true,
        },
      ];

      expect(events.length).toBe(4);
      expect(events[0].type).toBe('command_start');
      expect(events[1].type).toBe('command_end');
      expect(events[2].type).toBe('stdout_chunk');
      expect(events[3].type).toBe('exit_status');
    });
  });
});

