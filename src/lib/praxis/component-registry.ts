// component-registry PraxisModule
// Capability matching, port compatibility checks, and component lifecycle
// management for canvas nodes.

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

export interface PortCapability {
  id: string;
  direction: 'input' | 'output';
  dataType?: string;
  required?: boolean;
}

export interface ComponentCapability {
  /** Unique component type identifier */
  type: string;
  /** Human-readable display name */
  label: string;
  /** All ports exposed by this component type */
  ports: PortCapability[];
  /** Lifecycle state */
  lifecycle: 'registered' | 'active' | 'deprecated' | 'removed';
}

/** Context consumed by the component-registry module */
export interface ComponentRegistryContext {
  /** Registered component capabilities, keyed by type */
  components: Record<string, ComponentCapability>;
  /** Result of the most-recent port-compatibility check */
  portCompatibilityResult: { compatible: boolean; reason: string } | null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Register a new component type with its declared capabilities. */
export const RegisterComponentEvent = defineEvent<
  'REGISTER_COMPONENT',
  Omit<ComponentCapability, 'lifecycle'>
>('REGISTER_COMPONENT');

/** Unregister (deprecate) a component type. */
export const UnregisterComponentEvent = defineEvent<
  'UNREGISTER_COMPONENT',
  { type: string }
>('UNREGISTER_COMPONENT');

/** Check whether an output port can connect to an input port. */
export const CheckPortCompatibilityEvent = defineEvent<
  'CHECK_PORT_COMPATIBILITY',
  {
    fromComponentType: string;
    fromPortId: string;
    toComponentType: string;
    toPortId: string;
  }
>('CHECK_PORT_COMPATIBILITY');

// ---------------------------------------------------------------------------
// Facts (emitted by rules)
// ---------------------------------------------------------------------------

export const COMPONENT_REGISTERED_FACT = 'component-registry.component-registered';
export const COMPONENT_UNREGISTERED_FACT = 'component-registry.component-unregistered';
export const PORT_COMPATIBLE_FACT = 'component-registry.port-compatible';
export const PORT_INCOMPATIBLE_FACT = 'component-registry.port-incompatible';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Register a component type in the registry.
 *
 * inputRules category — component registration validation
 */
const registerComponentRule = defineRule<ComponentRegistryContext>({
  id: 'component-registry.registerComponent',
  description: 'Add a component capability entry to the registry',
  eventTypes: 'REGISTER_COMPONENT',
  impl: (state, events) => {
    const evt = events.find(RegisterComponentEvent.is);
    if (!evt) return RuleResult.skip('no REGISTER_COMPONENT event');

    const capability = evt.payload;
    state.context.components[capability.type] = {
      ...capability,
      lifecycle: 'registered',
    };

    return RuleResult.emit([fact(COMPONENT_REGISTERED_FACT, { type: capability.type })]);
  },
});

/**
 * Unregister (deprecate) a component type.
 */
const unregisterComponentRule = defineRule<ComponentRegistryContext>({
  id: 'component-registry.unregisterComponent',
  description: 'Mark a component type as deprecated/removed in the registry',
  eventTypes: 'UNREGISTER_COMPONENT',
  impl: (state, events) => {
    const evt = events.find(UnregisterComponentEvent.is);
    if (!evt) return RuleResult.skip('no UNREGISTER_COMPONENT event');

    const { type } = evt.payload;
    if (state.context.components[type]) {
      state.context.components[type].lifecycle = 'removed';
    }

    return RuleResult.emit([fact(COMPONENT_UNREGISTERED_FACT, { type })]);
  },
});

/**
 * Check whether two ports (by component type and port ID) are compatible.
 * Compatible means:
 *  1. Both component types are registered and active.
 *  2. The source port is an output; the target port is an input.
 *  3. Both ports have matching dataTypes or at least one is untyped (any).
 *
 * inputRules category — connection request validation
 * dataRules category — type compatibility scoring
 */
const checkPortCompatibilityRule = defineRule<ComponentRegistryContext>({
  id: 'component-registry.checkPortCompatibility',
  description: 'Validate port direction and data-type compatibility between component types',
  eventTypes: 'CHECK_PORT_COMPATIBILITY',
  impl: (state, events) => {
    const evt = events.find(CheckPortCompatibilityEvent.is);
    if (!evt) return RuleResult.skip('no CHECK_PORT_COMPATIBILITY event');

    const { fromComponentType, fromPortId, toComponentType, toPortId } = evt.payload;

    const fromComp = state.context.components[fromComponentType];
    const toComp = state.context.components[toComponentType];

    if (!fromComp || fromComp.lifecycle === 'removed') {
      state.context.portCompatibilityResult = {
        compatible: false,
        reason: `Unknown or removed component: ${fromComponentType}`,
      };
      return RuleResult.emit([
        fact(PORT_INCOMPATIBLE_FACT, {
          reason: 'unknown-from-component',
          ...evt.payload,
        }),
      ]);
    }

    if (!toComp || toComp.lifecycle === 'removed') {
      state.context.portCompatibilityResult = {
        compatible: false,
        reason: `Unknown or removed component: ${toComponentType}`,
      };
      return RuleResult.emit([
        fact(PORT_INCOMPATIBLE_FACT, {
          reason: 'unknown-to-component',
          ...evt.payload,
        }),
      ]);
    }

    const srcPort = fromComp.ports.find(p => p.id === fromPortId && p.direction === 'output');
    const dstPort = toComp.ports.find(p => p.id === toPortId && p.direction === 'input');

    if (!srcPort) {
      state.context.portCompatibilityResult = {
        compatible: false,
        reason: `Output port '${fromPortId}' not found on ${fromComponentType}`,
      };
      return RuleResult.emit([
        fact(PORT_INCOMPATIBLE_FACT, { reason: 'missing-output-port', ...evt.payload }),
      ]);
    }

    if (!dstPort) {
      state.context.portCompatibilityResult = {
        compatible: false,
        reason: `Input port '${toPortId}' not found on ${toComponentType}`,
      };
      return RuleResult.emit([
        fact(PORT_INCOMPATIBLE_FACT, { reason: 'missing-input-port', ...evt.payload }),
      ]);
    }

    // Type compatibility: untyped ports accept anything
    if (srcPort.dataType && dstPort.dataType && srcPort.dataType !== dstPort.dataType) {
      state.context.portCompatibilityResult = {
        compatible: false,
        reason: `Type mismatch: ${srcPort.dataType} → ${dstPort.dataType}`,
      };
      return RuleResult.emit([
        fact(PORT_INCOMPATIBLE_FACT, {
          reason: 'type-mismatch',
          fromType: srcPort.dataType,
          toType: dstPort.dataType,
          ...evt.payload,
        }),
      ]);
    }

    state.context.portCompatibilityResult = { compatible: true, reason: 'compatible' };
    return RuleResult.emit([fact(PORT_COMPATIBLE_FACT, evt.payload)]);
  },
});

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const componentRegistryModule: PraxisModule<ComponentRegistryContext> = defineModule({
  rules: [registerComponentRule, unregisterComponentRule, checkPortCompatibilityRule],
  constraints: [],
  meta: { name: 'component-registry', version: '1.0.0' },
});
