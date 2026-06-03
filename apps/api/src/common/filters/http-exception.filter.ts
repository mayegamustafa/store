import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { captureException } from '../sentry/sentry.init';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let isHandled = false; // true = expected error (validation, not found, etc.); skip Sentry

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || (res as any).error || message;
      isHandled = status < 500;
    } else if (exception instanceof Error) {
      // Prisma known errors
      if ((exception as any).code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception as any).meta?.target;
        message = `A record with this ${target?.join(', ') || 'value'} already exists`;
        isHandled = true;
      } else if ((exception as any).code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        isHandled = true;
      } else if ((exception as any).code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record not found';
        isHandled = true;
      } else {
        this.logger.error(
          `Unhandled exception on ${request.method} ${request.url}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }

    // Send 5xx and unknown errors to Sentry. Skip expected client errors.
    if (!isHandled || status >= 500) {
      captureException(exception, {
        method: request.method,
        url: request.url,
        statusCode: status,
        userId: (request as any).user?.id,
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
