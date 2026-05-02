import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Structured logging interceptor — logs method, URL, status, and duration.
 * Only logs in non-production or when LOG_REQUESTS=true.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (process.env.NODE_ENV === 'production' && process.env.LOG_REQUESTS !== 'true') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    // Skip health checks from logs
    if (url.includes('/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          console.log(`[API] ${method} ${url} ${response.statusCode} ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          const status = error.status || 500;
          console.error(`[API] ${method} ${url} ${status} ${duration}ms - ${error.message}`);
        },
      }),
    );
  }
}
