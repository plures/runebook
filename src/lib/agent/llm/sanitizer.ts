// Context Sanitization for LLM Safety
// Redacts secrets, tokens, and sensitive information before sending to LLM

import type { AnalysisContext, SanitizedContext } from './types';

/**
 * Patterns to redact from context
 */
const SECRET_PATTERNS = [
  // API keys and tokens
  /\b[A-Za-z0-9]{32,}\b/g, // Long alphanumeric strings (likely tokens)
  /\bghp_[A-Za-z0-9]{36,}\b/g, // GitHub personal access tokens
  /\bgho_[A-Za-z0-9]{36,}\b/g, // GitHub OAuth tokens
  /\bghu_[A-Za-z0-9]{36,}\b/g, // GitHub user-to-server tokens
  /\bghs_[A-Za-z0-9]{36,}\b/g, // GitHub server-to-server tokens
  /\bsk-[A-Za-z0-9]{32,}\b/g, // Stripe keys
  /\bpk_[A-Za-z0-9]{32,}\b/g, // Stripe publishable keys
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google API keys
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access keys
  /\b[A-Za-z0-9/+=]{40}\b/g, // Base64 encoded secrets (40+ chars)
  
  // Environment variables that might contain secrets
  /(?:password|passwd|pwd|secret|token|key|api_key|apikey|auth|credential)\s*=\s*['"]?([^'"\s]+)['"]?/gi,
  
  // Private keys
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
  
  // JWT tokens
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

/**
 * Redact a string, replacing secrets with placeholders
 */
function redactString(text: string): { sanitized: string; redactions: Array<{ pattern: string; replaced: string }> } {
  let sanitized = text;
  const redactions: Array<{ pattern: string; replaced: string }> = [];
  
  for (const pattern of SECRET_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0] && match.index !== undefined) {
        const placeholder = `[REDACTED:${match[0].substring(0, 8)}...]`;
        sanitized = sanitized.replace(match[0], placeholder);
        redactions.push({
          pattern: match[0],
          replaced: placeholder,
        });
      }
    }
  }
  
  return { sanitized, redactions };
}

/**
 * Sanitize environment variables
 */
function sanitizeEnv(env: Record<string, string>): { sanitized: Record<string, string>; redactions: Array<{ pattern: string; replaced: string }> } {
  const sanitized: Record<string, string> = {};
  const redactions: Array<{ pattern: string; replaced: string }> = [];
  
  for (const [key, value] of Object.entries(env)) {
    const keyLower = key.toLowerCase();
    // Redact common secret env vars
    if (keyLower.includes('password') || 
        keyLower.includes('secret') || 
        keyLower.includes('token') || 
        keyLower.includes('key') ||
        keyLower.includes('credential') ||
        keyLower.includes('api_key')) {
      sanitized[key] = '[REDACTED]';
      redactions.push({
        pattern: `${key}=${value}`,
        replaced: `${key}=[REDACTED]`,
      });
    } else {
      // Still check value for secrets
      const { sanitized: sanitizedValue, redactions: valueRedactions } = redactString(value);
      sanitized[key] = sanitizedValue;
      redactions.push(...valueRedactions.map(r => ({
        pattern: r.pattern,
        replaced: r.replaced,
      })));
    }
  }
  
  return { sanitized, redactions };
}

/**
 * Sanitize analysis context
 */
export function sanitizeContext(context: AnalysisContext): SanitizedContext {
  // Sanitize environment
  const { sanitized: sanitizedEnv, redactions: envRedactions } = sanitizeEnv(context.env);
  
  // Sanitize stdout and stderr
  const { sanitized: sanitizedStdout, redactions: stdoutRedactions } = redactString(context.stdout);
  const { sanitized: sanitizedStderr, redactions: stderrRedactions } = redactString(context.stderr);
  
  // Sanitize command args (might contain secrets)
  const sanitizedArgs = context.args.map(arg => {
    const { sanitized } = redactString(arg);
    return sanitized;
  });
  
  const sanitized: AnalysisContext = {
    ...context,
    env: sanitizedEnv,
    stdout: sanitizedStdout,
    stderr: sanitizedStderr,
    args: sanitizedArgs,
  };
  
  const redactions = [
    ...envRedactions.map(r => ({ ...r, type: 'env' as const })),
    ...stdoutRedactions.map(r => ({ ...r, type: 'stdout' as const })),
    ...stderrRedactions.map(r => ({ ...r, type: 'stderr' as const })),
  ];
  
  return {
    original: context,
    sanitized,
    redactions,
  };
}

/**
 * Format sanitized context for user review
 */
export function formatContextForReview(sanitized: SanitizedContext): string {
  const lines: string[] = [];
  
  lines.push('=== Context to be sent to LLM ===\n');
  lines.push(`Command: ${sanitized.sanitized.command} ${sanitized.sanitized.args.join(' ')}`);
  lines.push(`CWD: ${sanitized.sanitized.cwd}`);
  lines.push(`Exit Code: ${sanitized.sanitized.exitCode}\n`);
  
  if (sanitized.sanitized.stderr) {
    lines.push(`Stderr (${sanitized.sanitized.stderr.length} chars):`);
    lines.push(sanitized.sanitized.stderr.substring(0, 500));
    if (sanitized.sanitized.stderr.length > 500) {
      lines.push('... (truncated)');
    }
    lines.push('');
  }
  
  if (sanitized.sanitized.stdout) {
    lines.push(`Stdout (${sanitized.sanitized.stdout.length} chars):`);
    lines.push(sanitized.sanitized.stdout.substring(0, 500));
    if (sanitized.sanitized.stdout.length > 500) {
      lines.push('... (truncated)');
    }
    lines.push('');
  }
  
  if (sanitized.redactions.length > 0) {
    lines.push(`\n=== Redactions Applied (${sanitized.redactions.length}) ===`);
    for (const redaction of sanitized.redactions.slice(0, 10)) {
      lines.push(`  [${redaction.type}] ${redaction.pattern.substring(0, 50)}... → ${redaction.replaced}`);
    }
    if (sanitized.redactions.length > 10) {
      lines.push(`  ... and ${sanitized.redactions.length - 10} more`);
    }
  }
  
  return lines.join('\n');
}

