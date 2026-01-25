#!/usr/bin/env node
// Headless CLI for RuneBook
// SSH-friendly interface without GUI

import { createAgent, defaultAgentConfig } from '../lib/agent/index';
import { formatSuggestionsForCLI, formatSuggestionCompact } from '../lib/agent/suggestions';
import { getAgentStatus, formatStatus } from '../lib/agent/status';
import type { AgentConfig } from '../lib/types/agent';
import { createObserver, type ObserverConfig } from '../lib/core';
import { getAnalysisService } from '../lib/agent/analysis-service';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_FILE = join(homedir(), '.runebook', 'agent-config.json');
const OBSERVER_CONFIG_FILE = join(homedir(), '.runebook', 'observer-config.json');

interface CLIOptions {
  enabled?: boolean;
  storagePath?: string;
  maxEvents?: number;
  retentionDays?: number;
}

/**
 * Load agent configuration from file or use defaults
 */
function loadConfig(): AgentConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return { ...defaultAgentConfig, ...JSON.parse(content) };
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
    }
  }
  return { ...defaultAgentConfig };
}

/**
 * Save agent configuration to file
 */
function saveConfig(config: AgentConfig): void {
  const configDir = join(homedir(), '.runebook');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Initialize agent from CLI
 */
function initAgentFromCLI(options: CLIOptions = {}): void {
  const config = loadConfig();
  const updatedConfig: AgentConfig = {
    ...config,
    enabled: options.enabled !== undefined ? options.enabled : config.enabled,
    storagePath: options.storagePath || config.storagePath,
    maxEvents: options.maxEvents || config.maxEvents,
    retentionDays: options.retentionDays || config.retentionDays,
  };
  
  saveConfig(updatedConfig);
  console.log('Agent configuration updated.');
  console.log('Config:', JSON.stringify(updatedConfig, null, 2));
}

/**
 * Show agent status
 */
async function showStatus(): Promise<void> {
  const config = loadConfig();
  const agent = createAgent(config);
  
  console.log('\n=== Ambient Agent Status ===\n');
  console.log(`Enabled: ${config.enabled ? 'Yes' : 'No'}`);
  console.log(`Capture Events: ${config.captureEvents ? 'Yes' : 'No'}`);
  console.log(`Analyze Patterns: ${config.analyzePatterns ? 'Yes' : 'No'}`);
  console.log(`Suggest Improvements: ${config.suggestImprovements ? 'Yes' : 'No'}`);
  console.log(`Storage Path: ${config.storagePath || 'Memory (in-memory)'}`);
  console.log(`Max Events: ${config.maxEvents || 'Unlimited'}`);
  console.log(`Retention Days: ${config.retentionDays || 'Unlimited'}`);
  
  if (config.enabled) {
    const stats = await agent.getStats();
    console.log('\n=== Statistics ===');
    console.log(`Total Events: ${stats.totalEvents}`);
    console.log(`Unique Commands: ${stats.uniqueCommands}`);
    console.log(`Average Success Rate: ${(stats.avgSuccessRate * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${(stats.totalDuration / 1000).toFixed(1)}s`);
  }
  
  agent.stop();
}

/**
 * Show suggestions
 */
async function showSuggestions(priority?: 'low' | 'medium' | 'high'): Promise<void> {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Agent is not enabled. Run: runebook agent enable');
    return;
  }
  
  const agent = createAgent(config);
  const suggestions = agent.getSuggestionsCLI(priority);
  console.log(suggestions);
  
  // Also analyze patterns for new suggestions
  await agent.analyzeAllPatterns();
  const newSuggestions = agent.getSuggestionsCLI(priority);
  if (newSuggestions !== 'No suggestions available.\n') {
    console.log('\n=== New Pattern-Based Suggestions ===');
    console.log(newSuggestions);
  }
  
  agent.stop();
}

/**
 * Show agent status
 */
