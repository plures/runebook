// LLM/MCP Integration Types
// Defines contracts for model-backed reasoning

import type { AnalysisContext, AnalysisSuggestion } from '../analysis-pipeline';

/**
 * Repository metadata for context
 */
export interface RepoMetadata {
  root?: string;
  type?: 'git' | 'hg' | 'svn' | 'none';
  files?: string[]; // Relevant files (e.g., *.nix, flake.nix)
  language?: string;
  framework?: string;
}

/**
 * Error summary for LLM context
 */
export interface ErrorSummary {
  command: string;
  args: string[];
  exitCode: number;
  stderr: string;
  stdout: string;
  cwd: string;
  timestamp: number;
}

/**
 * MCP Tool Contract Input
 * What we send to the LLM/MCP provider
 */
export interface MCPToolInput {
  contextWindow: AnalysisContext;
  errorSummary: ErrorSummary;
  repoMetadata: RepoMetadata;
  previousSuggestions?: AnalysisSuggestion[]; // From heuristic/local search layers
}

/**
 * MCP Tool Contract Output
 * What we expect back from the LLM/MCP provider
 */
export interface MCPToolOutput {
  suggestions: Array<{
    title: string;
    description: string;
    actionableSnippet?: string;
    confidence: number; // 0.0 to 1.0
    type: 'command' | 'optimization' | 'shortcut' | 'warning' | 'tip';
    priority: 'low' | 'medium' | 'high';
  }>;
  provenance: {
    provider: string; // 'ollama', 'openai', 'mcp', etc.
    model?: string;
    timestamp: number;
    tokensUsed?: number;
  };
}

/**
 * Sanitized context (after redaction)
 */
export interface SanitizedContext {
  original: AnalysisContext;
  sanitized: AnalysisContext;
  redactions: Array<{
    type: 'env' | 'stdout' | 'stderr' | 'command';
    pattern: string;
    replaced: string;
  }>;
}

// Re-export for convenience
export type { AnalysisContext, AnalysisSuggestion } from '../analysis-pipeline';

/**
 * LLM Provider Configuration
 */
export interface LLMProviderConfig {
  type: 'ollama' | 'openai' | 'mcp' | 'mock';
  enabled: boolean;
  // Ollama config
  ollama?: {
    baseUrl?: string; // Default: http://localhost:11434
    model?: string; // Default: llama3.2
  };
  // OpenAI config
  openai?: {
    apiKey?: string; // From env var OPENAI_API_KEY
    model?: string; // Default: gpt-4o-mini
    baseUrl?: string; // Default: https://api.openai.com/v1
  };
  // MCP config
  mcp?: {
    serverUrl?: string;
    toolName?: string;
  };
  // Safety settings
  safety?: {
    requireUserReview?: boolean; // Show context before sending (default: true)
    maxContextLength?: number; // Truncate if too long (default: 8000 tokens)
    cacheEnabled?: boolean; // Cache responses (default: false)
    cacheTtl?: number; // Cache TTL in seconds (default: 3600)
  };
}

/**
 * LLM Provider Interface
 */
export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  analyze(input: MCPToolInput): Promise<MCPToolOutput>;
  sanitizeContext(context: AnalysisContext): Promise<SanitizedContext>;
}

