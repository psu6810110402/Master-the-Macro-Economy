import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// Temporary simplistic implementation without 'uuid' package to avoid adding more deps,
// or we can use crypto.randomUUID()
import * as crypto from 'crypto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const reqId = crypto.randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as any)?.message ?? exception.message)
        : 'An unexpected error occurred';

    const error =
      exception instanceof HttpException
        ? ((exception.getResponse() as any)?.error ?? 'INTERNAL_ERROR')
        : 'INTERNAL_SERVER_ERROR';

    // Log with requestId for tracing
    this.logger.error(
      `[${reqId}] ${status} ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    res.status(status).json({
      statusCode: status,
      error,
      message: status === 500 ? 'An unexpected error occurred' : message,
      details:
        exception instanceof HttpException
          ? (exception.getResponse() as any)?.details
          : undefined,
      requestId: reqId,
      timestamp: new Date().toISOString(),
    });
  }
}
