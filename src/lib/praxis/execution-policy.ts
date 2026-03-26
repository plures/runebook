// execution-policy PraxisModule
// Scheduling rules, cycle detection, and timeout enforcement for the reactive
// execution graph.

import {
  defineEvent,
  defineRule,
  defineConstraint,
  defineModule,
  RuleResult,
  fact,
} from '@plures/praxis';
import type { PraxisModule } from '@plures/praxis';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface ExecutionEdge {
  from: string;
  to: string;
}

/** Context consumed by the execution-policy module */
export interface ExecutionPolicyContext {
  /** All node IDs in the execution graph */
  nodes: string[];
  /** Directed edges representing data-flow dependencies */
  edges: ExecutionEdge[];
  /** Computed topological execution order (populated by scheduling rule) */
  executionOrder: string[];
  /** Whether a cycle has been detected in the graph */
  hasCycles: boolean;
  /** Per-node timeout budgets in milliseconds (0 = no limit) */
  timeouts: Record<string, number>;
  /** Per-node elapsed execution time in milliseconds */
  elapsed: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Request topological scheduling of the execution graph. */
export const ScheduleExecutionEvent = defineEvent<
  'SCHEDULE_EXECUTION',
  { changedNodeId?: string }
>('SCHEDULE_EXECUTION');

/** Explicitly request cycle detection on the current graph. */
export const DetectCyclesEvent = defineEvent<
  'DETECT_CYCLES',
  Record<string, never>
>('DETECT_CYCLES');

/** Report elapsed time for a node after it finishes execution. */
export const ReportElapsedEvent = defineEvent<
  'REPORT_ELAPSED',
  { nodeId: string; elapsedMs: number }
>('REPORT_ELAPSED');

// ---------------------------------------------------------------------------
// Facts (emitted by rules)
// ---------------------------------------------------------------------------

export const EXECUTION_ORDER_FACT = 'execution.order';
export const CYCLE_DETECTED_FACT = 'execution.cycle-detected';
export const TIMEOUT_EXCEEDED_FACT = 'execution.timeout-exceeded';
export const GRAPH_ACYCLIC_FACT = 'execution.graph-acyclic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Kahn's algorithm — returns a topological order or signals a cycle.
 * Returns `{ order, hasCycles }`.
 */
function topologicalSort(
  nodes: string[],
  edges: ExecutionEdge[],
): { order: string[]; hasCycles: boolean } {
  const inDegree = new Map<string, number>(nodes.map(id => [id, 0]));
  const adjacency = new Map<string, string[]>(nodes.map(id => [id, []]));

  for (const { from, to } of edges) {
    adjacency.get(from)?.push(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const queue = nodes.filter(id => (inDegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  // Use an index-based queue to keep dequeue operations O(1).
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i]!;
    order.push(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return { order, hasCycles: order.length !== nodes.length };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Compute a topological execution order for the graph.
 * Also detects cycles as a side-effect of Kahn's algorithm.
 *
 * stateRules category — execution lifecycle
 */
const scheduleExecutionRule = defineRule<ExecutionPolicyContext>({
  id: 'execution-policy.scheduleExecution',
  description: 'Compute topological execution order; detect cycles via Kahn\'s algorithm',
  eventTypes: 'SCHEDULE_EXECUTION',
  impl: (state, events) => {
    const evt = events.find(ScheduleExecutionEvent.is);
    if (!evt) return RuleResult.skip('no SCHEDULE_EXECUTION event');

    const { order, hasCycles } = topologicalSort(state.context.nodes, state.context.edges);
    state.context.executionOrder = order;
    state.context.hasCycles = hasCycles;

    if (hasCycles) {
      return RuleResult.emit([fact(CYCLE_DETECTED_FACT, { triggeredBy: evt.payload.changedNodeId })]);
    }

    return RuleResult.emit([fact(EXECUTION_ORDER_FACT, { order })]);
  },
});

/**
 * Standalone cycle detection — can be triggered without a full scheduling pass.
 *
 * stateRules category — execution lifecycle
 */
const detectCyclesRule = defineRule<ExecutionPolicyContext>({
  id: 'execution-policy.detectCycles',
  description: 'Detect cycles in the execution graph without recomputing order',
  eventTypes: 'DETECT_CYCLES',
  impl: (state, events) => {
    const evt = events.find(DetectCyclesEvent.is);
    if (!evt) return RuleResult.skip('no DETECT_CYCLES event');

    const { hasCycles } = topologicalSort(state.context.nodes, state.context.edges);
    state.context.hasCycles = hasCycles;

    if (hasCycles) {
      return RuleResult.emit([fact(CYCLE_DETECTED_FACT, {})]);
    }

    return RuleResult.emit([fact(GRAPH_ACYCLIC_FACT, {})]);
  },
});

/**
 * Compare a node's elapsed time against its configured timeout budget.
 * Emits a timeout-exceeded fact when the budget is breached.
 *
 * stateRules category — execution lifecycle
 */
const timeoutEnforcementRule = defineRule<ExecutionPolicyContext>({
  id: 'execution-policy.timeoutEnforcement',
  description: 'Enforce per-node execution timeout budgets',
  eventTypes: 'REPORT_ELAPSED',
  impl: (state, events) => {
    const evt = events.find(ReportElapsedEvent.is);
    if (!evt) return RuleResult.skip('no REPORT_ELAPSED event');

    const { nodeId, elapsedMs } = evt.payload;
    state.context.elapsed[nodeId] = elapsedMs;

    const budget = state.context.timeouts[nodeId] ?? 0;
    if (budget > 0 && elapsedMs > budget) {
      return RuleResult.emit([
        fact(TIMEOUT_EXCEEDED_FACT, { nodeId, elapsedMs, budget }),
      ]);
    }

    return RuleResult.noop('within timeout budget');
  },
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

const acyclicGraphConstraint = defineConstraint<ExecutionPolicyContext>({
  id: 'execution-policy.acyclicGraph',
  description: 'The execution graph must be acyclic before scheduling',
  check: state => !state.context.hasCycles || 'Execution graph contains a cycle',
});

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const executionPolicyModule: PraxisModule<ExecutionPolicyContext> = defineModule({
  rules: [scheduleExecutionRule, detectCyclesRule, timeoutEnforcementRule],
  constraints: [acyclicGraphConstraint],
  meta: { name: 'execution-policy', version: '1.0.0' },
});
