// OpenAI Provider
// OpenAI API support via API key

import { BaseLLMProvider } from './base';
import type { LLMProviderConfig, MCPToolInput, MCPToolOutput } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: LLMProviderConfig) {
    super(
      config.safety?.requireUserReview ?? true,
      config.safety?.cacheEnabled ?? false,
      config.safety?.cacheTtl ?? 3600
    );
    
    // Get API key from env var
    this.apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }
    
    this.model = config.openai?.model || 'gpt-4o-mini';
    this.baseUrl = config.openai?.baseUrl || 'https://api.openai.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async callLLM(input: MCPToolInput, _sanitized: any): Promise<MCPToolOutput> {
    // Build messages
    const messages = this.buildMessages(input);
    
    // Call OpenAI API
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    
    // Parse response
    return this.parseResponse(text, input, data.usage);
  }

  private buildMessages(input: MCPToolInput): Array<{ role: string; content: string }> {
    const { contextWindow, errorSummary, repoMetadata } = input;
    
    const systemPrompt = `You are a helpful assistant analyzing terminal command failures. Provide actionable suggestions in JSON format.`;
    
    const userPrompt = `Analyze this command failure:

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

Provide 1-3 actionable suggestions in this JSON format:
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
}`;
    
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private parseResponse(text: string, input: MCPToolInput, usage?: any): MCPToolOutput {
    try {
      const parsed = JSON.parse(text);
      
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
          provider: 'openai',
          model: this.model,
          timestamp: Date.now(),
          tokensUsed: usage?.total_tokens,
        },
      };
    } catch (error) {
      // Fallback: create a generic suggestion
      return {
        suggestions: [{
          title: 'LLM Analysis',
          description: text.substring(0, 500),
          confidence: 0.5,
          type: 'tip',
          priority: 'medium',
        }],
        provenance: {
          provider: 'openai',
          model: this.model,
          timestamp: Date.now(),
          tokensUsed: usage?.total_tokens,
        },
      };
    }
  }
}

