// canvas-validation PraxisModule
// Node connection rules, wire type compatibility, and canvas state consistency.

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

export interface PortDescriptor {
  id: string;
  dataType?: string;
}

export interface NodeDescriptor {
  id: string;
  inputs: PortDescriptor[];
  outputs: PortDescriptor[];
}

export interface ConnectionRequest {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

/** Context consumed by the canvas-validation module */
export interface CanvasValidationContext {
  /** All nodes currently on the canvas */
  nodes: NodeDescriptor[];
  /** The pending connection request being evaluated (null when idle) */
  pendingConnection: ConnectionRequest | null;
  /** Result of the most-recent validation (null until first evaluation) */
  validationResult: { valid: boolean; reason: string } | null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Trigger validation of a candidate connection. */
export const ValidateConnectionEvent = defineEvent<
  'VALIDATE_CONNECTION',
  ConnectionRequest
>('VALIDATE_CONNECTION');

/** Trigger a full canvas-state consistency check. */
export const ValidateCanvasStateEvent = defineEvent<
  'VALIDATE_CANVAS_STATE',
  Record<string, never>
>('VALIDATE_CANVAS_STATE');

// ---------------------------------------------------------------------------
// Facts (emitted by rules)
// ---------------------------------------------------------------------------

export const CONNECTION_VALID_FACT = 'canvas.connection.valid';
export const CONNECTION_INVALID_FACT = 'canvas.connection.invalid';
export const CANVAS_STATE_VALID_FACT = 'canvas.state.valid';
export const CANVAS_STATE_INVALID_FACT = 'canvas.state.invalid';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Reject self-loops: a node must not connect to itself.
 * Also resets any stale validation state from a prior evaluation so that
 * subsequent calls on the same engine instance always start clean.
 *
 * inputRules category — connection request validation
 */
const selfLoopCheckRule = defineRule<CanvasValidationContext>({
  id: 'canvas-validation.selfLoopCheck',
  description: 'Reject connections where source and target are the same node',
  eventTypes: 'VALIDATE_CONNECTION',
  impl: (state, events) => {
    const evt = events.find(ValidateConnectionEvent.is);
    if (!evt) return RuleResult.skip('no VALIDATE_CONNECTION event');

    // Reset stale validation state so each new VALIDATE_CONNECTION event
    // starts from a clean slate, regardless of what happened previously.
    state.context.pendingConnection = null;
    state.context.validationResult = null;

    const { from, to } = evt.payload;
    if (from === to) {
      state.context.validationResult = {
        valid: false,
        reason: 'Self-loops are not allowed',
      };
      return RuleResult.emit([fact(CONNECTION_INVALID_FACT, { reason: 'self-loop', ...evt.payload })]);
    }

    return RuleResult.noop('not a self-loop');
  },
});

/**
 * Check data-type compatibility between the output port and input port.
 *
 * When either port has no declared dataType the connection is considered
 * compatible (untyped / any).
 *
 * dataRules category — type compatibility scoring
 */
const portTypeCompatibilityRule = defineRule<CanvasValidationContext>({
  id: 'canvas-validation.portTypeCompatibility',
  description: 'Validate data-type compatibility between connected ports',
  eventTypes: 'VALIDATE_CONNECTION',
  impl: (state, events) => {
    const evt = events.find(ValidateConnectionEvent.is);
    if (!evt) return RuleResult.skip('no VALIDATE_CONNECTION event');

    // Store the current request immediately so context always reflects the
    // most-recent validation request, even on failure paths.
    state.context.pendingConnection = evt.payload;

    // Short-circuit: selfLoopCheckRule already flagged this connection as invalid.
    if (state.context.validationResult?.valid === false) return RuleResult.noop('already failed');

    const { from, fromPort, to, toPort } = evt.payload;
    const srcNode = state.context.nodes.find(n => n.id === from);
    const dstNode = state.context.nodes.find(n => n.id === to);

    if (!srcNode || !dstNode) {
      state.context.validationResult = {
        valid: false,
        reason: `Unknown node: ${!srcNode ? from : to}`,
      };
      return RuleResult.emit([
        fact(CONNECTION_INVALID_FACT, { reason: 'unknown-node', ...evt.payload }),
      ]);
    }

    const srcPort = srcNode.outputs.find(p => p.id === fromPort);
    const dstPortDesc = dstNode.inputs.find(p => p.id === toPort);

    if (!srcPort || !dstPortDesc) {
      state.context.validationResult = {
        valid: false,
        reason: `Unknown port: ${!srcPort ? fromPort : toPort}`,
      };
      return RuleResult.emit([
        fact(CONNECTION_INVALID_FACT, { reason: 'unknown-port', ...evt.payload }),
      ]);
    }

    // Both ports are typed — they must match
    if (
      srcPort.dataType &&
      dstPortDesc.dataType &&
      srcPort.dataType !== dstPortDesc.dataType
    ) {
      state.context.validationResult = {
        valid: false,
        reason: `Type mismatch: ${srcPort.dataType} → ${dstPortDesc.dataType}`,
      };
      return RuleResult.emit([
        fact(CONNECTION_INVALID_FACT, {
          reason: 'type-mismatch',
          fromType: srcPort.dataType,
          toType: dstPortDesc.dataType,
          ...evt.payload,
        }),
      ]);
    }

    state.context.pendingConnection = evt.payload;
    state.context.validationResult = { valid: true, reason: 'compatible' };
    return RuleResult.emit([fact(CONNECTION_VALID_FACT, evt.payload)]);
  },
});

/**
 * Validate that the canvas state is internally consistent:
 * all node IDs are unique.
 *
 * stateRules category — canvas state consistency
 */
const canvasStateConsistencyRule = defineRule<CanvasValidationContext>({
  id: 'canvas-validation.stateConsistency',
  description: 'Ensure all node IDs on the canvas are unique',
  eventTypes: 'VALIDATE_CANVAS_STATE',
  impl: (state, events) => {
    const evt = events.find(ValidateCanvasStateEvent.is);
    if (!evt) return RuleResult.skip('no VALIDATE_CANVAS_STATE event');

    const ids = state.context.nodes.map(n => n.id);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      state.context.validationResult = {
        valid: false,
        reason: 'Duplicate node IDs detected',
      };
      return RuleResult.emit([fact(CANVAS_STATE_INVALID_FACT, { reason: 'duplicate-node-ids' })]);
    }

    state.context.validationResult = { valid: true, reason: 'consistent' };
    return RuleResult.emit([fact(CANVAS_STATE_VALID_FACT, {})]);
  },
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

const noSelfLoopConstraint = defineConstraint<CanvasValidationContext>({
  id: 'canvas-validation.noSelfLoop',
  description: 'A validated connection must not be a self-loop',
  impl: state => {
    const { pendingConnection, validationResult } = state.context;
    if (!pendingConnection || !validationResult?.valid) return true;
    return pendingConnection.from !== pendingConnection.to;
  },
});

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const canvasValidationModule: PraxisModule<CanvasValidationContext> = defineModule({
  rules: [selfLoopCheckRule, portTypeCompatibilityRule, canvasStateConsistencyRule],
  constraints: [noSelfLoopConstraint],
  meta: { name: 'canvas-validation', version: '1.0.0' },
});
