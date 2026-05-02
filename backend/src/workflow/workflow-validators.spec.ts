import {
  validateTransition,
  resolveTargetStatus,
  findStepByStatus,
  isTerminalStatus,
} from './workflow-validators';
import type { TransitionDefinition, WorkflowStepDefinition } from './types';

const transitions: TransitionDefinition[] = [
  { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
  { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient', 'provider'] },
  { from: 'confirmed', to: 'in_progress', action: 'start', allowedRoles: ['provider'] },
  { from: 'in_progress', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
];

const steps: WorkflowStepDefinition[] = [
  { order: 1, statusCode: 'pending', label: 'Pending', flags: {}, actionsForPatient: [], actionsForProvider: [] },
  { order: 2, statusCode: 'confirmed', label: 'Confirmed', flags: {}, actionsForPatient: [], actionsForProvider: [] },
  { order: 3, statusCode: 'in_progress', label: 'In Progress', flags: {}, actionsForPatient: [], actionsForProvider: [] },
  { order: 4, statusCode: 'completed', label: 'Completed', flags: {}, actionsForPatient: [], actionsForProvider: [] },
  { order: 5, statusCode: 'cancelled', label: 'Cancelled', flags: {}, actionsForPatient: [], actionsForProvider: [] },
];

describe('validateTransition', () => {
  it('returns valid=true for a known transition with correct role', () => {
    expect(validateTransition(transitions, 'pending', 'accept', 'provider')).toEqual({ valid: true });
  });

  it('returns valid=false when action not defined for fromStatus', () => {
    const r = validateTransition(transitions, 'pending', 'start', 'provider');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/no transition/i);
  });

  it('returns valid=false when role is not allowed', () => {
    const r = validateTransition(transitions, 'pending', 'accept', 'patient');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/not allowed/i);
  });

  it('allows patient to cancel from pending', () => {
    expect(validateTransition(transitions, 'pending', 'cancel', 'patient')).toEqual({ valid: true });
  });

  it('returns valid=false for unknown fromStatus', () => {
    const r = validateTransition(transitions, 'nonexistent', 'accept', 'provider');
    expect(r.valid).toBe(false);
  });
});

describe('resolveTargetStatus', () => {
  it('returns target status for a known transition', () => {
    expect(resolveTargetStatus(transitions, 'pending', 'accept')).toBe('confirmed');
  });

  it('returns null for an unknown transition', () => {
    expect(resolveTargetStatus(transitions, 'pending', 'start')).toBeNull();
  });

  it('returns correct target for cancel', () => {
    expect(resolveTargetStatus(transitions, 'pending', 'cancel')).toBe('cancelled');
  });
});

describe('findStepByStatus', () => {
  it('returns the step with matching statusCode', () => {
    const step = findStepByStatus(steps, 'confirmed');
    expect(step?.label).toBe('Confirmed');
  });

  it('returns undefined for unknown statusCode', () => {
    expect(findStepByStatus(steps, 'ghost')).toBeUndefined();
  });
});

describe('isTerminalStatus', () => {
  it('returns false for pending (has outgoing transitions)', () => {
    expect(isTerminalStatus(transitions, 'pending')).toBe(false);
  });

  it('returns true for completed (no outgoing transitions)', () => {
    expect(isTerminalStatus(transitions, 'completed')).toBe(true);
  });

  it('returns true for cancelled (no outgoing transitions)', () => {
    expect(isTerminalStatus(transitions, 'cancelled')).toBe(true);
  });

  it('returns true for unknown status (not in any from)', () => {
    expect(isTerminalStatus(transitions, 'ghost')).toBe(true);
  });
});
