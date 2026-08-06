import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "@prisma/client";

/**
 * Catches everything that isn't already an HttpException (unexpected
 * exceptions, Prisma errors, etc.) so production responses stay a
 * consistent, safe JSON shape instead of leaking stack traces or raw
 * driver error messages to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(typeof body === "string" ? { message: body, statusCode: status } : body);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique constraint, P2025 = record not found — the two Prisma
      // errors that realistically originate from user input rather than a bug.
      if (exception.code === "P2002") {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: "A record with these details already exists",
          error: "Conflict",
        });
        return;
      }
      if (exception.code === "P2025") {
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: "Record not found",
          error: "Not Found",
        });
        return;
      }
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Something went wrong. Please try again.",
      error: "Internal Server Error",
    });
  }
}
