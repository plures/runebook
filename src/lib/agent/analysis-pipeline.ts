// Analysis Pipeline - Background job system for failure analysis
// Runs analyzers in layers: heuristic → local search → optional LLM/MCP

import type { TerminalObserverEvent, EventStore } from '../core/types';
import type { Suggestion } from '../types/agent';

/**
 * Extended suggestion with confidence, actionable snippet, and provenance
 */
export interface AnalysisSuggestion extends Suggestion {
  confidence: number; // 0.0 to 1.0
  actionableSnippet?: string; // Code snippet or command to fix the issue
  provenance: {
    analyzer: string; // Which analyzer produced this
    layer: number; // Which layer (1, 2, or 3)
    timestamp: number;
  };
}

/**
 * Analysis job context
 */
export interface AnalysisJob {
  id: string;
  commandId: string;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  exitCode: number;
  stdout: string;
  stderr: string;
  events: TerminalObserverEvent[]; // Full event context
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  suggestions: AnalysisSuggestion[];
  error?: string;
}

/**
 * Context window for analysis
 */
export interface AnalysisContext {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  exitCode: number;
  stdout: string;
  stderr: string;
  previousCommands: Array<{
    command: string;
    args: string[];
    exitCode: number;
    timestamp: number;
  }>;
  repoFiles?: string[]; // Relevant files in the repo
}

/**
 * Pluggable analyzer interface
 */
export interface Analyzer {
  name: string;
  layer: number; // 1, 2, or 3
  analyze(context: AnalysisContext, store: EventStore): Promise<AnalysisSuggestion[]>;
}

/**
 * Job queue for background analysis
 */
export class AnalysisJobQueue {
  private jobs: Map<string, AnalysisJob> = new Map();
  private running: Set<string> = new Set();
  private analyzers: Analyzer[] = [];
  private store: EventStore | null = null;
  private maxConcurrentJobs = 1;
  private enableLLM = false; // Gate for LLM/MCP calls

  constructor(store: EventStore | null = null) {
    this.store = store;
  }

  /**
   * Register an analyzer
   */
  registerAnalyzer(analyzer: Analyzer): void {
    this.analyzers.push(analyzer);
    // Sort by layer
    this.analyzers.sort((a, b) => a.layer - b.layer);
  }

  /**
   * Enable or disable LLM/MCP layer
   */
  setLLMEnabled(enabled: boolean): void {
    this.enableLLM = enabled;
  }

