// resource-management PraxisModule
// Terminal process limits, memory budgets, timeout enforcement, and cleanup
// triggers for RuneBook canvas nodes.

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

/** Context consumed by the resource-management module */
export interface ResourceManagementContext {
  /** Number of active terminal processes */
  terminalCount: number;
  /** Maximum concurrent terminal processes allowed */
  maxTerminals: number;
  /** Current heap memory usage in bytes */
  memoryUsage: number;
  /** Maximum allowed heap memory in bytes (0 = no limit) */
  memoryBudget: number;
  /** Per-node timeout budgets in milliseconds (0 = no limit) */
  timeouts: Record<string, number>;
  /** Nodes that have exceeded their timeout and are awaiting cleanup */
  timedOutNodes: string[];
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Request allocation of a terminal process for a node. */
export const RequestTerminalEvent = defineEvent<
  'REQUEST_TERMINAL',
  { nodeId: string }
>('REQUEST_TERMINAL');

/** Release a terminal process held by a node. */
export const ReleaseTerminalEvent = defineEvent<
  'RELEASE_TERMINAL',
  { nodeId: string }
>('RELEASE_TERMINAL');

/** Update current memory usage snapshot. */
export const UpdateMemoryUsageEvent = defineEvent<
  'UPDATE_MEMORY_USAGE',
  { bytes: number }
>('UPDATE_MEMORY_USAGE');

/** Signal that a node's execution has exceeded its timeout budget. */
export const NodeTimeoutEvent = defineEvent<
  'NODE_TIMEOUT',
  { nodeId: string; elapsedMs: number }
>('NODE_TIMEOUT');

// ---------------------------------------------------------------------------
// Facts (emitted by rules)
// ---------------------------------------------------------------------------

export const TERMINAL_GRANTED_FACT = 'resource.terminal-granted';
export const TERMINAL_DENIED_FACT = 'resource.terminal-denied';
export const TERMINAL_RELEASED_FACT = 'resource.terminal-released';
export const MEMORY_PRESSURE_FACT = 'resource.memory-pressure';
export const CLEANUP_REQUIRED_FACT = 'resource.cleanup-required';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Enforce the maximum concurrent terminal process limit.
 * Grants or denies the request based on the current count.
 *
 * stateRules category — execution lifecycle
 */
const processLimitRule = defineRule<ResourceManagementContext>({
  id: 'resource-management.processLimit',
  description: 'Enforce the maximum number of concurrent terminal processes',
  eventTypes: 'REQUEST_TERMINAL',
  impl: (state, events) => {
    const evt = events.find(RequestTerminalEvent.is);
    if (!evt) return RuleResult.skip('no REQUEST_TERMINAL event');

    if (state.context.terminalCount >= state.context.maxTerminals) {
      return RuleResult.emit([
        fact(TERMINAL_DENIED_FACT, {
          nodeId: evt.payload.nodeId,
          current: state.context.terminalCount,
          max: state.context.maxTerminals,
        }),
      ]);
    }

    state.context.terminalCount += 1;
    return RuleResult.emit([
      fact(TERMINAL_GRANTED_FACT, {
        nodeId: evt.payload.nodeId,
        count: state.context.terminalCount,
      }),
    ]);
  },
});

/**
 * Decrement the active terminal count when a process is released.
 */
const releaseTerminalRule = defineRule<ResourceManagementContext>({
  id: 'resource-management.releaseTerminal',
  description: 'Decrement the active terminal count when a process is released',
  eventTypes: 'RELEASE_TERMINAL',
  impl: (state, events) => {
    const evt = events.find(ReleaseTerminalEvent.is);
    if (!evt) return RuleResult.skip('no RELEASE_TERMINAL event');

    if (state.context.terminalCount > 0) {
      state.context.terminalCount -= 1;
    }

    return RuleResult.emit([
      fact(TERMINAL_RELEASED_FACT, {
        nodeId: evt.payload.nodeId,
        count: state.context.terminalCount,
      }),
    ]);
  },
});

/**
 * Monitor memory usage and emit a pressure fact when the budget is exceeded.
 *
 * dataRules category — resource usage checks
 */
const memoryBudgetRule = defineRule<ResourceManagementContext>({
  id: 'resource-management.memoryBudget',
  description: 'Detect memory pressure when usage exceeds the configured budget',
  eventTypes: 'UPDATE_MEMORY_USAGE',
  impl: (state, events) => {
    const evt = events.find(UpdateMemoryUsageEvent.is);
    if (!evt) return RuleResult.skip('no UPDATE_MEMORY_USAGE event');

    state.context.memoryUsage = evt.payload.bytes;

    const { memoryBudget } = state.context;
    if (memoryBudget > 0 && evt.payload.bytes > memoryBudget) {
      return RuleResult.emit([
        fact(MEMORY_PRESSURE_FACT, {
          usage: evt.payload.bytes,
          budget: memoryBudget,
          overBy: evt.payload.bytes - memoryBudget,
        }),
      ]);
    }

    return RuleResult.noop('memory within budget');
  },
});

/**
 * Record timed-out nodes and trigger cleanup notifications.
 *
 * stateRules category — execution lifecycle
 */
const cleanupTriggerRule = defineRule<ResourceManagementContext>({
  id: 'resource-management.cleanupTrigger',
  description: 'Record node timeout and emit a cleanup-required fact',
  eventTypes: 'NODE_TIMEOUT',
  impl: (state, events) => {
    const evt = events.find(NodeTimeoutEvent.is);
    if (!evt) return RuleResult.skip('no NODE_TIMEOUT event');

    const { nodeId, elapsedMs } = evt.payload;
    if (!state.context.timedOutNodes.includes(nodeId)) {
      state.context.timedOutNodes.push(nodeId);
    }

    return RuleResult.emit([
      fact(CLEANUP_REQUIRED_FACT, {
        nodeId,
        elapsedMs,
        timeout: state.context.timeouts[nodeId] ?? 0,
      }),
    ]);
  },
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

const terminalLimitConstraint = defineConstraint<ResourceManagementContext>({
  id: 'resource-management.terminalLimit',
  description: 'Active terminal count must not exceed the configured maximum',
  check: state =>
    state.context.terminalCount <= state.context.maxTerminals ||
    `Terminal count ${state.context.terminalCount} exceeds max ${state.context.maxTerminals}`,
});

const memoryBudgetConstraint = defineConstraint<ResourceManagementContext>({
  id: 'resource-management.memoryBudgetConstraint',
  description: 'Memory usage must remain within budget when a budget is configured',
  check: state => {
    const { memoryBudget, memoryUsage } = state.context;
    if (memoryBudget === 0) return true;
    return (
      memoryUsage <= memoryBudget ||
      `Memory usage ${memoryUsage} exceeds budget ${memoryBudget}`
    );
  },
});

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const resourceManagementModule: PraxisModule<ResourceManagementContext> = defineModule({
  rules: [processLimitRule, releaseTerminalRule, memoryBudgetRule, cleanupTriggerRule],
  constraints: [terminalLimitConstraint, memoryBudgetConstraint],
  meta: { name: 'resource-management', version: '1.0.0' },
});
