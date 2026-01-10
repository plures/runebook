// Base LLM Provider
// Abstract base class for all LLM providers

import type { LLMProvider, MCPToolInput, MCPToolOutput, SanitizedContext } from '../types';
import { sanitizeContext, formatContextForReview } from '../sanitizer';

/**
 * Base provider implementation
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  protected requireUserReview: boolean = true;
  protected cacheEnabled: boolean = false;
  protected cache: Map<string, { output: MCPToolOutput; timestamp: number }> = new Map();
  protected cacheTtl: number = 3600; // 1 hour default

  constructor(requireUserReview: boolean = true, cacheEnabled: boolean = false, cacheTtl: number = 3600) {
    this.requireUserReview = requireUserReview;
    this.cacheEnabled = cacheEnabled;
    this.cacheTtl = cacheTtl;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract callLLM(input: MCPToolInput, sanitized: SanitizedContext): Promise<MCPToolOutput>;

  /**
   * Sanitize context before sending
   */
  async sanitizeContext(context: MCPToolInput['contextWindow']): Promise<SanitizedContext> {
    return sanitizeContext(context);
  }

  /**
   * Analyze with safety checks
   */
  async analyze(input: MCPToolInput): Promise<MCPToolOutput> {
    // Sanitize context
    const sanitized = await this.sanitizeContext(input.contextWindow);
    
    // Check cache if enabled
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(input, sanitized);
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTtl * 1000) {
        return cached.output;
      }
    }
    
    // User review (if required)
    if (this.requireUserReview) {
      const reviewText = formatContextForReview(sanitized);
      // In CLI mode, we'll log this and wait for confirmation
      // In GUI mode, this would show a dialog
      console.log(reviewText);
      console.log('\n⚠️  Context will be sent to LLM. Review above and confirm.');
      // For now, we'll proceed (in real implementation, this would wait for user input)
    }
    
    // Call LLM with sanitized context
    const sanitizedInput: MCPToolInput = {
      ...input,
      contextWindow: sanitized.sanitized,
    };
    
    const output = await this.callLLM(sanitizedInput, sanitized);
    
    // Cache result if enabled
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(input, sanitized);
      this.cache.set(cacheKey, {
        output,
        timestamp: Date.now(),
      });
    }
    
    return output;
  }

  /**
   * Generate cache key from input
   */
  protected getCacheKey(input: MCPToolInput, sanitized: SanitizedContext): string {
    const key = JSON.stringify({
      command: sanitized.sanitized.command,
      args: sanitized.sanitized.args,
      exitCode: sanitized.sanitized.exitCode,
      stderr: sanitized.sanitized.stderr.substring(0, 500), // First 500 chars
    });
    return Buffer.from(key).toString('base64');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

