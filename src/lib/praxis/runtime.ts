// Praxis runtime — singleton engine instances wired to RuneBook's app lifecycle.
//
// This module creates one engine per Praxis module and provides convenience
// helpers used by Canvas.svelte and TerminalNode.svelte.  All four engines are
// reactive (subscriber-based) so Svelte components can $subscribe or use
// $derived to read their context.

import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';
import {
  canvasValidationModule,
  ValidateConnectionEvent,
  type CanvasValidationContext,
  type NodeDescriptor,
} from './canvas-validation';
import {
  executionPolicyModule,
  ScheduleExecutionEvent,
  CYCLE_DETECTED_FACT,
  EXECUTION_ORDER_FACT,
  type ExecutionPolicyContext,
  type ExecutionEdge,
} from './execution-policy';
import {
  componentRegistryModule,
  RegisterComponentEvent,
  type ComponentRegistryContext,
} from './component-registry';
import {
  resourceManagementModule,
  RequestTerminalEvent,
  ReleaseTerminalEvent,
  type ResourceManagementContext,
} from './resource-management';
import type { CanvasNode, Connection } from '../types/canvas';

// ---------------------------------------------------------------------------
// canvas-validation engine
// ---------------------------------------------------------------------------

const canvasValidationRegistry = new PraxisRegistry<CanvasValidationContext>();
canvasValidationRegistry.registerModule(canvasValidationModule);

/** Singleton engine driving connection-validation rules. */
export const canvasValidationEngine = createPraxisEngine<CanvasValidationContext>({
  initialContext: { nodes: [], pendingConnection: null, validationResult: null },
  registry: canvasValidationRegistry,
});

/**
 * Sync the validation engine's node descriptors to the current canvas state so
 * that subsequent `validateConnection` calls see up-to-date port information.
 */
export function syncValidationNodes(canvasNodes: CanvasNode[]): void {
  const nodes: NodeDescriptor[] = canvasNodes.map(
    (n): NodeDescriptor => ({
      id: n.id,
      inputs: n.inputs.map(p => ({ id: p.id, dataType: p.dataType })),
      outputs: n.outputs.map(p => ({ id: p.id, dataType: p.dataType })),
    }),
  );
  canvasValidationEngine.updateContext(ctx => ({ ...ctx, nodes }));
}

/**
 * Validate a candidate wire connection using the canvas-validation module.
 * Call `syncValidationNodes` first to ensure the engine reflects the current
 * canvas state.
 *
 * @returns `true` when the connection is allowed, `false` when it should be
 *   rejected (e.g. self-loop, type mismatch, unknown node).
 */
export function validateConnection(
  from: string,
  fromPort: string,
  to: string,
  toPort: string,
): boolean {
  canvasValidationEngine.step([
    ValidateConnectionEvent.create({ from, fromPort, to, toPort }),
  ]);
  return canvasValidationEngine.getContext().validationResult?.valid ?? false;
}

// ---------------------------------------------------------------------------
// execution-policy engine
// ---------------------------------------------------------------------------

const executionPolicyRegistry = new PraxisRegistry<ExecutionPolicyContext>();
executionPolicyRegistry.registerModule(executionPolicyModule);

/** Singleton engine driving scheduling and cycle-detection rules. */
export const executionPolicyEngine = createPraxisEngine<ExecutionPolicyContext>({
  initialContext: {
    nodes: [],
    edges: [],
    executionOrder: [],
    hasCycles: false,
    timeouts: {},
    elapsed: {},
  },
  registry: executionPolicyRegistry,
});

/**
 * Recompute the topological execution order for the current canvas graph.
 * Pass the updated canvas nodes and connections whenever the graph changes.
 *
 * @returns The computed execution order array (empty if a cycle is detected).
 */
export function scheduleExecution(canvasNodes: CanvasNode[], connections: Connection[]): string[] {
  const result = executionPolicyEngine.stepWithContext(
    ctx => ({
      ...ctx,
      nodes: canvasNodes.map(n => n.id),
      edges: connections.map((c): ExecutionEdge => ({ from: c.from, to: c.to })),
    }),
    [ScheduleExecutionEvent.create({})],
  );
  const hasCycles = result.state.facts.some(f => f.tag === CYCLE_DETECTED_FACT);
  const orderFact = result.state.facts.find(f => f.tag === EXECUTION_ORDER_FACT);
  return hasCycles ? [] : ((orderFact?.payload as { order?: string[] })?.order ?? []);
}

// ---------------------------------------------------------------------------
// component-registry engine
// ---------------------------------------------------------------------------

const componentRegistryRegistry = new PraxisRegistry<ComponentRegistryContext>();
componentRegistryRegistry.registerModule(componentRegistryModule);

/** Singleton engine driving component-capability and port-compatibility rules. */
export const componentRegistryEngine = createPraxisEngine<ComponentRegistryContext>({
  initialContext: { components: {}, portCompatibilityResult: null },
  registry: componentRegistryRegistry,
});

// Register the five built-in RuneBook component types at module load time.
// Port declarations use `undefined` dataType (any) since each node instance
// may carry typed ports at runtime; type-checking is done per-instance via
// the canvas-validation engine.
const BUILTIN_COMPONENTS = [
  { type: 'text', label: 'Text', ports: [] },
  {
    type: 'terminal',
    label: 'Terminal',
    ports: [{ id: 'stdout', direction: 'output' as const }],
  },
  {
    type: 'input',
    label: 'Input',
    ports: [{ id: 'value', direction: 'output' as const }],
  },
  {
    type: 'display',
    label: 'Display',
    ports: [{ id: 'content', direction: 'input' as const }],
  },
  {
    type: 'transform',
    label: 'Transform',
    ports: [
      { id: 'input', direction: 'input' as const },
      { id: 'output', direction: 'output' as const },
    ],
  },
] as const;

for (const cap of BUILTIN_COMPONENTS) {
  componentRegistryEngine.step([RegisterComponentEvent.create(cap)]);
}

// ---------------------------------------------------------------------------
// resource-management engine
// ---------------------------------------------------------------------------

const resourceManagementRegistry = new PraxisRegistry<ResourceManagementContext>();
resourceManagementRegistry.registerModule(resourceManagementModule);

/** Singleton engine driving terminal process limits and memory budget rules. */
export const resourceManagementEngine = createPraxisEngine<ResourceManagementContext>({
  initialContext: {
    terminalCount: 0,
    maxTerminals: 5,
    memoryUsage: 0,
    memoryBudget: 0,
    timeouts: {},
    timedOutNodes: [],
  },
  registry: resourceManagementRegistry,
});

/**
 * Request a terminal process slot for a node.
 *
 * Uses `stepWithContext` to atomically capture the pre-step terminal count so
 * that we can detect whether a slot was actually granted by comparing the
 * count before and after the rule ran. This avoids the pitfall of checking
 * accumulated facts across steps, where an older `TERMINAL_GRANTED_FACT`
 * from a prior step could produce a false positive.
 *
 * @returns `true` when a slot was granted, `false` when the limit is reached.
 */
export function requestTerminal(nodeId: string): boolean {
  let countBefore = 0;
  const result = resourceManagementEngine.stepWithContext(
    ctx => {
      countBefore = ctx.terminalCount;
      return ctx;
    },
    [RequestTerminalEvent.create({ nodeId })],
  );
  return result.state.context.terminalCount > countBefore;
}

/**
 * Release the terminal process slot held by a node.
 * Always call this after `requestTerminal` returns `true`, even on error.
 */
export function releaseTerminal(nodeId: string): void {
  resourceManagementEngine.step([ReleaseTerminalEvent.create({ nodeId })]);
}
