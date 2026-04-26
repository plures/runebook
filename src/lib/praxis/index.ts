// Praxis modules for RuneBook — barrel export
//
// Each module encapsulates a distinct concern via @plures/praxis declarative
// logic management: typed RuleResult returns, Rules Factory, and Praxis
// module composition.

export { canvasValidationModule } from './canvas-validation';
export type {
  CanvasValidationContext,
  ConnectionRequest,
  NodeDescriptor,
  PortDescriptor,
} from './canvas-validation';
export {
  CANVAS_STATE_INVALID_FACT,
  CANVAS_STATE_VALID_FACT,
  CONNECTION_INVALID_FACT,
  CONNECTION_VALID_FACT,
  ValidateCanvasStateEvent,
  ValidateConnectionEvent,
} from './canvas-validation';

export { executionPolicyModule } from './execution-policy';
export type { ExecutionEdge, ExecutionPolicyContext } from './execution-policy';
export {
  CYCLE_DETECTED_FACT,
  DetectCyclesEvent,
  EXECUTION_ORDER_FACT,
  GRAPH_ACYCLIC_FACT,
  ReportElapsedEvent,
  ScheduleExecutionEvent,
  TIMEOUT_EXCEEDED_FACT,
} from './execution-policy';

export { componentRegistryModule } from './component-registry';
export type {
  ComponentCapability,
  ComponentRegistryContext,
  PortCapability,
} from './component-registry';
export {
  CheckPortCompatibilityEvent,
  COMPONENT_REGISTERED_FACT,
  COMPONENT_UNREGISTERED_FACT,
  PORT_COMPATIBLE_FACT,
  PORT_INCOMPATIBLE_FACT,
  RegisterComponentEvent,
  UnregisterComponentEvent,
} from './component-registry';

export { resourceManagementModule } from './resource-management';
export type { ResourceManagementContext } from './resource-management';
export {
  CLEANUP_REQUIRED_FACT,
  MEMORY_PRESSURE_FACT,
  NodeTimeoutEvent,
  ReleaseTerminalEvent,
  RequestTerminalEvent,
  TERMINAL_DENIED_FACT,
  TERMINAL_GRANTED_FACT,
  TERMINAL_RELEASED_FACT,
  UpdateMemoryUsageEvent,
} from './resource-management';

// Runtime — singleton engine instances wired to app lifecycle
export {
  canvasValidationEngine,
  componentRegistryEngine,
  executionPolicyEngine,
  releaseTerminal,
  requestTerminal,
  resourceManagementEngine,
  scheduleExecution,
  syncValidationNodes,
  validateConnection,
} from './runtime';
