import type { StepFlagHandler, StepFlags } from '../types'

export abstract class BaseStrategy implements StepFlagHandler {
  abstract flag: keyof StepFlags
}
