// @ts-nocheck
// Zsh shell adapter for terminal observer
// Provides hooks for capturing zsh shell events

import { BaseShellAdapter } from './base';
import type { ShellType, ObserverConfig } from '../types';
import type { EventStore } from '../storage';
import { join } from 'path';
import { homedir } from 'os';

export class ZshAdapter extends BaseShellAdapter {
  private hookScriptPath: string;

  constructor() {
    super();
    this.hookScriptPath = join(homedir(), '.runebook', 'zsh-hook.sh');
  }

  getShellType(): ShellType {
    return 'zsh';
  }

  getHookScript(): string {
    return `
# RuneBook Terminal Observer Hook for Zsh
# Add this to your ~/.zshrc

if [ -n "$RUNBOOK_OBSERVER_ENABLED" ]; then
  # Function to capture command start
  __runebook_capture_start() {
    local cmd="$1"
    local args="${@:2}"
    local cwd="$PWD"
    
    # Call runebook observer API (if available)
    if command -v runebook >/dev/null 2>&1; then
      runebook observer capture-start "$cmd" "$args" "$cwd" &
    fi
  }

  # Function to capture command end
  __runebook_capture_end() {
    local exit_code=$?
    
    if command -v runebook >/dev/null 2>&1; then
      runebook observer capture-end $exit_code &
    fi
    
    return $exit_code
  }

  # Hook into command execution using zsh hooks
  preexec_functions+=(__runebook_capture_start)
  precmd_functions+=(__runebook_capture_end)
fi
`;
  }

  async initialize(config: ObserverConfig, store: EventStore): Promise<void> {
    await super.initialize(config, store);
  }

  async start(): Promise<void> {
    await super.start();
  }

  async stop(): Promise<void> {
    await super.stop();
  }

  /**
   * Programmatic capture - for use when shell hooks are not available
   */
  async captureCommand(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string>
  ): Promise<string> {
    return await this.captureCommandStart(command, args, cwd, env);
  }

  /**
   * Programmatic capture of command result
   */
  async captureCommandResult(
    commandId: string,
    stdout: string,
    stderr: string,
    exitCode: number
  ): Promise<void> {
    const chunkSize = this.config?.chunkSize || 4096;
    
    // Capture stdout chunks
    for (let i = 0; i < stdout.length; i += chunkSize) {
      const chunk = stdout.substring(i, i + chunkSize);
      await this.captureStdoutChunk(commandId, chunk);
    }
    
    // Capture stderr chunks
    for (let i = 0; i < stderr.length; i += chunkSize) {
      const chunk = stderr.substring(i, i + chunkSize);
      await this.captureStderrChunk(commandId, chunk);
    }
    
    await this.captureExitStatus(commandId, exitCode);
    await this.captureCommandEnd(commandId);
  }
}

