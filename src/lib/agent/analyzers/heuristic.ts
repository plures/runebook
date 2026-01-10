// Layer 1: Heuristic Classifiers
// Common error patterns: nix errors, git auth, missing attrs, syntax errors

import type { Analyzer, AnalysisContext, AnalysisSuggestion } from '../analysis-pipeline';
import type { EventStore } from '../../core/types';

/**
 * Heuristic analyzer for common Nix errors
 */
export class NixErrorAnalyzer implements Analyzer {
  name = 'nix-error';
  layer = 1;

  async analyze(context: AnalysisContext, _store: EventStore): Promise<AnalysisSuggestion[]> {
    const suggestions: AnalysisSuggestion[] = [];
    const stderr = context.stderr.toLowerCase();
    const stdout = context.stdout.toLowerCase();

    // Missing attribute errors
    if (stderr.includes('attribute') && (stderr.includes('missing') || stderr.includes('undefined'))) {
      const attrMatch = context.stderr.match(/attribute ['"]([^'"]+)['"]/i);
      const attrName = attrMatch ? attrMatch[1] : 'unknown';
      
      suggestions.push({
        id: `suggestion_${Date.now()}_nix_missing_attr`,
        type: 'warning',
        priority: 'high',
        title: 'Missing Nix Attribute',
        description: `The attribute "${attrName}" is not defined. Check your flake.nix or configuration.`,
        confidence: 0.9,
        actionableSnippet: `# Check if "${attrName}" is defined in your flake.nix or imported modules`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // flake-parts template path errors
    if (stderr.includes('template') && (stderr.includes('path') || stderr.includes('not found'))) {
      suggestions.push({
        id: `suggestion_${Date.now()}_flake_parts_template`,
        type: 'warning',
        priority: 'high',
        title: 'Flake-Parts Template Path Error',
        description: 'Template path not found. Check your flake-parts configuration and template paths.',
        confidence: 0.85,
        actionableSnippet: `# Verify template paths in your flake.nix:
# - Check imports.flake-parts.inputs
# - Verify template paths in perSystem or systems`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // buildEnv font conflicts
    if (stderr.includes('font') && (stderr.includes('conflict') || stderr.includes('duplicate'))) {
      suggestions.push({
        id: `suggestion_${Date.now()}_nix_font_conflict`,
        type: 'warning',
        priority: 'medium',
        title: 'Nix buildEnv Font Conflict',
        description: 'Font conflict detected in buildEnv. Multiple packages may be providing the same font.',
        confidence: 0.8,
        actionableSnippet: `# Resolve font conflicts by:
# 1. Use buildEnv with ignoreCollisions = true
# 2. Or use fontconfig to manage font priorities
# 3. Check for duplicate font packages in your configuration`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // Nix evaluation errors
    if (stderr.includes('error:') && (stderr.includes('evaluation') || stderr.includes('nix'))) {
      const errorMatch = context.stderr.match(/error:\s*(.+?)(?:\n|$)/i);
      const errorMsg = errorMatch ? errorMatch[1].trim() : 'Unknown Nix error';
      
      suggestions.push({
        id: `suggestion_${Date.now()}_nix_eval_error`,
        type: 'warning',
        priority: 'high',
        title: 'Nix Evaluation Error',
        description: `Nix evaluation failed: ${errorMsg.substring(0, 100)}`,
        confidence: 0.75,
        actionableSnippet: `# Check your Nix expression for syntax errors
# Common issues:
# - Missing commas in attribute sets
# - Incorrect function calls
# - Type mismatches`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    return suggestions;
  }
}

/**
 * Heuristic analyzer for Git authentication errors
 */
export class GitAuthAnalyzer implements Analyzer {
  name = 'git-auth';
  layer = 1;

  async analyze(context: AnalysisContext, _store: EventStore): Promise<AnalysisSuggestion[]> {
    const suggestions: AnalysisSuggestion[] = [];
    const stderr = context.stderr.toLowerCase();
    const stdout = context.stdout.toLowerCase();
    const combined = stderr + stdout;

    // GitHub rate limit
    if (combined.includes('rate limit') || combined.includes('api rate limit')) {
      suggestions.push({
        id: `suggestion_${Date.now()}_github_rate_limit`,
        type: 'warning',
        priority: 'high',
        title: 'GitHub Rate Limit Exceeded',
        description: 'GitHub API rate limit exceeded. Wait before retrying or use authentication.',
        confidence: 0.95,
        actionableSnippet: `# Set GITHUB_TOKEN environment variable:
export GITHUB_TOKEN=your_token_here

# Or use gh auth login:
gh auth login`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // Git authentication errors
    if (combined.includes('authentication failed') || 
        combined.includes('permission denied') ||
        (combined.includes('git') && combined.includes('auth'))) {
      suggestions.push({
        id: `suggestion_${Date.now()}_git_auth`,
        type: 'warning',
        priority: 'high',
        title: 'Git Authentication Error',
        description: 'Git authentication failed. Check your credentials or token.',
        confidence: 0.9,
        actionableSnippet: `# Check git credentials:
git config --list | grep credential

# Set up authentication:
# For HTTPS: git config --global credential.helper store
# For SSH: ssh-keygen -t ed25519 -C "your_email@example.com"
# For GitHub: gh auth login`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // Token environment variable issues
    if (combined.includes('token') && (combined.includes('not set') || combined.includes('missing'))) {
      const tokenMatch = context.stderr.match(/([A-Z_]+TOKEN|GITHUB_TOKEN|GITLAB_TOKEN)/i);
      const tokenName = tokenMatch ? tokenMatch[1] : 'TOKEN';
      
      suggestions.push({
        id: `suggestion_${Date.now()}_token_env`,
        type: 'warning',
        priority: 'high',
        title: 'Token Environment Variable Missing',
        description: `The ${tokenName} environment variable is not set or is invalid.`,
        confidence: 0.85,
        actionableSnippet: `# Set the token environment variable:
export ${tokenName}=your_token_here

# Or add to your shell profile:
echo 'export ${tokenName}=your_token_here' >> ~/.bashrc  # or ~/.zshrc`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    return suggestions;
  }
}

/**
 * Heuristic analyzer for syntax errors
 */
export class SyntaxErrorAnalyzer implements Analyzer {
  name = 'syntax-error';
  layer = 1;

  async analyze(context: AnalysisContext, _store: EventStore): Promise<AnalysisSuggestion[]> {
    const suggestions: AnalysisSuggestion[] = [];
    const stderr = context.stderr.toLowerCase();
    const combined = context.stderr + context.stdout;

    // Common syntax error patterns
    if (stderr.includes('syntax error') || stderr.includes('parse error')) {
      // Try to extract file and line number
      const fileMatch = combined.match(/([^\s:]+):(\d+):/);
      const file = fileMatch ? fileMatch[1] : 'unknown';
      const line = fileMatch ? fileMatch[2] : 'unknown';
      
      suggestions.push({
        id: `suggestion_${Date.now()}_syntax_error`,
        type: 'warning',
        priority: 'high',
        title: 'Syntax Error Detected',
        description: `Syntax error in ${file} at line ${line}. Check the file for syntax issues.`,
        confidence: 0.8,
        actionableSnippet: `# Check ${file} at line ${line}:
# - Missing brackets, braces, or parentheses
# - Incorrect indentation
# - Missing semicolons or commas
# - Unclosed strings or comments`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    // Missing command/executable
    if (stderr.includes('command not found') || stderr.includes('not found')) {
      const cmdMatch = context.stderr.match(/['"]?([^\s'"]+)['"]?\s+not found/i);
      const cmd = cmdMatch ? cmdMatch[1] : 'command';
      
      suggestions.push({
        id: `suggestion_${Date.now()}_command_not_found`,
        type: 'warning',
        priority: 'medium',
        title: 'Command Not Found',
        description: `The command "${cmd}" is not found in your PATH.`,
        confidence: 0.9,
        actionableSnippet: `# Install the missing command or check your PATH:
which ${cmd}
echo $PATH

# For Nix users:
nix-shell -p ${cmd}
# Or add to your flake.nix`,
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    return suggestions;
  }
}

/**
 * Create all heuristic analyzers
 */
export function createHeuristicAnalyzers(): Analyzer[] {
  return [
    new NixErrorAnalyzer(),
    new GitAuthAnalyzer(),
    new SyntaxErrorAnalyzer(),
  ];
}

