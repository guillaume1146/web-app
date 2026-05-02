import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter.
 * Catches all exceptions and returns the standard error format:
 *   { success: false, message: string }
 *
 * This matches the frontend expectation from the Next.js API convention.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        // Handle class-validator errors (array of messages)
        if (Array.isArray(resp.message)) {
          message = resp.message[0];
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log non-client errors
    if (status >= 500) {
      console.error(
        `[ERROR] ${request.method} ${request.url}:`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      success: false,
      message,
    });
  }
}
