// Mock Provider for Testing
// Returns deterministic responses for testing

import { BaseLLMProvider } from './base';
import type { LLMProviderConfig, MCPToolInput, MCPToolOutput } from '../types';

export class MockProvider extends BaseLLMProvider {
  name = 'mock';
  private responses: Map<string, MCPToolOutput> = new Map();

  constructor(config: LLMProviderConfig) {
    super(
      config.safety?.requireUserReview ?? false, // Mock doesn't need review
      config.safety?.cacheEnabled ?? false,
      config.safety?.cacheTtl ?? 3600
    );
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  /**
   * Set a mock response for a specific input
   */
  setMockResponse(input: MCPToolInput, output: MCPToolOutput): void {
    const key = this.getInputKey(input);
    this.responses.set(key, output);
  }

  /**
   * Clear all mock responses
   */
  clearMockResponses(): void {
    this.responses.clear();
  }

  async callLLM(input: MCPToolInput, _sanitized: any): Promise<MCPToolOutput> {
    const key = this.getInputKey(input);
    
    // Check if we have a preset response
    if (this.responses.has(key)) {
      return this.responses.get(key)!;
    }
    
    // Default mock response
    return {
      suggestions: [{
        title: 'Mock Suggestion',
        description: `This is a mock suggestion for command: ${input.contextWindow.command}`,
        actionableSnippet: `# Mock fix for ${input.contextWindow.command}`,
        confidence: 0.7,
        type: 'tip',
        priority: 'medium',
      }],
      provenance: {
        provider: 'mock',
        timestamp: Date.now(),
      },
    };
  }

  private getInputKey(input: MCPToolInput): string {
    return `${input.contextWindow.command}_${input.contextWindow.exitCode}_${input.contextWindow.stderr.substring(0, 100)}`;
  }
}