function showSuggestStatus(): void {
  const status = getAgentStatus();
  const statusText = formatStatus(status);
  
  console.log(`\n=== Agent Status ===\n`);
  console.log(`Status: ${statusText}`);
  console.log(`Suggestions: ${status.suggestionCount}`);
  console.log(`High Priority: ${status.highPriorityCount}`);
  
  if (status.lastCommand) {
    const date = new Date(status.lastCommandTimestamp || 0).toLocaleString();
    console.log(`Last Command: ${status.lastCommand} (${date})`);
  }
  
  console.log();
}

/**
 * Show top suggestion
 */
async function showTopSuggestion(): Promise<void> {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Agent is not enabled. Run: runebook agent enable');
    return;
  }
  
  const agent = createAgent(config);
  const topSuggestions = agent.getTopSuggestion(1);
  
  if (topSuggestions.length === 0) {
    console.log('No suggestions available.');
    return;
  }
  
  const suggestion = topSuggestions[0];
  console.log(formatSuggestionCompact(suggestion));
  console.log(`\n${suggestion.description}`);
  if (suggestion.command) {
    const args = suggestion.args ? suggestion.args.join(' ') : '';
    console.log(`\nCommand: ${suggestion.command} ${args}`);
  }
  
  agent.stop();
}

/**
 * Show suggestions for last command
 */
async function showLastCommandSuggestions(): Promise<void> {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Agent is not enabled. Run: runebook agent enable');
    return;
  }
  
  const agent = createAgent(config);
  const suggestions = agent.getSuggestionsForLastCommand();
  const status = getAgentStatus();
  
  if (!status.lastCommand) {
    console.log('No command has been executed yet.');
    return;
  }
  
  console.log(`\n=== Suggestions for "${status.lastCommand}" ===\n`);
  
  if (suggestions.length === 0) {
    console.log('No suggestions for this command.');
  } else {
    console.log(formatSuggestionsForCLI(suggestions));
  }
  
  agent.stop();
}

/**
 * Show recent events
 */
async function showEvents(limit: number = 10): Promise<void> {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Agent is not enabled. Run: runebook agent enable');
    return;
  }
  
  const agent = createAgent(config);
  const events = await agent.getRecentEvents(limit);
  
  console.log(`\n=== Recent Events (${events.length}) ===\n`);
  
  for (const event of events) {
    const date = new Date(event.timestamp).toLocaleString();
    const status = event.success ? '✓' : '✗';
    const duration = event.duration ? `${(event.duration / 1000).toFixed(2)}s` : 'N/A';
    const args = event.args.length > 0 ? ` ${event.args.join(' ')}` : '';
    
    console.log(`${status} [${date}] ${event.command}${args}`);
    console.log(`   Duration: ${duration}, Exit Code: ${event.exitCode || 'N/A'}`);
    if (event.cwd) {
      console.log(`   CWD: ${event.cwd}`);
    }
    console.log();
  }
  
  agent.stop();
}

/**
 * Clear old events
 */
async function clearEvents(days: number = 30): Promise<void> {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Agent is not enabled.');
    return;
  }
  
  const agent = createAgent(config);
  await agent.clearOldEvents(days);
  console.log(`Cleared events older than ${days} days.`);
  
  agent.stop();
}

/**
 * Load observer configuration
 */
