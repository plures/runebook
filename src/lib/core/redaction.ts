// Secret redaction utilities for terminal observer
// Redacts sensitive information from environment variables and output

/**
 * Default patterns for secret detection
 */
const DEFAULT_SECRET_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /api[_-]?key/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /private[_-]?key/i,
  /credential/i,
  /bearer/i,
  /session[_-]?id/i,
  /cookie/i,
];

/**
 * Redact a value, replacing it with a placeholder
 * @param value - Value to redact
 * @param fullRedaction - If true, always use [REDACTED]; if false, show first/last 4 chars for long values
 */
export function redactValue(value: string, fullRedaction: boolean = false): string {
  if (!value || value.length === 0) {
    return value;
  }
  
  // If full redaction requested or value is short, use [REDACTED]
  if (fullRedaction || value.length <= 8) {
    return '[REDACTED]';
  }
  
  // For longer values in partial redaction mode, show first 4 and last 4 chars
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Check if a key matches secret patterns
 */
export function isSecretKey(key: string, customPatterns: string[] = []): boolean {
  const allPatterns = [...DEFAULT_SECRET_PATTERNS];
  
  // Add custom patterns as regex
  for (const pattern of customPatterns) {
    try {
      allPatterns.push(new RegExp(pattern, 'i'));
    } catch (e) {
      // Invalid regex pattern, skip
      console.warn(`Invalid secret pattern: ${pattern}`);
    }
  }
  
  return allPatterns.some(pattern => pattern.test(key));
}

/**
 * Sanitize environment variables by redacting secrets
 */
export function sanitizeEnv(
  env: Record<string, string>,
  customPatterns: string[] = []
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(env)) {
    if (isSecretKey(key, customPatterns)) {
      // Use full redaction for environment variables
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Redact secrets from a string (for stdout/stderr chunks)
 */
export function redactSecretsFromText(
  text: string,
  customPatterns: string[] = []
): string {
  if (!text) {
    return text;
  }
  
  // Common patterns for secrets in output
  const outputPatterns = [
    /(token|secret|password|api[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*([^\s\n]{8,})/gi,
    /(Bearer|bearer)\s+([A-Za-z0-9\-._~+/]+=*)/g,
    /(-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/gi,
  ];
  
  let redacted = text;
  
  // Apply default patterns
  for (const pattern of outputPatterns) {
    redacted = redacted.replace(pattern, (match, key, value) => {
      if (value) {
        return `${key}=[REDACTED]`;
      }
      return '[REDACTED]';
    });
  }
  
  // Apply custom patterns
  for (const pattern of customPatterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      redacted = redacted.replace(regex, '[REDACTED]');
    } catch (e) {
      // Invalid regex, skip
      console.warn(`Invalid secret pattern: ${pattern}`);
    }
  }
  
  return redacted;
}

/**
 * Validate that redaction is working correctly
 */
export function validateRedaction(): boolean {
  const testEnv = {
    PATH: '/usr/bin:/usr/local/bin',
    HOME: '/home/user',
    API_KEY: 'sk-1234567890abcdef',
    TOKEN: 'secret-token-value',
    NORMAL_VAR: 'normal-value',
  };
  
  const sanitized = sanitizeEnv(testEnv);
  
  // Check that secrets are redacted
  if (sanitized.API_KEY === testEnv.API_KEY) {
    return false;
  }
  
  if (sanitized.TOKEN === testEnv.TOKEN) {
    return false;
  }
  
  // Check that non-secrets are preserved
  if (sanitized.PATH !== testEnv.PATH) {
    return false;
  }
  
  if (sanitized.HOME !== testEnv.HOME) {
    return false;
  }
  
  return true;
}

