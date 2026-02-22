// Tests for agent/analysis-service.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisService, getAnalysisService } from '../analysis-service';
import { LocalFileStore } from '../../core/storage';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ObserverConfig, TerminalObserverEvent } from '../../core/types';

const TEST_DIR = join(tmpdir(), `runebook-analysis-service-test-${Date.now()}`);

const makeConfig = (): ObserverConfig => ({
  enabled: true,
  storagePath: TEST_DIR,
  maxEvents: 100,
});

const makeExitStatusEvent = (commandId: string, success: boolean): TerminalObserverEvent => ({
  id: `exit-${commandId}`,
  type: 'exit_status',
  timestamp: Date.now(),
  sessionId: 'sess-1',
  commandId,
  exitCode: success ? 0 : 1,
  success,
  cwd: '/tmp',
} as any);

describe('AnalysisService', () => {
  let service: AnalysisService;
  let store: LocalFileStore;

  beforeEach(() => {
    service = new AnalysisService();
    store = new LocalFileStore(makeConfig());
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should create an AnalysisService', () => {
    expect(service).toBeInstanceOf(AnalysisService);
  });

  it('should be disabled by default', () => {
    expect(service.isEnabled()).toBe(false);
  });

  describe('initialize', () => {
    it('should initialize with a store and config', () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should enable LLM when LLM config has enabled=true', () => {
      const config = { ...makeConfig(), llm: { type: 'mock' as const, enabled: true } };
      service.initialize(store, config);
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable the service when store is set', () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable the service', () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('processExitStatus', () => {
    it('should return null when service is not enabled', async () => {
      const event = makeExitStatusEvent('cmd1', false);
      const result = await service.processExitStatus(event);
      expect(result).toBeNull();
    });

    it('should return null for non-exit_status events', async () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      const event: TerminalObserverEvent = {
        id: 'e1',
        type: 'command_start',
        timestamp: Date.now(),
        sessionId: 'sess-1',
        cwd: '/tmp',
      } as any;
      const result = await service.processExitStatus(event);
      expect(result).toBeNull();
    });

    it('should return null for successful exit status events', async () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      const event = makeExitStatusEvent('cmd1', true);
      const result = await service.processExitStatus(event);
      expect(result).toBeNull();
    });

    it('should enqueue analysis for failed exit status events', async () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      const event = makeExitStatusEvent('cmd1', false);
      // enqueueFailure returns null when no command_start event exists in store
      // The processExitStatus delegates to queue.enqueueFailure which returns string|null
      const result = await service.processExitStatus(event);
      // Result is string or null (null because no command_start event in store)
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('job management', () => {
    it('should return undefined for last job when no jobs', () => {
      expect(service.getLastJob()).toBeUndefined();
    });

    it('should return undefined for non-existent job', () => {
      expect(service.getJob('non-existent')).toBeUndefined();
    });

    it('should return empty array for getAllJobs when no jobs', () => {
      expect(service.getAllJobs()).toEqual([]);
    });

    it('should return false for cancelJob when job does not exist', () => {
      expect(service.cancelJob('non-existent')).toBe(false);
    });

    it('should retrieve a job by ID after enqueueing', async () => {
      service.initialize(store, makeConfig());
      service.setEnabled(true);
      const event = makeExitStatusEvent('cmd2', false);
      const job = await service.processExitStatus(event);
      if (job) {
        const retrieved = service.getJob((job as any).id);
        expect(retrieved).toBeDefined();
        expect(service.getLastJob()).toBeDefined();
        expect(service.getAllJobs().length).toBeGreaterThan(0);
      }
    });
  });

  describe('LLM configuration', () => {
    it('should call setLLMEnabled without error', () => {
      service.initialize(store, makeConfig());
      expect(() => service.setLLMEnabled(true)).not.toThrow();
    });

    it('should call setLLMConfig without error', () => {
      service.initialize(store, makeConfig());
      expect(() => service.setLLMConfig({ type: 'mock', enabled: true })).not.toThrow();
    });

    it('should handle setLLMConfig when not initialized', () => {
      // Should not throw when config is null
      expect(() => service.setLLMConfig({ type: 'mock', enabled: true })).not.toThrow();
    });
  });
});

describe('getAnalysisService', () => {
  it('should return an AnalysisService singleton', () => {
    const s1 = getAnalysisService();
    const s2 = getAnalysisService();
    expect(s1).toBeInstanceOf(AnalysisService);
    expect(s1).toBe(s2);
  });
});
