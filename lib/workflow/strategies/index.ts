/**
 * Strategy Registry — registers all step flag handlers with the workflow engine.
 */
import { registerFlagHandler } from '../engine'
import { VideoCallStrategy } from './video-call.strategy'
import { StockCheckStrategy } from './stock-check.strategy'
import { StockSubtractStrategy } from './stock-subtract.strategy'
import { PrescriptionCheckStrategy } from './prescription-check.strategy'
import { ContentAttachmentStrategy } from './content-attachment.strategy'
import { PaymentStrategy } from './payment.strategy'
import { RefundStrategy } from './refund.strategy'
import { ConversationStrategy } from './conversation.strategy'
import { ReviewRequestStrategy } from './review-request.strategy'

let registered = false

export function registerAllStrategies() {
  if (registered) return
  registered = true

  registerFlagHandler(new VideoCallStrategy())
  registerFlagHandler(new StockCheckStrategy())
  registerFlagHandler(new StockSubtractStrategy())
  registerFlagHandler(new PaymentStrategy())
  registerFlagHandler(new RefundStrategy())
  registerFlagHandler(new ConversationStrategy())
  registerFlagHandler(new ReviewRequestStrategy())
  registerFlagHandler(new PrescriptionCheckStrategy())
  registerFlagHandler(new ContentAttachmentStrategy())
}

// Auto-register on import
registerAllStrategies()
