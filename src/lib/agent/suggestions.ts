// Suggestion rendering and management for Ambient Agent Mode

import type { Suggestion } from '../types/agent';

export interface SuggestionStore {
  suggestions: Suggestion[];
  add(suggestion: Suggestion): void;
  remove(id: string): void;
  clear(): void;
  getByPriority(priority: 'low' | 'medium' | 'high'): Suggestion[];
  getByType(type: Suggestion['type']): Suggestion[];
  getForCommand(command: string): Suggestion[];
  getTop(limit?: number): Suggestion[];
  save(): Promise<void>;
  load(): Promise<void>;
}

/**
 * In-memory suggestion store
 */
export class MemorySuggestionStore implements SuggestionStore {
  suggestions: Suggestion[] = [];

  add(suggestion: Suggestion): void {
    // Avoid duplicates
    if (!this.suggestions.find(s => s.id === suggestion.id)) {
      this.suggestions.push(suggestion);
      // Keep only recent suggestions (last 100)
      if (this.suggestions.length > 100) {
        this.suggestions = this.suggestions.slice(-100);
      }
    }
  }

  remove(id: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== id);
  }

  clear(): void {
    this.suggestions = [];
  }

  getByPriority(priority: 'low' | 'medium' | 'high'): Suggestion[] {
    return this.suggestions.filter(s => s.priority === priority);
  }

  getByType(type: Suggestion['type']): Suggestion[] {
    return this.suggestions.filter(s => s.type === type);
  }

  getForCommand(command: string): Suggestion[] {
    return this.suggestions.filter(s => 
      s.context?.command === command || 
      s.command === command
    );
  }

  getTop(limit: number = 1): Suggestion[] {
    // Sort by priority (high > medium > low) and timestamp (newest first)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sorted = [...this.suggestions].sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });
    return sorted.slice(0, limit);
  }

  async save(): Promise<void> {
    // No-op for in-memory store
  }

  async load(): Promise<void> {
    // No-op for in-memory store
  }
}

/**
 * Format suggestion for display
 */
export function formatSuggestion(suggestion: Suggestion): string {
  const priorityEmoji = {
    low: '💡',
    medium: '⚡',
    high: '⚠️',
  };

  const typeEmoji = {
    command: '▶️',
    optimization: '⚡',
    shortcut: '🔗',
    warning: '⚠️',
    tip: '💡',
  };

  const emoji = `${priorityEmoji[suggestion.priority]} ${typeEmoji[suggestion.type]}`;
  let output = `${emoji} ${suggestion.title}\n`;
  output += `   ${suggestion.description}\n`;
  
  if (suggestion.command) {
    const args = suggestion.args ? suggestion.args.join(' ') : '';
    output += `   Command: ${suggestion.command} ${args}\n`;
  }

  return output;
}

/**
 * Format suggestions for headless/CLI output
 */
export function formatSuggestionsForCLI(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return 'No suggestions available.\n';
  }

  let output = `\n=== Suggestions (${suggestions.length}) ===\n\n`;
  
  // Group by priority
  const high = suggestions.filter(s => s.priority === 'high');
  const medium = suggestions.filter(s => s.priority === 'medium');
  const low = suggestions.filter(s => s.priority === 'low');

  if (high.length > 0) {
    output += 'HIGH PRIORITY:\n';
    high.forEach(s => {
      output += formatSuggestion(s) + '\n';
    });
  }

  if (medium.length > 0) {
    output += 'MEDIUM PRIORITY:\n';
    medium.forEach(s => {
      output += formatSuggestion(s) + '\n';
    });
  }

  if (low.length > 0) {
    output += 'LOW PRIORITY:\n';
    low.forEach(s => {
      output += formatSuggestion(s) + '\n';
    });
  }

  return output;
}

/**
 * Format a single suggestion for compact display (for status lines)
 */
export function formatSuggestionCompact(suggestion: Suggestion): string {
  const prioritySymbol = {
    low: '•',
    medium: '▲',
    high: '⚠',
  };
  
  return `${prioritySymbol[suggestion.priority]} ${suggestion.title}`;
}

/**
 * Format top suggestion for status display
 */
export function formatTopSuggestion(suggestion: Suggestion | null): string {
  if (!suggestion) {
    return '';
  }
  return formatSuggestionCompact(suggestion);
}