function loadObserverConfig(): ObserverConfig {
  if (existsSync(OBSERVER_CONFIG_FILE)) {
    try {
      const content = readFileSync(OBSERVER_CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load observer config, using defaults:', error);
    }
  }
  return {
    enabled: false,
    redactSecrets: true,
    usePluresDB: false,
    chunkSize: 4096,
    maxEvents: 10000,
    retentionDays: 30,
  };
}

/**
 * Save observer configuration
 */
function saveObserverConfig(config: ObserverConfig): void {
  const configDir = join(homedir(), '.runebook');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(OBSERVER_CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Tail events (stream events as they come in)
 */
async function tailEvents(follow: boolean = true): Promise<void> {
  const config = loadObserverConfig();
  
  if (!config.enabled) {
    console.log('Observer is not enabled. Run: runebook observer enable');
    return;
  }
  
  const observer = createObserver(config);
  await observer.initialize();
  
  console.log('Tailing events (press Ctrl+C to stop)...\n');
  
  let lastTimestamp = Date.now();
  
  const pollInterval = setInterval(async () => {
    try {
      const events = await observer.getEvents(undefined, lastTimestamp);
      
      for (const event of events) {
        const date = new Date(event.timestamp).toISOString();
        const type = event.type.padEnd(15);
        
        switch (event.type) {
          case 'command_start':
            console.log(`[${date}] ${type} ${event.command} ${event.args.join(' ')}`);
            console.log(`  CWD: ${event.cwd}`);
            break;
          case 'command_end':
            console.log(`[${date}] ${type} commandId: ${event.commandId}, duration: ${event.duration}ms`);
            break;
          case 'stdout_chunk':
            console.log(`[${date}] ${type} [${event.chunkIndex}] ${event.chunk.substring(0, 100)}${event.chunk.length > 100 ? '...' : ''}`);
            break;
          case 'stderr_chunk':
            console.log(`[${date}] ${type} [${event.chunkIndex}] ${event.chunk.substring(0, 100)}${event.chunk.length > 100 ? '...' : ''}`);
            break;
          case 'exit_status':
            console.log(`[${date}] ${type} exitCode: ${event.exitCode}, success: ${event.success}`);
            break;
          default:
            console.log(`[${date}] ${type} ${JSON.stringify(event).substring(0, 100)}`);
        }
        
        lastTimestamp = Math.max(lastTimestamp, event.timestamp);
      }
    } catch (error) {
      console.error('Error tailing events:', error);
    }
  }, 1000); // Poll every second
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(pollInterval);
    observer.stop();
    console.log('\nStopped tailing events.');
    process.exit(0);
  });
  
  if (!follow) {
    // One-time fetch
    setTimeout(() => {
      clearInterval(pollInterval);
      observer.stop();
    }, 5000);
  }
}

/**
 * Show LLM provider status
 */
async function showLLMStatus(): Promise<void> {
  const obsConfig = loadObserverConfig();
  
  console.log('\n=== LLM/MCP Integration Status ===\n');
  
  // Check if llm config exists (extended observer config)
  const llmConfig = (obsConfig as any).llm;
  if (!llmConfig) {
    console.log('Status: Disabled (no configuration)');
    console.log('\nTo enable LLM analysis, add LLM configuration to observer config.');
    console.log('Example:');
    console.log('  {');
    console.log('    "llm": {');
    console.log('      "type": "ollama",');
    console.log('      "enabled": true,');
    console.log('      "ollama": { "model": "llama3.2" }');
    console.log('    }');
    console.log('  }');
    return;
  }
  
  console.log(`Provider Type: ${llmConfig.type}`);
  console.log(`Enabled: ${llmConfig.enabled ? 'Yes' : 'No'}`);
  
  if (!llmConfig.enabled) {
    console.log('\nLLM analysis is configured but disabled.');
    return;
  }
  
  // Check provider availability
  try {
    const { createLLMProvider, isProviderAvailable } = await import('../lib/agent/llm/providers');
    const available = await isProviderAvailable(llmConfig);
    console.log(`Available: ${available ? 'Yes' : 'No'}`);
    
    if (available) {
      const provider = createLLMProvider(llmConfig);
      if (provider) {
        console.log(`Provider: ${provider.name}`);
      }
    } else {
      console.log('\n⚠️  Provider is not available.');
      if (llmConfig.type === 'ollama') {
        console.log('Make sure Ollama is running: ollama serve');
      } else if (llmConfig.type === 'openai') {
        console.log('Make sure OPENAI_API_KEY environment variable is set.');
      }
    }
    
    // Show safety settings
    if (llmConfig.safety) {
      console.log('\n=== Safety Settings ===');
      console.log(`Require User Review: ${llmConfig.safety.requireUserReview !== false ? 'Yes' : 'No'}`);
      console.log(`Cache Enabled: ${llmConfig.safety.cacheEnabled ? 'Yes' : 'No'}`);
      if (llmConfig.safety.cacheEnabled) {
        console.log(`Cache TTL: ${llmConfig.safety.cacheTtl || 3600} seconds`);
      }
      if (llmConfig.safety.maxContextLength) {
        console.log(`Max Context Length: ${llmConfig.safety.maxContextLength} tokens`);
      }
    }
    
    // Show provider-specific config
    console.log('\n=== Provider Configuration ===');
    if (llmConfig.type === 'ollama' && llmConfig.ollama) {
      console.log(`Base URL: ${llmConfig.ollama.baseUrl || 'http://localhost:11434'}`);
      console.log(`Model: ${llmConfig.ollama.model || 'llama3.2'}`);
    } else if (llmConfig.type === 'openai' && llmConfig.openai) {
      const apiKey = llmConfig.openai.apiKey || process.env.OPENAI_API_KEY;
      console.log(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'Not set'}`);
      console.log(`Model: ${llmConfig.openai.model || 'gpt-4o-mini'}`);
      console.log(`Base URL: ${llmConfig.openai.baseUrl || 'https://api.openai.com/v1'}`);
    } else if (llmConfig.type === 'mock') {
      console.log('Mock provider (for testing)');
    } else if (llmConfig.type === 'mcp') {
      console.log('MCP provider (not yet implemented)');
    }
    
  } catch (error: any) {
    console.error('Error checking LLM status:', error.message);
  }
  
  console.log();
}

/**
 * Inspect cognitive memory storage
 */
async function inspectMemory(): Promise<void> {
  try {
    const { SQLiteCompatibleAPI } = await import('pluresdb');
    
    const db = new SQLiteCompatibleAPI({
      config: {
        port: 34567,
        host: 'localhost',
        dataDir: './pluresdb-data',
      },
      autoStart: true,
    });
    
    await db.start();
    
    // List sessions
    const sessionKeys = await db.list('memory:session:');
    const sessions = [];
    for (const key of sessionKeys) {
      try {
        const session = await db.getValue(key);
        if (session) {
          sessions.push(session);
        }
      } catch (error) {
        // Skip errors
      }
    }
    
    // List errors
    const errorKeys = await db.list('memory:error:');
    const errors = [];
    for (const key of errorKeys.slice(0, 10)) {
      try {
        const error = await db.getValue(key);
        if (error) {
          errors.push(error);
        }
      } catch (error) {
        // Skip errors
      }
    }
    
    // List suggestions
    const suggestionKeys = await db.list('memory:suggestion:');
    const suggestions = [];
    for (const key of suggestionKeys.slice(0, 10)) {
      try {
        const suggestion = await db.getValue(key);
        if (suggestion && !suggestion.dismissed) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        // Skip errors
      }
    }
    
    // Sort suggestions by rank
    suggestions.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    
    console.log('\n=== RuneBook Cognitive Memory ===\n');
    console.log(`Sessions: ${sessions.length}`);
    console.log(`Recent Errors: ${errors.length}`);
    console.log(`Active Suggestions: ${suggestions.length}\n`);
    
    if (sessions.length > 0) {
      console.log('=== Recent Sessions ===');
      for (const session of sessions.slice(0, 5)) {
        const started = new Date(session.started_at).toLocaleString();
        console.log(`  ${session.id.substring(0, 8)}... - ${session.shell_type} (started: ${started})`);
      }
      console.log();
    }
    
    if (errors.length > 0) {
      console.log('=== Recent Errors ===');
      for (const error of errors.slice(0, 5)) {
        console.log(`  [${error.severity}] ${error.error_type} - ${error.message.substring(0, 60)}`);
      }
      console.log();
    }
    
    if (suggestions.length > 0) {
      console.log('=== Top Suggestions ===');
      for (const suggestion of suggestions.slice(0, 5)) {
        console.log(`  [${suggestion.priority}] ${suggestion.title} - ${suggestion.description.substring(0, 60)}`);
      }
    }
    
  } catch (error: any) {
    if (error.message && error.message.includes('PluresDB')) {
      console.error('Error: PluresDB server is not available.');
      console.error('Make sure PluresDB is running on localhost:34567');
      console.error('Or use local storage by setting usePluresDB: false in config');
    } else {
      console.error('Error inspecting memory:', error);
    }
  }
}

/**
 * Wipe all cognitive memory storage
 */
async function wipeMemory(): Promise<void> {
  try {
    const { SQLiteCompatibleAPI } = await import('pluresdb');
    
    const db = new SQLiteCompatibleAPI({
      config: {
        port: 34567,
        host: 'localhost',
        dataDir: './pluresdb-data',
      },
      autoStart: true,
    });
    
    await db.start();
    
    // Wipe all memory prefixes (matching Rust API implementation)
    const prefixes = [
      'memory:session:',
      'memory:command:',
      'memory:output:',
      'memory:error:',
      'memory:insight:',
      'memory:suggestion:',
      'memory:provenance:',
      'memory:event:',
    ];
    
    let totalDeleted = 0;
    
    for (const prefix of prefixes) {
      const keys = await db.list(prefix);
      for (const key of keys) {
        try {
          await db.delete(key);
          totalDeleted++;
        } catch (error) {
          console.error(`Failed to delete ${key}:`, error);
        }
      }
    }
    
    console.log(`\n✅ Wiped all memory data (${totalDeleted} items deleted)\n`);
    console.log('Warning: This permanently deleted all stored data.');
    
  } catch (error: any) {
    if (error.message && error.message.includes('PluresDB')) {
      console.error('Error: PluresDB server is not available.');
      console.error('Make sure PluresDB is running on localhost:34567');
    } else {
      console.error('Error wiping memory:', error);
    }
    process.exit(1);
  }
}

/**
 * Show observer events
 */
async function showObserverEvents(limit: number = 10): Promise<void> {
  const config = loadObserverConfig();
  
  if (!config.enabled) {
    console.log('Observer is not enabled. Run: runebook observer enable');
    return;
  }
  
  const observer = createObserver(config);
  await observer.initialize();
  const events = await observer.getEvents(undefined, undefined, limit);
  
  console.log(`\n=== Observer Events (${events.length}) ===\n`);
  
  for (const event of events) {
    const date = new Date(event.timestamp).toISOString();
    console.log(`[${date}] ${event.type}`);
    console.log(`  Session: ${event.sessionId}`);
    console.log(`  Shell: ${event.shellType}`);
    if (event.type === 'command_start') {
      console.log(`  Command: ${event.command} ${event.args.join(' ')}`);
      console.log(`  CWD: ${event.cwd}`);
    }
    console.log();
  }
  
  observer.stop();
}

/**
 * Show analysis results for last failure
 */
async function showLastAnalysis(): Promise<void> {
  const obsConfig = loadObserverConfig();
  
  if (!obsConfig.enabled) {
    console.log('Observer is not enabled. Run: runebook observer enable');
    return;
  }
  
  const observer = createObserver(obsConfig);
  await observer.initialize();
  
  // Get the store from observer (it's created during initialize)
  // We need to access it through the observer's internal state
  // For now, we'll create a new store with the same config
  const { createEventStore } = await import('../lib/core/storage');
  const store = createEventStore(obsConfig);
  
  const analysisService = getAnalysisService();
  analysisService.initialize(store, obsConfig);
  analysisService.setEnabled(true);
  
  // Get last exit_status event that failed
  const events = await observer.getEvents('exit_status', undefined, 50);
  const failures = events.filter(e => e.type === 'exit_status' && !e.success);
  
  if (failures.length === 0) {
    console.log('No recent failures found.');
    observer.stop();
    return;
  }
  
  // Process the most recent failure
  const lastFailure = failures[0];
  const jobId = await analysisService.processExitStatus(lastFailure);
  
  if (!jobId) {
    console.log('Failed to create analysis job.');
    observer.stop();
    return;
  }
  
  // Wait a bit for analysis to complete (non-blocking, but we'll poll)
  let job = analysisService.getJob(jobId);
  let attempts = 0;
  while (job && job.status === 'running' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 500));
    job = analysisService.getJob(jobId);
    attempts++;
  }
  
  job = analysisService.getJob(jobId);
  
  if (!job) {
    console.log('Analysis job not found.');
    observer.stop();
    return;
  }
  
  console.log('\n=== Analysis Results ===\n');
  console.log(`Command: ${job.command} ${job.args.join(' ')}`);
  console.log(`Exit Code: ${job.exitCode}`);
  console.log(`Status: ${job.status}`);
  console.log(`CWD: ${job.cwd}`);
  
  if (job.stderr) {
    console.log(`\nStderr:\n${job.stderr.substring(0, 500)}${job.stderr.length > 500 ? '...' : ''}`);
  }
  
  if (job.suggestions.length === 0) {
    console.log('\nNo suggestions generated.');
  } else {
    console.log(`\n=== Suggestions (${job.suggestions.length}) ===\n`);
    
    for (const suggestion of job.suggestions) {
      console.log(`[${suggestion.provenance.analyzer}] ${suggestion.title} (confidence: ${(suggestion.confidence * 100).toFixed(0)}%)`);
      console.log(`  ${suggestion.description}`);
      if (suggestion.actionableSnippet) {
        console.log(`\n  ${suggestion.actionableSnippet.split('\n').join('\n  ')}`);
      }
      console.log();
    }
  }
  
  observer.stop();
}

/**
 * Main CLI handler
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];
  
  if (!command) {
    console.log(`
RuneBook CLI

Usage:
  runebook <command> [subcommand] [options]

Commands:
  agent <command>     Agent commands (enable, disable, status, suggestions, events, clear, config)
  observer <command>  Observer commands (enable, disable, status, events, tail)
  analyze <command>   Analysis commands (last)
  memory <command>    Memory commands (inspect)
  llm <command>       LLM/MCP commands (status)

Examples:
  runebook agent enable
  runebook agent status
  runebook suggest status
  runebook suggest top
  runebook suggest last
  runebook observer enable
  runebook observer events tail
  runebook observer events 20
  runebook memory inspect
    `);
    process.exit(0);
  }
  
  (async () => {
    try {
      if (command === 'agent') {
        // Agent commands
        if (!subcommand) {
          console.log(`
RuneBook Agent CLI

Usage:
  runebook agent <command> [options]

Commands:
  enable              Enable the agent
  disable             Disable the agent
  status              Show agent status and statistics
  suggestions         Show current suggestions
  events [limit]      Show recent events (default: 10)
  clear [days]        Clear events older than N days (default: 30)
  config <key> <val>  Set configuration option
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'enable':
            initAgentFromCLI({ enabled: true });
            console.log('Agent enabled.');
            break;
            
          case 'disable':
            initAgentFromCLI({ enabled: false });
            console.log('Agent disabled.');
            break;
            
          case 'status':
            await showStatus();
            break;
            
          case 'suggestions':
            const priority = args[2] as 'low' | 'medium' | 'high' | undefined;
            await showSuggestions(priority);
            break;
            
          case 'events':
            const limit = args[2] ? parseInt(args[2], 10) : 10;
            await showEvents(limit);
            break;
            
          case 'clear':
            const days = args[2] ? parseInt(args[2], 10) : 30;
            await clearEvents(days);
            break;
            
          case 'config':
            const key = args[2];
            const value = args[3];
            if (!key || !value) {
              console.error('Usage: runebook agent config <key> <value>');
              process.exit(1);
            }
            const config = loadConfig();
            (config as any)[key] = isNaN(Number(value)) ? value : Number(value);
            saveConfig(config);
            console.log(`Set ${key} = ${value}`);
            break;
            
          default:
            console.error(`Unknown agent command: ${subcommand}`);
            process.exit(1);
        }
      } else if (command === 'observer') {
        // Observer commands
        if (!subcommand) {
          console.log(`
RuneBook Observer CLI

Usage:
  runebook observer <command> [options]

Commands:
  enable              Enable the observer
  disable             Disable the observer
  status              Show observer status
  events [limit]      Show recent events (default: 10)
  events tail         Tail events in real-time
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'enable':
            const obsConfig = loadObserverConfig();
            obsConfig.enabled = true;
            saveObserverConfig(obsConfig);
            console.log('Observer enabled.');
            break;
            
          case 'disable':
            const obsConfig2 = loadObserverConfig();
            obsConfig2.enabled = false;
            saveObserverConfig(obsConfig2);
            console.log('Observer disabled.');
            break;
            
          case 'status':
            const obsConfig3 = loadObserverConfig();
            const observer = createObserver(obsConfig3);
            await observer.initialize();
            const stats = await observer.getStats();
            
            console.log('\n=== Terminal Observer Status ===\n');
            console.log(`Enabled: ${obsConfig3.enabled ? 'Yes' : 'No'}`);
            console.log(`Shell Type: ${obsConfig3.shellType || 'auto-detect'}`);
            console.log(`Redact Secrets: ${obsConfig3.redactSecrets ? 'Yes' : 'No'}`);
            console.log(`Storage: ${obsConfig3.usePluresDB ? 'PluresDB' : 'Local'}`);
            console.log(`Storage Path: ${obsConfig3.storagePath || 'In-memory'}`);
            console.log(`Max Events: ${obsConfig3.maxEvents || 'Unlimited'}`);
            console.log(`Retention Days: ${obsConfig3.retentionDays || 'Unlimited'}`);
            console.log('\n=== Statistics ===');
            console.log(`Total Events: ${stats.totalEvents}`);
            console.log(`Sessions: ${stats.sessions}`);
            console.log(`Events by Type:`);
            for (const [type, count] of Object.entries(stats.eventsByType)) {
              console.log(`  ${type}: ${count}`);
            }
            
            observer.stop();
            break;
            
          case 'events':
            if (args[2] === 'tail') {
              await tailEvents(true);
            } else {
              const limit = args[2] ? parseInt(args[2], 10) : 10;
              await showObserverEvents(limit);
            }
            break;
            
          default:
            console.error(`Unknown observer command: ${subcommand}`);
            process.exit(1);
        }
      } else if (command === 'suggest') {
        // Suggestion commands
        if (!subcommand) {
          console.log(`
RuneBook Suggest CLI

Usage:
  runebook suggest <command>

Commands:
  status              Show current agent status (idle/analyzing/issues found)
  top                 Show top suggestion on demand
  last                Show suggestions for last command

Examples:
  runebook suggest status
  runebook suggest top
  runebook suggest last
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'status':
            showSuggestStatus();
            break;
            
          case 'top':
            await showTopSuggestion();
            break;
            
          case 'last':
            await showLastCommandSuggestions();
            break;
            
          default:
            console.error(`Unknown suggest command: ${subcommand}`);
            process.exit(1);
        }
      } else if (command === 'analyze') {
        // Analysis commands
        if (!subcommand) {
          console.log(`
RuneBook Analysis CLI

Usage:
  runebook analyze <command> [options]

Commands:
  last                Analyze the last command failure
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'last':
            await showLastAnalysis();
            break;
            
          default:
            console.error(`Unknown analyze command: ${subcommand}`);
            process.exit(1);
        }
      } else if (command === 'memory') {
        // Memory commands
        if (!subcommand) {
          console.log(`
RuneBook Memory CLI

Usage:
  runebook memory <command> [options]

Commands:
  inspect              Inspect cognitive memory storage
  wipe                 Wipe all cognitive memory data (permanent deletion)
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'inspect':
            await inspectMemory();
            break;
            
          case 'wipe':
            // Confirm before wiping
            console.log('⚠️  WARNING: This will permanently delete all memory data.');
            console.log('This includes sessions, commands, outputs, errors, insights, suggestions, and provenance.');
            console.log('');
            console.log('To proceed, run: runebook memory wipe --confirm');
            if (args[2] === '--confirm') {
              await wipeMemory();
            } else {
              console.log('\nUse --confirm flag to proceed with deletion.');
            }
            break;
            
          default:
            console.error(`Unknown memory command: ${subcommand}`);
            process.exit(1);
        }
      } else if (command === 'llm') {
        // LLM commands
        if (!subcommand) {
          console.log(`
RuneBook LLM CLI

Usage:
  runebook llm <command> [options]

Commands:
  status               Show LLM provider status and configuration
          `);
          process.exit(0);
        }
        
        switch (subcommand) {
          case 'status':
            await showLLMStatus();
            break;
            
          default:
            console.error(`Unknown llm command: ${subcommand}`);
            process.exit(1);
        }
      } else {
        console.error(`Unknown command: ${command}`);
        console.log('Use "runebook agent", "runebook observer", "runebook suggest", "runebook analyze", "runebook memory", or "runebook llm"');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, loadConfig, saveConfig };

