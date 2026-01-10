// LLM Provider Factory
// Creates appropriate provider based on config

import type { LLMProvider, LLMProviderConfig } from '../types';
import { OllamaProvider } from './ollama';
import { OpenAIProvider } from './openai';
import { MockProvider } from './mock';

export { MockProvider, OllamaProvider, OpenAIProvider };

/**
 * Create LLM provider from config
 */
export function createLLMProvider(config: LLMProviderConfig): LLMProvider | null {
  if (!config.enabled) {
    return null;
  }

  switch (config.type) {
    case 'ollama':
      return new OllamaProvider(config);
    
    case 'openai':
      try {
        return new OpenAIProvider(config);
      } catch (error) {
        console.error('Failed to create OpenAI provider:', error);
        return null;
      }
    
    case 'mock':
      return new MockProvider(config);
    
    case 'mcp':
      // TODO: Implement MCP provider
      console.warn('MCP provider not yet implemented');
      return null;
    
    default:
      console.warn(`Unknown LLM provider type: ${config.type}`);
      return null;
  }
}

/**
 * Check if a provider is available
 */
export async function isProviderAvailable(config: LLMProviderConfig): Promise<boolean> {
  if (!config.enabled) {
    return false;
  }

  const provider = createLLMProvider(config);
  if (!provider) {
    return false;
  }

  return await provider.isAvailable();
}

