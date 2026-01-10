// Golden tests for CLI output formatting

import { describe, it, expect } from 'vitest';
import {
  formatSuggestion,
  formatSuggestionsForCLI,
  formatSuggestionCompact,
  formatTopSuggestion,
} from '../suggestions';
import type { Suggestion } from '../../types/agent';

describe('Suggestion Formatting (Golden Tests)', () => {
  const sampleSuggestion: Suggestion = {
    id: 'test-1',
    type: 'warning',
    priority: 'high',
    title: 'Repeated Command Failures',
    description: 'The command "invalid-command" has failed 3 times recently.',
    timestamp: Date.now(),
  };

  const sampleSuggestionWithCommand: Suggestion = {
    id: 'test-2',
    type: 'command',
    priority: 'medium',
    title: 'Similar Successful Command',
    description: 'A similar command succeeded recently.',
    command: 'ls',
    args: ['-la'],
    timestamp: Date.now(),
  };

  const sampleTip: Suggestion = {
    id: 'test-3',
    type: 'tip',
    priority: 'low',
    title: 'Common Arguments',
    description: 'You often use "git" with arguments.',
    command: 'git',
    args: ['status'],
    timestamp: Date.now(),
  };

  describe('formatSuggestion', () => {
    it('should format high priority warning suggestion', () => {
      const output = formatSuggestion(sampleSuggestion);
      expect(output).toContain('⚠️');
      expect(output).toContain('Repeated Command Failures');
      expect(output).toContain('The command "invalid-command" has failed 3 times recently.');
    });

    it('should format suggestion with command', () => {
      const output = formatSuggestion(sampleSuggestionWithCommand);
      expect(output).toContain('⚡');
      expect(output).toContain('Similar Successful Command');
      expect(output).toContain('Command: ls -la');
    });

    it('should format low priority tip', () => {
      const output = formatSuggestion(sampleTip);
      expect(output).toContain('💡');
      expect(output).toContain('Common Arguments');
    });
  });

  describe('formatSuggestionsForCLI', () => {
    it('should return message when no suggestions', () => {
      const output = formatSuggestionsForCLI([]);
      expect(output).toBe('No suggestions available.\n');
    });

    it('should format single suggestion', () => {
      const output = formatSuggestionsForCLI([sampleSuggestion]);
      expect(output).toContain('=== Suggestions (1) ===');
      expect(output).toContain('HIGH PRIORITY:');
      expect(output).toContain('Repeated Command Failures');
    });

    it('should group suggestions by priority', () => {
      const suggestions = [
        sampleSuggestion, // high
        sampleSuggestionWithCommand, // medium
        sampleTip, // low
      ];
      
      const output = formatSuggestionsForCLI(suggestions);
      
      // Check structure
      expect(output).toContain('=== Suggestions (3) ===');
      expect(output).toContain('HIGH PRIORITY:');
      expect(output).toContain('MEDIUM PRIORITY:');
      expect(output).toContain('LOW PRIORITY:');
      
      // Check order (high before medium before low)
      const highIndex = output.indexOf('HIGH PRIORITY:');
      const mediumIndex = output.indexOf('MEDIUM PRIORITY:');
      const lowIndex = output.indexOf('LOW PRIORITY:');
      
      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });

    it('should only show priority sections that have suggestions', () => {
      const output = formatSuggestionsForCLI([sampleSuggestion]);
      expect(output).toContain('HIGH PRIORITY:');
      expect(output).not.toContain('MEDIUM PRIORITY:');
      expect(output).not.toContain('LOW PRIORITY:');
    });
  });

  describe('formatSuggestionCompact', () => {
    it('should format high priority suggestion compactly', () => {
      const output = formatSuggestionCompact(sampleSuggestion);
      expect(output).toBe('⚠ Repeated Command Failures');
    });

    it('should format medium priority suggestion compactly', () => {
      const output = formatSuggestionCompact(sampleSuggestionWithCommand);
      expect(output).toBe('▲ Similar Successful Command');
    });

    it('should format low priority suggestion compactly', () => {
      const output = formatSuggestionCompact(sampleTip);
      expect(output).toBe('• Common Arguments');
    });
  });

  describe('formatTopSuggestion', () => {
    it('should return empty string for null suggestion', () => {
      const output = formatTopSuggestion(null);
      expect(output).toBe('');
    });

    it('should format top suggestion', () => {
      const output = formatTopSuggestion(sampleSuggestion);
      expect(output).toBe('⚠ Repeated Command Failures');
    });
  });

  describe('CLI Output Consistency', () => {
    it('should produce consistent output format', () => {
      const suggestions = [sampleSuggestion, sampleSuggestionWithCommand];
      const output1 = formatSuggestionsForCLI(suggestions);
      const output2 = formatSuggestionsForCLI(suggestions);
      
      // Output should be deterministic
      expect(output1).toBe(output2);
    });

    it('should handle special characters in descriptions', () => {
      const specialSuggestion: Suggestion = {
        id: 'test-special',
        type: 'warning',
        priority: 'high',
        title: 'Test with "quotes"',
        description: 'Description with "quotes" and \'apostrophes\'',
        timestamp: Date.now(),
      };
      
      const output = formatSuggestion(specialSuggestion);
      expect(output).toContain('Test with "quotes"');
      expect(output).toContain('Description with "quotes"');
    });
  });
});

