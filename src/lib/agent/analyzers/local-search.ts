// Layer 2: Local Search Analyzer
// Uses ripgrep to search repository and config files for relevant patterns

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import type { Analyzer, AnalysisContext, AnalysisSuggestion } from '../analysis-pipeline';
import type { EventStore } from '../../core/types';

/**
 * Local search analyzer using ripgrep
 */
export class LocalSearchAnalyzer implements Analyzer {
  name = 'local-search';
  layer = 2;

  async analyze(context: AnalysisContext, _store: EventStore): Promise<AnalysisSuggestion[]> {
    const suggestions: AnalysisSuggestion[] = [];
    
    // Find repository root (look for .git, flake.nix, etc.)
    const repoRoot = this.findRepoRoot(context.cwd);
    if (!repoRoot) {
      return suggestions; // Not in a repository
    }

    // Search for relevant patterns based on error
    const stderr = context.stderr.toLowerCase();
    
    // Search for missing attributes in Nix files
    if (stderr.includes('attribute') && (stderr.includes('missing') || stderr.includes('undefined'))) {
      const attrMatch = context.stderr.match(/attribute ['"]([^'"]+)['"]/i);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const results = this.searchInRepo(repoRoot, attrName, ['*.nix', 'flake.nix']);
        
        if (results.length > 0) {
          suggestions.push({
            id: `suggestion_${Date.now()}_local_search_attr`,
            type: 'tip',
            priority: 'medium',
            title: 'Found Attribute References',
            description: `Found references to "${attrName}" in your repository. Check these files for context.`,
            confidence: 0.7,
            actionableSnippet: `# Found in files:\n${results.slice(0, 5).map(r => `# - ${r}`).join('\n')}`,
            provenance: {
              analyzer: this.name,
              layer: this.layer,
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Search for template paths in flake-parts
    if (stderr.includes('template') && (stderr.includes('path') || stderr.includes('not found'))) {
      const results = this.searchInRepo(repoRoot, 'template', ['*.nix', 'flake.nix']);
      
      if (results.length > 0) {
        suggestions.push({
          id: `suggestion_${Date.now()}_local_search_template`,
          type: 'tip',
          priority: 'medium',
          title: 'Found Template References',
          description: 'Found template references in your Nix files. Check these for path configuration.',
          confidence: 0.65,
          actionableSnippet: `# Template references found in:\n${results.slice(0, 5).map(r => `# - ${r}`).join('\n')}`,
          provenance: {
            analyzer: this.name,
            layer: this.layer,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
      }
    }

    // Search for environment variable references
    if (context.stderr.includes('TOKEN') || context.stderr.includes('token')) {
      const tokenMatch = context.stderr.match(/([A-Z_]+TOKEN)/);
      if (tokenMatch) {
        const tokenName = tokenMatch[1];
        const results = this.searchInRepo(repoRoot, tokenName, ['*.sh', '*.env', '.env*', '*.nix']);
        
        if (results.length > 0) {
          suggestions.push({
            id: `suggestion_${Date.now()}_local_search_token`,
            type: 'tip',
            priority: 'medium',
            title: 'Found Token References',
            description: `Found references to ${tokenName} in your repository. Check these files for configuration.`,
            confidence: 0.7,
            actionableSnippet: `# ${tokenName} references found in:\n${results.slice(0, 5).map(r => `# - ${r}`).join('\n')}\n\n# Check if ${tokenName} is set:\necho $${tokenName}`,
            provenance: {
              analyzer: this.name,
              layer: this.layer,
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check for flake.nix and suggest checking it
    const flakePath = join(repoRoot, 'flake.nix');
    if (existsSync(flakePath) && stderr.includes('nix')) {
      const flakeContent = readFileSync(flakePath, 'utf-8');
      
      // Check for common issues
      if (stderr.includes('missing') && !flakeContent.includes('inputs')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_local_search_flake`,
          type: 'tip',
          priority: 'medium',
          title: 'Check flake.nix Configuration',
          description: 'Your flake.nix may be missing inputs or outputs. Review the file structure.',
          confidence: 0.6,
          actionableSnippet: `# Review your flake.nix:
cat ${flakePath}

# Common structure:
# {
#   inputs = { ... };
#   outputs = { ... };
# }`,
          provenance: {
            analyzer: this.name,
            layer: this.layer,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
      }
    }

    return suggestions;
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

  /**
   * Search repository using ripgrep (or fallback to grep)
   */
  private searchInRepo(repoRoot: string, pattern: string, filePatterns: string[]): string[] {
    try {
      // Try ripgrep first
      const rgPattern = filePatterns.map(p => `-g "${p}"`).join(' ');
      const command = `rg -l "${pattern}" ${rgPattern} "${repoRoot}" 2>/dev/null || true`;
      const output = execSync(command, { 
        cwd: repoRoot,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024, // 1MB
      });
      
      return output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(repoRoot + '/', ''));
    } catch (error) {
      // Fallback to grep if ripgrep not available
      try {
        const grepPattern = filePatterns.map(p => `--include="${p}"`).join(' ');
        const command = `grep -r -l "${pattern}" ${grepPattern} "${repoRoot}" 2>/dev/null || true`;
        const output = execSync(command, {
          cwd: repoRoot,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024,
        });
        
        return output
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(repoRoot + '/', ''));
      } catch (grepError) {
        // Both failed, return empty
        return [];
      }
    }
  }
}

/**
 * Create local search analyzer
 */
export function createLocalSearchAnalyzer(): Analyzer {
  return new LocalSearchAnalyzer();
}

