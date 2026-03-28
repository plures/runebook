// RuneBook TUI — terminal-based UI for headless/SSH usage

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import type { Canvas, CanvasNode, TerminalNode } from '../types/canvas';
import { parseCanvasFromYAML, saveCanvasToYAML } from '../utils/yaml-loader';

// ─── Box-drawing characters ───────────────────────────────────────────────────

const BOX = {
  h: '─',
  v: '│',
  tl: '┌',
  tr: '┐',
  bl: '└',
  br: '┘',
  // Selected (double-line)
  sh: '═',
  sv: '║',
  stl: '╔',
  str: '╗',
  sbl: '╚',
  sbr: '╝',
};

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const A = {
  clear: '\x1b[2J',
  home: '\x1b[H',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reverse: '\x1b[7m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

function at(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

function pad(s: string, w: number): string {
  if (s.length >= w) return s.substring(0, w);
  return s + ' '.repeat(w - s.length);
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const BOX_W = 18; // Node box width in terminal cells
const BOX_H = 4; // Node box height in terminal cells
const VMAX = 1200; // Max canvas coordinate for scaling

// ─── Types ────────────────────────────────────────────────────────────────────

type TUIMode = 'normal' | 'run';

interface TUIState {
  canvas: Canvas | null;
  selectedIndex: number;
  mode: TUIMode;
  filePath: string | null;
  message: string;
  terminalOutput: string[];
}

export interface TUIOptions {
  filePath?: string;
  /** Inject a custom output stream (useful for testing) */
  output?: NodeJS.WritableStream;
}

// ─── TUIApp ───────────────────────────────────────────────────────────────────

export class TUIApp extends EventEmitter {
  private state: TUIState;
  private out: NodeJS.WritableStream;
  private _exiting = false;
  private _stdinHandler: ((data: Buffer | string) => void) | null = null;
  private _resizeHandler: (() => void) | null = null;
  private _activeProc: ReturnType<typeof spawn> | null = null;

  constructor(options: TUIOptions = {}) {
    super();
    this.out = options.output ?? process.stdout;
    this.state = {
      canvas: null,
      selectedIndex: 0,
      mode: 'normal',
      filePath: options.filePath ?? null,
      message: '',
      terminalOutput: [],
    };
  }

  // ── Canvas I/O ──────────────────────────────────────────────────────────────

  /** Load a canvas from a YAML file path */
  loadFromFile(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    this.state.canvas = parseCanvasFromYAML(content);
    this.state.filePath = filePath;
    this.state.message = `Loaded: ${filePath}`;
  }

  /** Save the current canvas to YAML */
  saveToFile(filePath?: string): void {
    const target = filePath ?? this.state.filePath;
    if (!this.state.canvas || !target) {
      this.state.message = 'No file path — provide a path via: runebook --tui <canvas.yaml>';
      return;
    }
    const yamlStr = saveCanvasToYAML(this.state.canvas);
    writeFileSync(target, yamlStr, 'utf-8');
    this.state.message = `Saved: ${target}`;
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  get nodes(): CanvasNode[] {
    return this.state.canvas?.nodes ?? [];
  }

  get selectedNode(): CanvasNode | null {
    return this.nodes[this.state.selectedIndex] ?? null;
  }

  get mode(): TUIMode {
    return this.state.mode;
  }

  get message(): string {
    return this.state.message;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  selectNext(): void {
    if (this.nodes.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.nodes.length;
  }

  selectPrev(): void {
    if (this.nodes.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex - 1 + this.nodes.length) %
      this.nodes.length;
  }

  // ── Node operations ─────────────────────────────────────────────────────────

  /** Delete the currently selected node and its connections */
  deleteSelected(): void {
    if (!this.state.canvas || this.nodes.length === 0) return;
    const node = this.selectedNode;
    if (!node) return;
    this.state.canvas.nodes = this.state.canvas.nodes.filter((n) => n.id !== node.id);
    this.state.canvas.connections = this.state.canvas.connections.filter(
      (c) => c.from !== node.id && c.to !== node.id,
    );
    if (this.state.selectedIndex >= this.nodes.length) {
      this.state.selectedIndex = Math.max(0, this.nodes.length - 1);
    }
    this.state.message = `Deleted: ${node.label || node.id}`;
  }

  // ── Terminal execution ──────────────────────────────────────────────────────

  /** Run the selected node's command. Supports terminal nodes. */
  async runSelected(): Promise<void> {
    if (this._activeProc) {
      this.state.message = 'A process is already running — press c to clear output';
      this.render();
      return;
    }

    const node = this.selectedNode;
    if (!node) {
      this.state.message = 'No node selected';
      this.render();
      return;
    }

    if (node.type !== 'terminal') {
      this.state.message =
        `Cannot run node of type "${node.type}" — only terminal nodes are runnable`;
      this.render();
      return;
    }

    const termNode = node as TerminalNode;
    if (!termNode.command) {
      this.state.message = 'Terminal node has no command configured';
      this.render();
      return;
    }

    this.state.mode = 'run';
    this.state.terminalOutput = [];
    this.state.message = `Running: ${termNode.command}`;
    this.render();

    try {
      await new Promise<void>((resolve, reject) => {
        const args = termNode.args ?? [];
        const command = termNode.command;
        // Use shell mode only when no separate args are provided *and* the command
        // appears to be a shell expression (e.g. contains pipes, redirects, etc.).
        const needsShell = args.length === 0 && /[|&;<>()$`\\]/.test(command);
        const proc = spawn(command, args, {
          cwd: termNode.cwd || undefined,
          env: termNode.env ? { ...process.env, ...termNode.env } : process.env,
          shell: needsShell,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        this._activeProc = proc;

        const pushLine = (line: string) => {
          this.state.terminalOutput.push(line);
          this.render();
        };

        let stdoutBuf = '';
        proc.stdout?.on('data', (chunk: Buffer) => {
          stdoutBuf += chunk.toString('utf-8');
          const lines = stdoutBuf.split(/\r?\n/);
          stdoutBuf = lines.pop() ?? '';
          for (const line of lines) pushLine(line);
        });

        let stderrBuf = '';
        proc.stderr?.on('data', (chunk: Buffer) => {
          stderrBuf += chunk.toString('utf-8');
          const lines = stderrBuf.split(/\r?\n/);
          stderrBuf = lines.pop() ?? '';
          for (const line of lines) pushLine(`[err] ${line}`);
        });

        proc.on('close', (code) => {
          // Flush remaining partial lines
          if (stdoutBuf) pushLine(stdoutBuf);
          if (stderrBuf) pushLine(`[err] ${stderrBuf}`);
          this._activeProc = null;
          this.state.mode = 'normal';
          this.state.message = `Process exited with code ${code ?? 'unknown'}`;
          this.render();
          resolve();
        });

        proc.on('error', (err) => {
          this._activeProc = null;
          this.state.mode = 'normal';
          this.state.message = `Process error: ${err.message}`;
          this.render();
          reject(err);
        });
      });
    } catch {
      // Error already handled in the 'error' event handler above
    }
  }

  // ── Keyboard input ──────────────────────────────────────────────────────────

  /** Handle a raw keypress. `key` is the UTF-8 decoded sequence; `raw` is the original bytes. */
  handleKey(key: string, _raw: Buffer): void {
    switch (key) {
      case '\x03': // Ctrl+C
      case 'q':
        this.quit();
        break;
      case '\t': // Tab
      case '\x1b[C': // Right arrow
        this.selectNext();
        this.render();
        break;
      case '\x1b[A': // Up arrow
      case '\x1b[D': // Left arrow
        this.selectPrev();
        this.render();
        break;
      case '\x1b[B': // Down arrow
        this.selectNext();
        this.render();
        break;
      case 'd':
        this.deleteSelected();
        this.render();
        break;
      case '\x13': // Ctrl+S
        this.saveToFile();
        this.render();
        break;
      case 'r':
        void this.runSelected();
        break;
      case 'c':
        this.state.terminalOutput = [];
        this.render();
        break;
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  /** Render the full TUI screen. Safe to call at any time. */
  render(): void {
    const out = this.out as NodeJS.WritableStream & { columns?: number; rows?: number };
    const cols: number = out.columns ?? (process.stdout as NodeJS.WriteStream).columns ?? 80;
    const rows: number = out.rows ?? (process.stdout as NodeJS.WriteStream).rows ?? 24;
    const contentH = Math.max(1, rows - 1); // reserve 1 row for status bar

    // Proportional pane widths
    const listW = Math.max(10, Math.floor(cols * 0.2));
    const propsW = Math.max(10, Math.floor(cols * 0.3));
    const canvasW = Math.max(10, cols - listW - propsW);

    const nodeList = this.buildNodeList(listW, contentH);
    const canvasLines = this.buildCanvas(canvasW, contentH);
    const props = this.state.mode === 'run' || this.state.terminalOutput.length > 0
      ? this.buildOutput(propsW, contentH)
      : this.buildProperties(propsW, contentH);

    // Status bar
    const modeStr = this.state.mode.toUpperCase();
    const selectedLabel = this.selectedNode?.label ?? '(none)';
    const canvasName = this.state.canvas?.name ?? 'New Canvas';
    const statusLeft = `  ${modeStr}  │  ${canvasName}  │  ${selectedLabel}`;
    const shortcuts = ' q:Quit  r:Run  d:Del  ^S:Save  Tab:Nav ';
    const gap = Math.max(0, cols - statusLeft.length - shortcuts.length);
    const statusBar = A.bgBlue + A.bold + statusLeft + ' '.repeat(gap) + shortcuts + A.reset;

    const buf: string[] = [A.clear + A.home];
    for (let row = 0; row < contentH; row++) {
      const ll = nodeList[row] ?? ' '.repeat(listW);
      const cl = canvasLines[row] ?? ' '.repeat(canvasW);
      const pl = props[row] ?? ' '.repeat(propsW);
      buf.push(at(row + 1, 1) + ll + BOX.v + cl + BOX.v + pl);
    }
    buf.push(at(rows, 1) + statusBar);

    if (this.state.message) {
      const msg = this.state.message;
      buf.push(at(rows, 1) + A.yellow + A.bold + pad(` ${msg}`, cols) + A.reset);
      this.state.message = '';
    }

    this.out.write(buf.join(''));
  }

  private buildNodeList(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(A.bold + A.cyan + pad(' Nodes', w) + A.reset);
    lines.push(A.dim + BOX.h.repeat(w) + A.reset);

    if (this.nodes.length === 0) {
      lines.push(A.dim + pad(' (empty)', w) + A.reset);
    } else {
      for (let i = 0; i < this.nodes.length; i++) {
        if (lines.length >= h) break;
        const node = this.nodes[i];
        const isSelected = i === this.state.selectedIndex;
        const marker = isSelected ? '>' : ' ';
        const label = `${marker} ${node.label || node.type}`;
        if (isSelected) {
          lines.push(A.reverse + pad(label, w) + A.reset);
        } else {
          lines.push(pad(label, w));
        }
      }
    }

    while (lines.length < h) lines.push(' '.repeat(w));
    return lines;
  }

  private buildCanvas(w: number, h: number): string[] {
    // Initialize grid with spaces
    const grid: string[][] = Array.from({ length: h }, () => Array(w).fill(' '));

    // Draw node boxes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const isSelected = i === this.state.selectedIndex;

      const nx = Math.max(
        0,
        Math.min(Math.floor((node.position.x / VMAX) * (w - BOX_W)), w - BOX_W),
      );
      const ny = Math.max(
        0,
        Math.min(Math.floor((node.position.y / VMAX) * (h - BOX_H)), h - BOX_H),
      );

      const tl = isSelected ? BOX.stl : BOX.tl;
      const tr = isSelected ? BOX.str : BOX.tr;
      const bl = isSelected ? BOX.sbl : BOX.bl;
      const br = isSelected ? BOX.sbr : BOX.br;
      const hc = isSelected ? BOX.sh : BOX.h;
      const vc = isSelected ? BOX.sv : BOX.v;

      // Top border
      this.setCell(grid, ny, nx, tl);
      for (let x = 1; x < BOX_W - 1; x++) this.setCell(grid, ny, nx + x, hc);
      this.setCell(grid, ny, nx + BOX_W - 1, tr);

      // Label row
      const labelStr = pad(` ${node.label || node.type}`, BOX_W - 2);
      this.setCell(grid, ny + 1, nx, vc);
      for (let x = 0; x < BOX_W - 2; x++) this.setCell(grid, ny + 1, nx + 1 + x, labelStr[x]);
      this.setCell(grid, ny + 1, nx + BOX_W - 1, vc);

      // Type row
      const typeStr = pad(` [${node.type}]`, BOX_W - 2);
      this.setCell(grid, ny + 2, nx, vc);
      for (let x = 0; x < BOX_W - 2; x++) this.setCell(grid, ny + 2, nx + 1 + x, typeStr[x]);
      this.setCell(grid, ny + 2, nx + BOX_W - 1, vc);

      // Bottom border
      this.setCell(grid, ny + BOX_H - 1, nx, bl);
      for (let x = 1; x < BOX_W - 1; x++) this.setCell(grid, ny + BOX_H - 1, nx + x, hc);
      this.setCell(grid, ny + BOX_H - 1, nx + BOX_W - 1, br);
    }

    // Draw connections (L-shaped routing)
    for (const conn of (this.state.canvas?.connections ?? [])) {
      const from = this.nodes.find((n) => n.id === conn.from);
      const to = this.nodes.find((n) => n.id === conn.to);
      if (!from || !to) continue;

      const fx = Math.max(
        0,
        Math.min(Math.floor((from.position.x / VMAX) * (w - BOX_W)) + BOX_W / 2, w - 1),
      );
      const fy = Math.max(
        0,
        Math.min(Math.floor((from.position.y / VMAX) * (h - BOX_H)) + BOX_H - 1, h - 1),
      );
      const tx = Math.max(
        0,
        Math.min(Math.floor((to.position.x / VMAX) * (w - BOX_W)) + BOX_W / 2, w - 1),
      );
      const ty = Math.max(0, Math.min(Math.floor((to.position.y / VMAX) * (h - BOX_H)), h - 1));

      const midY = Math.floor((fy + ty) / 2);
      for (let y = Math.min(fy, midY); y <= Math.max(fy, midY); y++) {
        this.setCell(grid, y, Math.floor(fx), BOX.v);
      }
      for (
        let x = Math.min(Math.floor(fx), Math.floor(tx));
        x <= Math.max(Math.floor(fx), Math.floor(tx));
        x++
      ) {
        this.setCell(grid, midY, x, BOX.h);
      }
      for (let y = Math.min(midY, ty); y <= Math.max(midY, ty); y++) {
        this.setCell(grid, y, Math.floor(tx), BOX.v);
      }
      if (ty >= 0) this.setCell(grid, ty, Math.floor(tx), ty >= fy ? '▼' : '▲');
    }

    return grid.map((row) => row.join(''));
  }

  private buildProperties(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(A.bold + A.cyan + pad(' Properties', w) + A.reset);
    lines.push(A.dim + BOX.h.repeat(w) + A.reset);

    const node = this.selectedNode;
    if (!node) {
      lines.push(A.dim + pad(' (none selected)', w) + A.reset);
    } else {
      for (const [k, v] of this.nodeProps(node)) {
        if (lines.length >= h) break;
        lines.push(pad(` ${k}: ${v}`, w));
      }
    }

    while (lines.length < h) lines.push(' '.repeat(w));
    return lines;
  }

  private buildOutput(w: number, h: number): string[] {
    const title = this.state.mode === 'run' ? ' Output (running…)' : ' Output';
    const lines: string[] = [];
    lines.push(A.bold + A.green + pad(title, w) + A.reset);
    lines.push(A.dim + BOX.h.repeat(w) + A.reset);

    // Show the most recent lines that fit
    const outputLines = this.state.terminalOutput;
    const visibleCount = Math.max(0, h - lines.length);
    const startIdx = Math.max(0, outputLines.length - visibleCount);
    for (let i = startIdx; i < outputLines.length; i++) {
      if (lines.length >= h) break;
      lines.push(pad(' ' + outputLines[i], w));
    }

    if (outputLines.length === 0) {
      lines.push(A.dim + pad(' (no output)', w) + A.reset);
    }

    while (lines.length < h) lines.push(' '.repeat(w));
    return lines;
  }

  private nodeProps(node: CanvasNode): [string, string][] {
    const n = node as unknown as Record<string, unknown>;
    const props: [string, string][] = [
      ['ID', node.id.substring(0, 14)],
      ['Type', node.type],
      ['Label', (node.label || '').substring(0, 14)],
      ['X', String(node.position.x)],
      ['Y', String(node.position.y)],
    ];
    if (node.type === 'terminal') {
      const t = node as TerminalNode;
      props.push(['Cmd', (t.command || '').substring(0, 14)]);
      if (t.args?.length) props.push(['Args', t.args.join(' ').substring(0, 14)]);
      if (t.cwd) props.push(['Cwd', t.cwd.substring(0, 14)]);
    }
    if (typeof n['content'] === 'string') {
      props.push(['Content', String(n['content']).substring(0, 14)]);
    }
    return props;
  }

  private setCell(grid: string[][], r: number, c: number, ch: string): void {
    if (r >= 0 && r < grid.length && c >= 0 && c < (grid[r]?.length ?? 0)) {
      grid[r][c] = ch;
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /** Restore terminal state, remove stdin listeners, and emit 'quit'. Idempotent. */
  quit(): void {
    if (this._exiting) return;
    this._exiting = true;
    if (this._activeProc) {
      try {
        this._activeProc.kill();
      } catch { /* ignore */ }
      this._activeProc = null;
    }
    if (this._stdinHandler) {
      process.stdin.removeListener('data', this._stdinHandler);
      this._stdinHandler = null;
    }
    if (this._resizeHandler) {
      process.stdout.removeListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (
      (process.stdin as NodeJS.ReadStream).isTTY &&
      typeof (process.stdin as NodeJS.ReadStream).setRawMode === 'function'
    ) {
      (process.stdin as NodeJS.ReadStream).setRawMode(false);
    }
    process.stdin.pause();
    this.out.write(A.showCursor + A.clear + A.home);
    this.emit('quit');
  }

  /** Start the interactive TUI. Returns a Promise that resolves when the TUI quits. */
  async start(filePath?: string): Promise<void> {
    if (filePath) {
      try {
        this.loadFromFile(filePath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`RuneBook TUI error: ${message}\n`);
        return;
      }
    } else {
      this.state.canvas = {
        id: `canvas-${Date.now()}`,
        name: 'New Canvas',
        nodes: [],
        connections: [],
        version: '1.0.0',
      };
    }

    this.out.write(A.hideCursor);

    const stdin = process.stdin as NodeJS.ReadStream;
    if (stdin.isTTY && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    if (this._stdinHandler) {
      process.stdin.removeListener('data', this._stdinHandler);
    }
    this._stdinHandler = (data: string | Buffer) => {
      const raw = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
      this.handleKey(raw.toString('utf-8'), raw);
    };
    process.stdin.on('data', this._stdinHandler);

    if ((process.stdout as NodeJS.WriteStream).isTTY) {
      // Avoid accumulating multiple resize listeners if start() is called repeatedly
      process.stdout.removeAllListeners('resize');
      this._resizeHandler = () => this.render();
      process.stdout.on('resize', this._resizeHandler);
    }

    try {
      this.render();
      await new Promise<void>((resolve) => {
        this.once('quit', resolve);
      });
    } catch (err) {
      this.quit();
      throw err;
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function launchTUI(filePath?: string): Promise<void> {
  const app = new TUIApp();
  await app.start(filePath);
  console.log('RuneBook TUI exited.');
}