  /**
   * Detect failure and enqueue analysis job
   */
  async enqueueFailure(
    commandId: string,
    events: TerminalObserverEvent[],
    store: EventStore
  ): Promise<string | null> {
    // Find command_start, exit_status, and stderr events
    const commandStart = events.find(e => e.type === 'command_start' && e.id === commandId);
    const exitStatus = events.find(e => e.type === 'exit_status' && e.commandId === commandId);
    const stderrChunks = events
      .filter(e => e.type === 'stderr_chunk' && 'commandId' in e && e.commandId === commandId)
      .sort((a, b) => {
        const aIdx = 'chunkIndex' in a ? a.chunkIndex : 0;
        const bIdx = 'chunkIndex' in b ? b.chunkIndex : 0;
        return aIdx - bIdx;
      });
    const stdoutChunks = events
      .filter(e => e.type === 'stdout_chunk' && 'commandId' in e && e.commandId === commandId)
      .sort((a, b) => {
        const aIdx = 'chunkIndex' in a ? a.chunkIndex : 0;
        const bIdx = 'chunkIndex' in b ? b.chunkIndex : 0;
        return aIdx - bIdx;
      });

    if (!commandStart || !exitStatus) {
      return null;
    }

    // Check if it's a failure
    if (exitStatus.type !== 'exit_status' || exitStatus.success) {
      return null; // Not a failure
    }

    // Build context
    const stderr = stderrChunks
      .map(e => ('chunk' in e ? e.chunk : ''))
      .join('');
    const stdout = stdoutChunks
      .map(e => ('chunk' in e ? e.chunk : ''))
      .join('');

    // Get previous commands for context
    const allEvents = await store.getEvents(undefined, undefined, 50);
    const previousCommands = allEvents
      .filter(e => e.type === 'command_start' && e.timestamp < commandStart.timestamp)
      .slice(-5)
      .map(e => {
        if (e.type === 'command_start') {
          const exit = allEvents.find(
            ev => ev.type === 'exit_status' && 'commandId' in ev && ev.commandId === e.id
          );
          return {
            command: e.command,
            args: e.args,
            exitCode: exit && exit.type === 'exit_status' ? exit.exitCode : 0,
            timestamp: e.timestamp,
          };
        }
        return null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const job: AnalysisJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      commandId,
      command: commandStart.command,
      args: commandStart.args,
      cwd: commandStart.cwd,
      env: commandStart.envSummary || {},
      exitCode: exitStatus.exitCode,
      stdout,
      stderr,
      events,
      timestamp: Date.now(),
      status: 'pending',
      suggestions: [],
    };

    this.jobs.set(job.id, job);
    this.processQueue(store);

    return job.id;
  }

  /**
   * Process the job queue (non-blocking)
   */
  private async processQueue(store: EventStore): Promise<void> {
    if (this.running.size >= this.maxConcurrentJobs) {
      return;
    }

    const pendingJob = Array.from(this.jobs.values()).find(j => j.status === 'pending');
    if (!pendingJob) {
      return;
    }

    this.running.add(pendingJob.id);
    pendingJob.status = 'running';

    // Process in background (non-blocking)
    this.runAnalysis(pendingJob, store).catch(error => {
      pendingJob.status = 'failed';
      pendingJob.error = String(error);
      this.running.delete(pendingJob.id);
    });
  }

  /**
   * Run analysis on a job (runs analyzers in layers)
   */
  private async runAnalysis(job: AnalysisJob, store: EventStore): Promise<void> {
    try {
      // Build analysis context
      const context: AnalysisContext = {
        command: job.command,
        args: job.args,
        cwd: job.cwd,
        env: job.env,
        exitCode: job.exitCode,
        stdout: job.stdout,
        stderr: job.stderr,
        previousCommands: await this.getPreviousCommands(job, store),
      };

      // Run analyzers by layer
      const suggestions: AnalysisSuggestion[] = [];

      // Layer 1: Heuristic classifiers
      const layer1Analyzers = this.analyzers.filter(a => a.layer === 1);
      for (const analyzer of layer1Analyzers) {
        try {
          const analyzerSuggestions = await analyzer.analyze(context, store);
          suggestions.push(...analyzerSuggestions);
        } catch (error) {
          console.error(`Analyzer ${analyzer.name} failed:`, error);
        }
      }

      // If we have high-confidence suggestions from layer 1, we might skip layer 2
      const highConfidence = suggestions.filter(s => s.confidence >= 0.8);
      if (highConfidence.length === 0) {
        // Layer 2: Local search
        const layer2Analyzers = this.analyzers.filter(a => a.layer === 2);
        for (const analyzer of layer2Analyzers) {
          try {
            const analyzerSuggestions = await analyzer.analyze(context, store);
            suggestions.push(...analyzerSuggestions);
          } catch (error) {
            console.error(`Analyzer ${analyzer.name} failed:`, error);
          }
        }
      }

      // Layer 3: Optional LLM/MCP (gated)
      if (this.enableLLM) {
        const layer3Analyzers = this.analyzers.filter(a => a.layer === 3);
        for (const analyzer of layer3Analyzers) {
          try {
            const analyzerSuggestions = await analyzer.analyze(context, store);
            suggestions.push(...analyzerSuggestions);
          } catch (error) {
            console.error(`Analyzer ${analyzer.name} failed:`, error);
          }
        }
      }

      job.suggestions = suggestions;
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
    } finally {
      this.running.delete(job.id);
      // Process next job
      this.processQueue(store);
    }
  }

  /**
   * Get previous commands for context
   */
  private async getPreviousCommands(job: AnalysisJob, store: EventStore): Promise<AnalysisContext['previousCommands']> {
    const events = await store.getEvents(undefined, undefined, 50);
    const commandStart = job.events.find(e => e.type === 'command_start' && e.id === job.commandId);
    if (!commandStart) {
      return [];
    }

    return events
      .filter(e => e.type === 'command_start' && e.timestamp < commandStart.timestamp)
      .slice(-5)
      .map(e => {
        if (e.type === 'command_start') {
          const exit = events.find(
            ev => ev.type === 'exit_status' && 'commandId' in ev && ev.commandId === e.id
          );
          return {
            command: e.command,
            args: e.args,
            exitCode: exit && exit.type === 'exit_status' ? exit.exitCode : 0,
            timestamp: e.timestamp,
          };
        }
        return null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): AnalysisJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get the last completed job
   */
  getLastJob(): AnalysisJob | undefined {
    const completed = Array.from(this.jobs.values())
      .filter(j => j.status === 'completed')
      .sort((a, b) => b.timestamp - a.timestamp);
    return completed[0];
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): AnalysisJob[] {
    return Array.from(this.jobs.values());
  }
}

