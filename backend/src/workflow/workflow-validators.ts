/**
 * Pure functions — no DI needed, just imported directly.
 * Identical to lib/workflow/validators.ts
 */
import type { TransitionDefinition, WorkflowStepDefinition, ActionRole } from './types';

export function validateTransition(
  transitions: TransitionDefinition[], fromStatus: string, action: string, role: ActionRole,
): { valid: boolean; error?: string } {
  const t = transitions.find(t => t.from === fromStatus && t.action === action);
  if (!t) return { valid: false, error: `No transition defined for action "${action}" from status "${fromStatus}"` };
  if (!t.allowedRoles.includes(role)) return { valid: false, error: `Role "${role}" is not allowed to perform action "${action}" from status "${fromStatus}"` };
  return { valid: true };
}

export function resolveTargetStatus(transitions: TransitionDefinition[], fromStatus: string, action: string): string | null {
  return transitions.find(t => t.from === fromStatus && t.action === action)?.to ?? null;
}

export function findStepByStatus(steps: WorkflowStepDefinition[], statusCode: string): WorkflowStepDefinition | undefined {
  return steps.find(s => s.statusCode === statusCode);
}

export function isTerminalStatus(transitions: TransitionDefinition[], statusCode: string): boolean {
  return !transitions.some(t => t.from === statusCode);
}
