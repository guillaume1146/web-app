import type { StepFlagHandler, TransitionContext } from '../types'

export class ContentAttachmentStrategy implements StepFlagHandler {
  flag = 'requires_content' as const

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    const requiredType = ctx.flags.requires_content

    if (!requiredType) {
      return { valid: true, errors: [] }
    }

    if (!ctx.input.contentType) {
      return {
        valid: false,
        errors: [`Content of type "${requiredType}" is required for this step`],
      }
    }

    if (ctx.input.contentType !== requiredType) {
      return {
        valid: false,
        errors: [`Expected content type "${requiredType}" but got "${ctx.input.contentType}"`],
      }
    }

    if (!ctx.input.contentData || Object.keys(ctx.input.contentData).length === 0) {
      return {
        valid: false,
        errors: [`Content data is required for type "${requiredType}"`],
      }
    }

    return { valid: true, errors: [] }
  }
}
