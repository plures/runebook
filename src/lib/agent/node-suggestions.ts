// Node.js-only suggestion store with file persistence
// This file should only be imported in Node.js environments (CLI, server)

import type { Suggestion } from '../types/agent';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { MemorySuggestionStore } from './suggestions';

/**
 * File-based persistent suggestion store (Node.js only)
 */
export class FileSuggestionStore extends MemorySuggestionStore {
  private storePath: string;

  constructor(storePath?: string) {
    super();
    this.storePath = storePath || join(homedir(), '.runebook', 'suggestions.json');
  }

  async save(): Promise<void> {
    const configDir = join(homedir(), '.runebook');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    const data = {
      suggestions: this.suggestions,
      lastUpdated: Date.now(),
    };
    
    writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<void> {
    if (existsSync(this.storePath)) {
      try {
        const content = readFileSync(this.storePath, 'utf-8');
        const data = JSON.parse(content);
        if (data.suggestions && Array.isArray(data.suggestions)) {
          this.suggestions = data.suggestions;
        }
      } catch (error) {
        console.error('Failed to load suggestions from file:', error);
      }
    }
  }

  add(suggestion: Suggestion): void {
    super.add(suggestion);
    // Auto-save on add (async, don't wait)
    this.save().catch(err => console.error('Failed to save suggestions:', err));
  }

  remove(id: string): void {
    super.remove(id);
    this.save().catch(err => console.error('Failed to save suggestions:', err));
  }

  clear(): void {
    super.clear();
    this.save().catch(err => console.error('Failed to save suggestions:', err));
  }
}
