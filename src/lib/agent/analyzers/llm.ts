// Layer 3: Optional LLM/MCP Analyzer (Gated)
// Uses LLM or MCP to provide intelligent suggestions

import type { Analyzer, AnalysisContext, AnalysisSuggestion } from '../analysis-pipeline';
import type { EventStore } from '../../core/types';
import type { LLMProvider, LLMProviderConfig, MCPToolInput, RepoMetadata } from '../llm/types';
import { createLLMProvider } from '../llm/providers';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * LLM/MCP analyzer (gated - only runs if enabled)
 */
export class LLMAnalyzer implements Analyzer {
  name = 'llm-analyzer';
  layer = 3;
  private enabled = false;
  private provider: LLMProvider | null = null;
  private config: LLMProviderConfig | null = null;

  constructor(enabled: boolean = false, config?: LLMProviderConfig) {
    this.enabled = enabled;
    this.config = config;
    if (enabled && config) {
      this.provider = createLLMProvider(config);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setConfig(config: LLMProviderConfig): void {
    this.config = config;
    if (this.enabled && config.enabled) {
      this.provider = createLLMProvider(config);
    } else {
      this.provider = null;
    }
  }

  async analyze(context: AnalysisContext, _store: EventStore): Promise<AnalysisSuggestion[]> {
    if (!this.enabled || !this.provider || !this.config) {
      return []; // Gated - don't run if not enabled
    }

    // Check if provider is available
    const available = await this.provider.isAvailable();
    if (!available) {
      console.warn(`LLM provider ${this.config.type} is not available`);
      return [];
    }

    const suggestions: AnalysisSuggestion[] = [];

    try {
      // Build MCP tool input
      const repoMetadata = this.detectRepoMetadata(context.cwd);
      const errorSummary = {
        command: context.command,
        args: context.args,
        exitCode: context.exitCode,
        stderr: context.stderr,
        stdout: context.stdout,
        cwd: context.cwd,
        timestamp: Date.now(),
      };

      const mcpInput: MCPToolInput = {
        contextWindow: context,
        errorSummary,
        repoMetadata,
      };

      // Call LLM provider
      const output = await this.provider.analyze(mcpInput);

      // Convert MCP output to AnalysisSuggestion format
      for (const suggestion of output.suggestions) {
        suggestions.push({
          id: `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: suggestion.type,
          priority: suggestion.priority,
          title: suggestion.title,
          description: suggestion.description,
          confidence: suggestion.confidence,
          actionableSnippet: suggestion.actionableSnippet,
          provenance: {
            analyzer: this.name,
            layer: this.layer,
            timestamp: output.provenance.timestamp,
          },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('LLM analyzer failed:', error);
      // Don't throw - return empty suggestions on error
    }

    return suggestions;
  }

  /**
   * Detect repository metadata from working directory
   */
  private detectRepoMetadata(cwd: string): RepoMetadata {
    const repoRoot = this.findRepoRoot(cwd);
    if (!repoRoot) {
      return {};
    }

    // Detect repo type
    let repoType: RepoMetadata['type'] = 'none';
    if (existsSync(join(repoRoot, '.git'))) {
      repoType = 'git';
    } else if (existsSync(join(repoRoot, '.hg'))) {
      repoType = 'hg';
    } else if (existsSync(join(repoRoot, '.svn'))) {
      repoType = 'svn';
    }

    // Find relevant files
    const files: string[] = [];
    const relevantPatterns = ['flake.nix', '*.nix', 'package.json', 'Cargo.toml', '*.sh'];
    
    for (const pattern of relevantPatterns) {
      // Simple check - in real implementation, would use glob
      if (pattern.includes('*')) {
        // Skip glob patterns for now
        continue;
      }
      if (existsSync(join(repoRoot, pattern))) {
        files.push(pattern);
      }
    }

    // Detect language/framework from common files
    let language: string | undefined;
    let framework: string | undefined;
    
    if (existsSync(join(repoRoot, 'flake.nix')) || existsSync(join(repoRoot, 'default.nix'))) {
      language = 'nix';
    } else     if (existsSync(join(repoRoot, 'package.json'))) {
      language = 'javascript';
      try {
        const pkgContent = readFileSync(join(repoRoot, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgContent);
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          framework = 'react';
        } else if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) {
          framework = 'svelte';
        }
      } catch {
        // Ignore parse errors
      }
    } else if (existsSync(join(repoRoot, 'Cargo.toml'))) {
      language = 'rust';
    }

    return {
      root: repoRoot,
      type: repoType,
      files: files.length > 0 ? files : undefined,
      language,
      framework,
    };
  }

  /**
   * Find repository root by looking for markers
   */
  private findRepoRoot(cwd: string): string | null {
    let current = cwd;
    const maxDepth = 10;
    let depth = 0;

    while (depth < maxDepth) {
      // Check for common repository markers
      if (existsSync(join(current, '.git')) ||
          existsSync(join(current, 'flake.nix')) ||
          existsSync(join(current, '.gitignore'))) {
        return current;
      }

      const parent = dirname(current);
      if (parent === current) {
        break; // Reached filesystem root
      }
      current = parent;
      depth++;
    }

    return null;
  }
}

/**
 * Create LLM analyzer
 */
export function createLLMAnalyzer(enabled: boolean = false, config?: LLMProviderConfig): Analyzer {
  return new LLMAnalyzer(enabled, config);
}

