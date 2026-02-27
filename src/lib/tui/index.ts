// RuneBook TUI — terminal-based UI for headless/SSH usage

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import type { Canvas, CanvasNode } from '../types/canvas';
import { saveCanvasToYAML, parseCanvasFromYAML } from '../utils/yaml-loader';

// ─── Box-drawing characters ───────────────────────────────────────────────────

const BOX = {
  h: '─', v: '│',
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  // Selected (double-line)
  sh: '═', sv: '║',
  stl: '╔', str: '╗', sbl: '╚', sbr: '╝',
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
    this.state.selectedIndex =
      (this.state.selectedIndex - 1 + this.nodes.length) % this.nodes.length;
  }

  // ── Node operations ─────────────────────────────────────────────────────────

  /** Delete the currently selected node and its connections */
  deleteSelected(): void {
    if (!this.state.canvas || this.nodes.length === 0) return;
    const node = this.selectedNode;
    if (!node) return;
    this.state.canvas.nodes = this.state.canvas.nodes.filter(n => n.id !== node.id);
    this.state.canvas.connections = this.state.canvas.connections.filter(
      c => c.from !== node.id && c.to !== node.id,
    );
    if (this.state.selectedIndex >= this.nodes.length) {
      this.state.selectedIndex = Math.max(0, this.nodes.length - 1);
    }
    this.state.message = `Deleted: ${node.label || node.id}`;
  }

  // ── Terminal execution ──────────────────────────────────────────────────────

  /** Run the command from the selected terminal node */
  async runSelected(): Promise<void> {
    const node = this.selectedNode;
    if (!node || node.type !== 'terminal') {
      this.state.message = 'Selected node is not a terminal node.';
      this.render();
      return;
    }
    const t = node as any;
    const cmd: string = t.command ?? '';
    const args: string[] = t.args ?? [];
    const cwd: string = t.cwd ?? process.cwd();
    const env: NodeJS.ProcessEnv = { ...process.env, ...(t.env ?? {}) };

    if (!cmd || cmd.trim().length === 0) {
      this.state.message = 'Terminal node has no command configured.';
      this.state.terminalOutput = ['[Error: No command configured for this terminal node.]'];
      this.render();
      return;
    }

    this.state.mode = 'run';
    this.state.terminalOutput = [`$ ${[cmd, ...args].join(' ')}`];
    this.render();

    return new Promise(resolve => {
      let proc;
      try {
        proc = spawn(cmd, args, { cwd, env, shell: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.state.terminalOutput.push(`[Error: ${message}]`);
        this.state.mode = 'normal';
        this.render();
        resolve();
        return;
      }

      this._activeProc = proc;
      let stdoutBuffer = '';
      let stderrBuffer = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = stdoutBuffer + chunk.toString();
        const lines = text.split('\n');
        stdoutBuffer = lines.pop() ?? '';
        this.state.terminalOutput.push(...lines);
        this.render();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = stderrBuffer + chunk.toString();
        const lines = text.split('\n');
        stderrBuffer = lines.pop() ?? '';
        this.state.terminalOutput.push(...lines);
        this.render();
      });

      const done = (code: number | null) => {
        if (stdoutBuffer) {
          this.state.terminalOutput.push(stdoutBuffer);
          stdoutBuffer = '';
        }
        if (stderrBuffer) {
          this.state.terminalOutput.push(stderrBuffer);
          stderrBuffer = '';
        }
        this._activeProc = null;
        this.state.terminalOutput.push(`[Exit: ${code ?? 'unknown'}]`);
        this.state.mode = 'normal';
        this.render();
        resolve();
      };

      proc.on('close', done);
      proc.on('error', (err: Error) => {
        this.state.terminalOutput.push(`[Error: ${err.message}]`);
        done(null);
      });
    });
  }

  // ── Keyboard handler ────────────────────────────────────────────────────────

  /**
   * Handle a raw keypress from stdin.
   * @param key  UTF-8 decoded string of the input bytes
   * @param raw  Raw buffer (used for escape sequences and control chars)
   */
  handleKey(key: string, raw: Buffer): void {
    const hex = raw.toString('hex');

    // Ctrl+C / q → quit
    if (raw[0] === 0x03 || key === 'q') {
      this.quit();
      return;
    }

    // Ctrl+S → save
    if (raw[0] === 0x13) {
      this.saveToFile();
      this.render();
      return;
    }

    // Tab / Shift+Tab → next/prev
    if (raw[0] === 0x09) {
      this.selectNext();
      this.render();
      return;
    }
    if (hex === '1b5b5a') {
      this.selectPrev();
      this.render();
      return;
    }

    // Arrow keys (ESC [ A/B/C/D)
    if (hex === '1b5b41') { this.selectPrev(); this.render(); return; } // ↑
    if (hex === '1b5b42') { this.selectNext(); this.render(); return; } // ↓

    // r → run selected terminal node
    if (key === 'r' && this.state.mode === 'normal') {
      this.runSelected();
      return;
    }

    // d → delete selected node
    if (key === 'd' && this.state.mode === 'normal') {
      this.deleteSelected();
      this.render();
      return;
    }

    // c → clear terminal output
    if (key === 'c' && this.state.terminalOutput.length > 0) {
      this.state.terminalOutput = [];
      this.render();
      return;
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  render(): void {
    const cols: number = (this.out as any).columns ?? 80;
    const rows: number = (this.out as any).rows ?? 24;
    const buf: string[] = [];

    buf.push(A.clear + A.home);

    // ── Header bar ──
    buf.push(at(1, 1));
    buf.push(A.bold + A.bgBlue + A.white + this.buildHeader(cols) + A.reset);

    // ── Three-pane content ──
    const contentRows = rows - 2; // subtract header + status bar
    const borderCols = 4; // left edge + two internal separators + right edge
    const available = Math.max(0, cols - borderCols);
    const baseLeft = 20;
    const baseRight = 25;
    const baseCenterMin = 10;
    let leftW: number, rightW: number, centerW: number;
    if (available >= baseLeft + baseRight + baseCenterMin) {
      leftW = baseLeft;
      rightW = baseRight;
      centerW = available - leftW - rightW;
    } else if (available > 0) {
      const scale = available / (baseLeft + baseRight + baseCenterMin);
      leftW = Math.max(0, Math.floor(baseLeft * scale));
      rightW = Math.max(0, Math.floor(baseRight * scale));
      centerW = Math.max(0, available - leftW - rightW);
    } else {
      leftW = 0; rightW = 0; centerW = 0;
    }

    const nodeList = this.buildNodeList(leftW, contentRows);
    const canvas = this.buildCanvasView(centerW, contentRows);
    const props = this.buildProperties(rightW, contentRows);

    for (let i = 0; i < contentRows; i++) {
      buf.push(at(i + 2, 1));
      buf.push(A.dim + BOX.v + A.reset);
      buf.push(nodeList[i] ?? ' '.repeat(leftW));
      buf.push(A.dim + BOX.v + A.reset);
      buf.push(canvas[i] ?? ' '.repeat(centerW));
      buf.push(A.dim + BOX.v + A.reset);
      buf.push(props[i] ?? ' '.repeat(rightW));
      buf.push(A.dim + BOX.v + A.reset);
    }

    // ── Status bar ──
    buf.push(at(rows, 1));
    buf.push(A.reverse + this.buildStatusBar(cols) + A.reset);

    this.out.write(buf.join(''));
  }

  // ── Private render helpers ──────────────────────────────────────────────────

  private buildHeader(cols: number): string {
    const left = `RuneBook TUI  │  ${this.state.filePath ?? '(no file)'}`;
    const right = `q:quit  Ctrl+S:save  r:run  d:del  Tab:next  c:clr`;
    const gap = Math.max(1, cols - left.length - right.length);
    return pad(left + ' '.repeat(gap) + right, cols);
  }

  private buildStatusBar(cols: number): string {
    const modeStr = `  MODE: ${this.state.mode.toUpperCase()}`;
    const selStr = this.selectedNode
      ? `Selected: ${this.selectedNode.label || this.selectedNode.id}`
      : 'No selection';
    const msgStr = this.state.message ? `  ${this.state.message}` : '';
    const shortcutStr = '↑↓:nav  Tab:next  r:run  q:quit  ';
    const mid = `  │  ${selStr}${msgStr}  │  `;
    const gap = Math.max(0, cols - modeStr.length - mid.length - shortcutStr.length);
    return pad(modeStr + mid + ' '.repeat(gap) + shortcutStr, cols);
  }

  private buildNodeList(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(A.bold + A.cyan + pad(' Nodes', w) + A.reset);
    lines.push(A.dim + BOX.h.repeat(w) + A.reset);

    for (let i = 0; i < this.nodes.length && lines.length < h; i++) {
      const n = this.nodes[i];
      const prefix = i === this.state.selectedIndex ? '▶ ' : '  ';
      const label = pad(prefix + (n.label || n.id), w);
      lines.push(i === this.state.selectedIndex
        ? A.bold + A.green + label + A.reset
        : label);
    }

    if (this.nodes.length === 0) {
      lines.push(A.dim + pad(' (empty canvas)', w) + A.reset);
    }

    while (lines.length < h) lines.push(' '.repeat(w));
    return lines;
  }

  private buildCanvasView(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(A.bold + A.cyan + pad(' Canvas', w) + A.reset);
    lines.push(A.dim + BOX.h.repeat(w) + A.reset);

    // Show terminal output when available
    if (this.state.terminalOutput.length > 0) {
      lines.push(A.bold + pad(' Terminal Output:', w) + A.reset);
      const avail = h - lines.length;
      const start = Math.max(0, this.state.terminalOutput.length - avail);
      for (let i = start; i < this.state.terminalOutput.length && lines.length < h; i++) {
        lines.push(pad(' ' + this.state.terminalOutput[i], w));
      }
    } else {
      // Render nodes as ASCII boxes in the canvas grid
      const gridLines = this.buildNodeGrid(w, h - lines.length);
      for (const gl of gridLines) {
        if (lines.length >= h) break;
        lines.push(gl);
      }
    }

    while (lines.length < h) lines.push(' '.repeat(w));
    return lines;
  }

  private buildNodeGrid(w: number, h: number): string[] {
    const grid: string[][] = Array.from({ length: h }, () => Array(w).fill(' '));

    if (this.nodes.length === 0) {
      const msg = '(empty canvas)';
      const r = Math.floor(h / 2);
      const c = Math.floor((w - msg.length) / 2);
      for (let i = 0; i < msg.length && c + i < w; i++) {
        this.setCell(grid, r, c + i, msg[i]);
      }
      return grid.map(row => row.join(''));
    }

    const BOX_W = 14, BOX_H = 4;
    // Virtual canvas coordinate range
    const VMAX = 1000;

    for (let ni = 0; ni < this.nodes.length; ni++) {
      const node = this.nodes[ni];
      const sel = ni === this.state.selectedIndex;
      const h_ = sel ? BOX.sh : BOX.h;
      const v_ = sel ? BOX.sv : BOX.v;
      const tl = sel ? BOX.stl : BOX.tl;
      const tr = sel ? BOX.str : BOX.tr;
      const bl = sel ? BOX.sbl : BOX.bl;
      const br = sel ? BOX.sbr : BOX.br;

      const gx = Math.max(0, Math.min(
        Math.floor((node.position.x / VMAX) * (w - BOX_W)), w - BOX_W));
      const gy = Math.max(0, Math.min(
        Math.floor((node.position.y / VMAX) * (h - BOX_H)), h - BOX_H));

      // Top border
      this.setCell(grid, gy, gx, tl);
      for (let i = 1; i < BOX_W - 1; i++) this.setCell(grid, gy, gx + i, h_);
      this.setCell(grid, gy, gx + BOX_W - 1, tr);

      // Label row
      this.setCell(grid, gy + 1, gx, v_);
      const labelStr = pad((node.label || node.id).substring(0, BOX_W - 2), BOX_W - 2);
      for (let i = 0; i < labelStr.length; i++) this.setCell(grid, gy + 1, gx + 1 + i, labelStr[i]);
      this.setCell(grid, gy + 1, gx + BOX_W - 1, v_);

      // Type row
      this.setCell(grid, gy + 2, gx, v_);
      const typeStr = pad(node.type.substring(0, BOX_W - 2), BOX_W - 2);
      for (let i = 0; i < typeStr.length; i++) this.setCell(grid, gy + 2, gx + 1 + i, typeStr[i]);
      this.setCell(grid, gy + 2, gx + BOX_W - 1, v_);

      // Bottom border
      this.setCell(grid, gy + BOX_H - 1, gx, bl);
      for (let i = 1; i < BOX_W - 1; i++) this.setCell(grid, gy + BOX_H - 1, gx + i, h_);
      this.setCell(grid, gy + BOX_H - 1, gx + BOX_W - 1, br);
    }

    // Draw connections as simple lines
    for (const conn of this.state.canvas?.connections ?? []) {
      const from = this.nodes.find(n => n.id === conn.from);
      const to = this.nodes.find(n => n.id === conn.to);
      if (!from || !to) continue;

      const fx = Math.max(0, Math.min(Math.floor((from.position.x / VMAX) * (w - BOX_W)) + BOX_W / 2, w - 1));
      const fy = Math.max(0, Math.min(Math.floor((from.position.y / VMAX) * (h - BOX_H)) + BOX_H - 1, h - 1));
      const tx = Math.max(0, Math.min(Math.floor((to.position.x / VMAX) * (w - BOX_W)) + BOX_W / 2, w - 1));
      const ty = Math.max(0, Math.min(Math.floor((to.position.y / VMAX) * (h - BOX_H)), h - 1));

      const midY = Math.floor((fy + ty) / 2);
      for (let y = Math.min(fy, midY); y <= Math.max(fy, midY); y++) this.setCell(grid, y, Math.floor(fx), BOX.v);
      for (let x = Math.min(Math.floor(fx), Math.floor(tx)); x <= Math.max(Math.floor(fx), Math.floor(tx)); x++) {
        this.setCell(grid, midY, x, BOX.h);
      }
      for (let y = Math.min(midY, ty); y <= Math.max(midY, ty); y++) this.setCell(grid, y, Math.floor(tx), BOX.v);
      if (ty >= 0) this.setCell(grid, ty, Math.floor(tx), ty >= fy ? '▼' : '▲');
    }

    return grid.map(row => row.join(''));
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

  private nodeProps(node: CanvasNode): [string, string][] {
    const n = node as any;
    const props: [string, string][] = [
      ['ID', node.id.substring(0, 14)],
      ['Type', node.type],
      ['Label', (node.label || '').substring(0, 14)],
      ['X', String(node.position.x)],
      ['Y', String(node.position.y)],
    ];
    if (node.type === 'terminal') {
      props.push(['Cmd', (n.command ?? '').substring(0, 14)]);
      props.push(['CWD', (n.cwd ?? '.').substring(0, 14)]);
    } else if (node.type === 'input') {
      props.push(['InputType', n.inputType ?? '']);
      props.push(['Value', String(n.value ?? '')]);
    } else if (node.type === 'display') {
      props.push(['DisplayType', n.displayType ?? '']);
    } else if (node.type === 'transform') {
      props.push(['Transform', n.transformType ?? '']);
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
    if ((process.stdin as any).isTTY && typeof (process.stdin as any).setRawMode === 'function') {
      (process.stdin as any).setRawMode(false);
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

    const stdin = process.stdin as any;
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

    if ((process.stdout as any).isTTY) {
      // Avoid accumulating multiple resize listeners if start() is called repeatedly
      process.stdout.removeAllListeners('resize');
      this._resizeHandler = () => this.render();
      process.stdout.on('resize', this._resizeHandler);
    }

    try {
      this.render();
      await new Promise<void>(resolve => {
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
