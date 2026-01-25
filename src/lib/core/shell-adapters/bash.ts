// @ts-nocheck
// Bash shell adapter for terminal observer
// Provides hooks for capturing bash shell events

import { BaseShellAdapter } from './base';
import type { ShellType, ObserverConfig } from '../types';
import type { EventStore } from '../storage';
import { join } from 'path';
import { homedir } from 'os';

export class BashAdapter extends BaseShellAdapter {
  private hookScriptPath: string;

  constructor() {
    super();
    this.hookScriptPath = join(homedir(), '.runebook', 'bash-hook.sh');
  }

  getShellType(): ShellType {
    return 'bash';
  }

  getHookScript(): string {
    // @ts-ignore - Shell script content, not TypeScript
    return (
      '# RuneBook Terminal Observer Hook for Bash\n' +
      '# Add this to your ~/.bashrc or ~/.bash_profile\n\n' +
      'if [ -n "$RUNBOOK_OBSERVER_ENABLED" ]; then\n' +
      '  # Function to capture command start\n' +
      '  __runebook_capture_start() {\n' +
      '    local cmd="$1"\n' +
      '    local args="${@:2}"\n' +
      '    local cwd="$PWD"\n    \n' +
      '    # Call runebook observer API (if available)\n' +
      '    if command -v runebook >/dev/null 2>&1; then\n' +
      '      runebook observer capture-start "$cmd" "$args" "$cwd" &\n' +
      '    fi\n' +
      '  }\n\n' +
      '  # Function to capture command end\n' +
      '  __runebook_capture_end() {\n' +
      '    local exit_code=$?\n    \n' +
      '    if command -v runebook >/dev/null 2>&1; then\n' +
      '      runebook observer capture-end $exit_code &\n' +
      '    fi\n    \n' +
      '    return $exit_code\n' +
      '  }\n\n' +
      '  # Hook into command execution\n' +
      '  trap \'__runebook_capture_start "$BASH_COMMAND"\' DEBUG\n' +
      '  trap \'__runebook_capture_end\' ERR\n' +
      'fi\n'
    );
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
   * This can be called from Node.js to capture command execution
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
    // Split stdout/stderr into chunks if configured
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
    
    // Capture exit status
    await this.captureExitStatus(commandId, exitCode);
    
    // Capture command end
    await this.captureCommandEnd(commandId);
  }
}

