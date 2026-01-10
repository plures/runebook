// Ollama Provider
// Local model support via Ollama API

import { BaseLLMProvider } from './base';
import type { LLMProviderConfig, MCPToolInput, MCPToolOutput } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    super(
      config.safety?.requireUserReview ?? true,
      config.safety?.cacheEnabled ?? false,
      config.safety?.cacheTtl ?? 3600
    );
    this.baseUrl = config.ollama?.baseUrl || 'http://localhost:11434';
    this.model = config.ollama?.model || 'llama3.2';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async callLLM(input: MCPToolInput, _sanitized: any): Promise<MCPToolOutput> {
    // Build prompt
    const prompt = this.buildPrompt(input);
    
    // Call Ollama API
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.response || '';
    
    // Parse response
    return this.parseResponse(text, input);
  }

  private buildPrompt(input: MCPToolInput): string {
    const { contextWindow, errorSummary, repoMetadata } = input;
    
    return `You are a helpful assistant analyzing terminal command failures. Provide actionable suggestions.

Command: ${contextWindow.command} ${contextWindow.args.join(' ')}
Working Directory: ${contextWindow.cwd}
Exit Code: ${contextWindow.exitCode}

Error Output:
${contextWindow.stderr.substring(0, 2000)}

Standard Output:
${contextWindow.stdout.substring(0, 1000)}

Previous Commands:
${contextWindow.previousCommands.slice(-3).map(c => `  ${c.command} ${c.args.join(' ')} (exit: ${c.exitCode})`).join('\n')}

Repository Context:
${repoMetadata.type ? `Type: ${repoMetadata.type}` : 'Unknown'}
${repoMetadata.language ? `Language: ${repoMetadata.language}` : ''}
${repoMetadata.files && repoMetadata.files.length > 0 ? `Relevant files: ${repoMetadata.files.slice(0, 5).join(', ')}` : ''}

Provide 1-3 actionable suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Short title",
      "description": "Detailed explanation",
      "actionableSnippet": "Code or command to fix",
      "confidence": 0.0-1.0,
      "type": "command|optimization|shortcut|warning|tip",
      "priority": "low|medium|high"
    }
  ]
}

Only return valid JSON, no other text.`;
  }

  private parseResponse(text: string, input: MCPToolInput): MCPToolOutput {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Convert to MCPToolOutput format
      const suggestions = (parsed.suggestions || []).map((s: any) => ({
        title: s.title || 'Suggestion',
        description: s.description || '',
        actionableSnippet: s.actionableSnippet,
        confidence: Math.max(0, Math.min(1, s.confidence || 0.5)),
        type: s.type || 'tip',
        priority: s.priority || 'medium',
      }));
      
      return {
        suggestions,
        provenance: {
          provider: 'ollama',
          model: this.model,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      // Fallback: create a generic suggestion from the text
      return {
        suggestions: [{
          title: 'LLM Analysis',
          description: text.substring(0, 500),
          confidence: 0.5,
          type: 'tip',
          priority: 'medium',
        }],
        provenance: {
          provider: 'ollama',
          model: this.model,
          timestamp: Date.now(),
        },
      };
    }
  }
}

