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
  ValidateConnectionEvent,
  ValidateCanvasStateEvent,
  CONNECTION_VALID_FACT,
  CONNECTION_INVALID_FACT,
  CANVAS_STATE_VALID_FACT,
  CANVAS_STATE_INVALID_FACT,
} from './canvas-validation';

export { executionPolicyModule } from './execution-policy';
export type { ExecutionPolicyContext, ExecutionEdge } from './execution-policy';
export {
  ScheduleExecutionEvent,
  DetectCyclesEvent,
  ReportElapsedEvent,
  EXECUTION_ORDER_FACT,
  CYCLE_DETECTED_FACT,
  TIMEOUT_EXCEEDED_FACT,
  GRAPH_ACYCLIC_FACT,
} from './execution-policy';

export { componentRegistryModule } from './component-registry';
export type {
  ComponentRegistryContext,
  ComponentCapability,
  PortCapability,
} from './component-registry';
export {
  RegisterComponentEvent,
  UnregisterComponentEvent,
  CheckPortCompatibilityEvent,
  COMPONENT_REGISTERED_FACT,
  COMPONENT_UNREGISTERED_FACT,
  PORT_COMPATIBLE_FACT,
  PORT_INCOMPATIBLE_FACT,
} from './component-registry';

export { resourceManagementModule } from './resource-management';
export type { ResourceManagementContext } from './resource-management';
export {
  RequestTerminalEvent,
  ReleaseTerminalEvent,
  UpdateMemoryUsageEvent,
  NodeTimeoutEvent,
  TERMINAL_GRANTED_FACT,
  TERMINAL_DENIED_FACT,
  TERMINAL_RELEASED_FACT,
  MEMORY_PRESSURE_FACT,
  CLEANUP_REQUIRED_FACT,
} from './resource-management';
