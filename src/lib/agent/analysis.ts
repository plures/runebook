// Analysis engine for Ambient Agent Mode
// Analyzes patterns and generates suggestions

import type { TerminalEvent, CommandPattern, Suggestion, EventStorage } from '../types/agent';

export interface Analyzer {
  analyzeEvent(event: TerminalEvent, storage: EventStorage): Promise<Suggestion[]>;
  analyzePatterns(storage: EventStorage): Promise<Suggestion[]>;
}

/**
 * Default analyzer implementation
 */
export class DefaultAnalyzer implements Analyzer {
  async analyzeEvent(event: TerminalEvent, storage: EventStorage): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Check for repeated failures
    if (!event.success) {
      const recentFailures = await storage.getEventsByCommand(event.command, 5);
      const failureCount = recentFailures.filter((e: TerminalEvent) => !e.success).length;
      
      if (failureCount >= 3) {
        suggestions.push({
          id: `suggestion_${Date.now()}_repeated_failure`,
          type: 'warning',
          priority: 'high',
          title: 'Repeated Command Failures',
          description: `The command "${event.command}" has failed ${failureCount} times recently. Consider checking the command syntax or environment.`,
          timestamp: Date.now(),
        });
      }
    }

    // Check for slow commands
    if (event.duration && event.duration > 5000) {
      suggestions.push({
        id: `suggestion_${Date.now()}_slow_command`,
        type: 'optimization',
        priority: 'medium',
        title: 'Slow Command Execution',
        description: `Command "${event.command}" took ${(event.duration / 1000).toFixed(1)}s to execute. Consider optimizing or using a faster alternative.`,
        timestamp: Date.now(),
      });
    }

    // Check for common patterns
    const patterns = await storage.getPatterns();
    const pattern = patterns.find((p: CommandPattern) => p.command === event.command);
    
    if (pattern && pattern.frequency > 5) {
      // Suggest shortcuts for frequently used commands
      if (pattern.commonArgs.length > 0 && event.args.length === 0) {
        suggestions.push({
          id: `suggestion_${Date.now()}_common_args`,
          type: 'tip',
          priority: 'low',
          title: 'Common Arguments',
          description: `You often use "${event.command}" with arguments. Consider creating a shortcut or alias.`,
          command: event.command,
          args: pattern.commonArgs[0].split(' '),
          timestamp: Date.now(),
        });
      }
    }

    // Check for similar successful commands
    if (!event.success) {
      const similarEvents = await storage.getEvents(20);
      const similarSuccessful = similarEvents.filter(
        (e: TerminalEvent) => e.command === event.command && e.success && e.args.length === event.args.length
      );
      
      if (similarSuccessful.length > 0) {
        const lastSuccessful = similarSuccessful[0];
        suggestions.push({
          id: `suggestion_${Date.now()}_similar_success`,
          type: 'command',
          priority: 'medium',
          title: 'Similar Successful Command',
          description: `A similar command succeeded recently. Compare the differences.`,
          command: lastSuccessful.command,
          args: lastSuccessful.args,
          context: {
            previousTimestamp: lastSuccessful.timestamp,
            previousCwd: lastSuccessful.cwd,
          },
          timestamp: Date.now(),
        });
      }
    }

    return suggestions;
  }

  async analyzePatterns(storage: EventStorage): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const patterns = await storage.getPatterns();
    const stats = await storage.getStats();

    // Suggest frequently used commands as shortcuts
    const frequentPatterns = patterns
      .filter((p: CommandPattern) => p.frequency >= 5)
      .sort((a: CommandPattern, b: CommandPattern) => b.frequency - a.frequency)
      .slice(0, 5);

    for (const pattern of frequentPatterns) {
      suggestions.push({
        id: `suggestion_${Date.now()}_frequent_${pattern.id}`,
        type: 'shortcut',
        priority: 'low',
        title: 'Frequently Used Command',
        description: `"${pattern.command}" has been used ${pattern.frequency} times. Consider creating an alias or script.`,
        command: pattern.command,
        timestamp: Date.now(),
      });
    }

    // Suggest optimization for slow commands
    const slowPatterns = patterns
      .filter((p: CommandPattern) => p.avgDuration > 3000)
      .sort((a: CommandPattern, b: CommandPattern) => b.avgDuration - a.avgDuration)
      .slice(0, 3);

    for (const pattern of slowPatterns) {
      suggestions.push({
        id: `suggestion_${Date.now()}_slow_${pattern.id}`,
        type: 'optimization',
        priority: 'medium',
        title: 'Slow Command Pattern',
        description: `"${pattern.command}" averages ${(pattern.avgDuration / 1000).toFixed(1)}s execution time. Consider optimization.`,
        command: pattern.command,
        timestamp: Date.now(),
      });
    }

    // Overall stats suggestions
    if (stats.avgSuccessRate < 0.7) {
      suggestions.push({
        id: `suggestion_${Date.now()}_low_success_rate`,
        type: 'tip',
        priority: 'medium',
        title: 'Low Success Rate',
        description: `Overall command success rate is ${(stats.avgSuccessRate * 100).toFixed(1)}%. Review failed commands for patterns.`,
        timestamp: Date.now(),
      });
    }

    return suggestions;
  }
}

/**
 * Create analyzer instance
 */
export function createAnalyzer(): Analyzer {
  return new DefaultAnalyzer();
}

