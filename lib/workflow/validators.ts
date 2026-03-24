/**
 * Workflow Transition Validators
 */
import type {
  TransitionDefinition,
  WorkflowStepDefinition,
  ActionRole,
} from './types'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate that a transition is allowed by the template definition.
 */
export function validateTransition(
  transitions: TransitionDefinition[],
  fromStatus: string,
  action: string,
  role: ActionRole
): ValidationResult {
  const transition = transitions.find(
    (t) => t.from === fromStatus && t.action === action
  )

  if (!transition) {
    return {
      valid: false,
      error: `No transition defined for action "${action}" from status "${fromStatus}"`,
    }
  }

  if (!transition.allowedRoles.includes(role)) {
    return {
      valid: false,
      error: `Role "${role}" is not allowed to perform action "${action}" from status "${fromStatus}"`,
    }
  }

  return { valid: true }
}

/**
 * Find the target status for a given action from a specific status.
 */
export function resolveTargetStatus(
  transitions: TransitionDefinition[],
  fromStatus: string,
  action: string
): string | null {
  const transition = transitions.find(
    (t) => t.from === fromStatus && t.action === action
  )
  return transition?.to ?? null
}

/**
 * Find the step definition for a given status code.
 */
export function findStepByStatus(
  steps: WorkflowStepDefinition[],
  statusCode: string
): WorkflowStepDefinition | undefined {
  return steps.find((s) => s.statusCode === statusCode)
}

/**
 * Check if a status is a terminal state (no outgoing transitions).
 */
export function isTerminalStatus(
  transitions: TransitionDefinition[],
  statusCode: string
): boolean {
  return !transitions.some((t) => t.from === statusCode)
}

/**
 * Get the transition definition for a given action from a status.
 */
export function getTransitionDefinition(
  transitions: TransitionDefinition[],
  fromStatus: string,
  action: string
): TransitionDefinition | undefined {
  return transitions.find(
    (t) => t.from === fromStatus && t.action === action
  )
}
