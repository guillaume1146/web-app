/**
 * Workflow Engine — Public API
 */

// Engine functions
export {
  startWorkflow,
  transition,
  getState,
  getTimeline,
  registerFlagHandler,
  WorkflowError,
} from './engine'

// Registry
export { resolveTemplate } from './registry'

// Validators
export {
  validateTransition,
  resolveTargetStatus,
  findStepByStatus,
  isTerminalStatus,
} from './validators'

// Notification
export {
  interpolateTemplate,
  resolveNotification,
  buildNotificationVariables,
} from './notification-resolver'

// Repositories
export * as templateRepo from './repositories/workflow-template.repository'
export * as instanceRepo from './repositories/workflow-instance.repository'
export * as stepLogRepo from './repositories/workflow-step-log.repository'

// Hook for booking creation integration
export { attachWorkflow } from './hook'

// Strategies (auto-registers on import)
export { registerAllStrategies } from './strategies'

// Types
export type {
  StepAction,
  StepFlags,
  StepNotification,
  WorkflowStepDefinition,
  TransitionDefinition,
  ContentType,
  ActionRole,
  TransitionInput,
  TransitionResult,
  WorkflowState,
  StepFlagHandler,
  StepFlagResult,
  TransitionContext,
  NotificationVariables,
} from './types'
