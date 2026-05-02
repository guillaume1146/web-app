import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Global response transform interceptor.
 * Ensures all API responses follow the standard format:
 *   { success: true, ...data }
 *
 * If the controller already returns { success: boolean, ... }, it passes through untouched.
 * Otherwise, wraps the return value in { success: true, data: <value> }.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If the response is null/undefined, return success with no data
        if (data === null || data === undefined) {
          return { success: true };
        }

        // If already shaped with { success: ... }, pass through
        if (typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Wrap raw data in standard envelope
        return { success: true, data };
      }),
    );
  }
}
