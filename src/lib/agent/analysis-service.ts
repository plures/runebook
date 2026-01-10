// Analysis Service - Integrates analysis pipeline with observer
// Monitors observer events and triggers analysis jobs

import { AnalysisJobQueue } from './analysis-pipeline';
import { createHeuristicAnalyzers, createLocalSearchAnalyzer, createLLMAnalyzer } from './analyzers';
import type { TerminalObserverEvent, EventStore } from '../core/types';
import type { ObserverConfig } from '../core/types';

/**
 * Analysis service that monitors observer events and triggers analysis
 */
export class AnalysisService {
  private queue: AnalysisJobQueue;
  private store: EventStore | null = null;
  private config: ObserverConfig | null = null;
  private enabled = false;

  constructor() {
    this.queue = new AnalysisJobQueue();
    this.setupAnalyzers();
  }

  /**
   * Initialize the service with observer store
   */
  initialize(store: EventStore, config: ObserverConfig): void {
    this.store = store;
    this.config = config;
    this.queue = new AnalysisJobQueue(store);
    this.setupAnalyzers();
    
    // Enable LLM if configured
    const llmConfig = config.llm;
    if (llmConfig && llmConfig.enabled) {
      this.queue.setLLMEnabled(true);
    }
  }

  /**
   * Enable or disable the service
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.store !== null;
  }

  /**
   * Setup all analyzers
   */
  private setupAnalyzers(): void {
    // Clear existing
    this.queue = new AnalysisJobQueue(this.store);
    
    // Register Layer 1: Heuristic analyzers
    const heuristicAnalyzers = createHeuristicAnalyzers();
    for (const analyzer of heuristicAnalyzers) {
      this.queue.registerAnalyzer(analyzer);
    }

    // Register Layer 2: Local search
    this.queue.registerAnalyzer(createLocalSearchAnalyzer());

    // Register Layer 3: LLM (gated)
    const llmConfig = this.config?.llm;
    const llmEnabled = llmConfig?.enabled || false;
    this.queue.registerAnalyzer(createLLMAnalyzer(llmEnabled, llmConfig));
    
    // Set LLM enabled state
    this.queue.setLLMEnabled(llmEnabled);
  }

  /**
   * Process exit status event and trigger analysis if failure
   */
  async processExitStatus(event: TerminalObserverEvent): Promise<string | null> {
    if (!this.isEnabled() || !this.store) {
      return null;
    }

    if (event.type !== 'exit_status') {
      return null;
    }

    // Check if it's a failure
    if (event.success) {
      return null; // Not a failure
    }

    // Get all events for this command
    const commandEvents = await this.store.getEventsByCommand(event.commandId);
    
    // Enqueue analysis job
    return await this.queue.enqueueFailure(event.commandId, commandEvents, this.store);
  }

  /**
   * Get the last analysis job
   */
  getLastJob() {
    return this.queue.getLastJob();
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return this.queue.getAllJobs();
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    return this.queue.cancelJob(jobId);
  }

  /**
   * Enable LLM analysis
   */
  setLLMEnabled(enabled: boolean): void {
    this.queue.setLLMEnabled(enabled);
    // Re-register LLM analyzer with new setting
    const llmConfig = this.config?.llm;
    this.setupAnalyzers();
  }

  /**
   * Update LLM configuration
   */
  setLLMConfig(config: ObserverConfig['llm']): void {
    if (this.config) {
      this.config.llm = config;
      this.setupAnalyzers();
    }
  }
}

/**
 * Global analysis service instance
 */
let globalAnalysisService: AnalysisService | null = null;

/**
 * Get or create the global analysis service
 */
export function getAnalysisService(): AnalysisService {
  if (!globalAnalysisService) {
    globalAnalysisService = new AnalysisService();
  }
  return globalAnalysisService;
}

