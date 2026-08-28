import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { AuditService } from "./audit.service";

/**
 * Field names never copied into the audit metadata. The trail records that a
 * password was changed, never what it was changed to.
 */
const REDACTED_FIELDS = new Set([
  "password",
  "adminPassword",
  "newPassword",
  "currentPassword",
  "token",
  "refreshToken",
  "accessToken",
  "rawKey",
  "hashedKey",
]);

const REDACTED = "[redacted]";

function toSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function redact(value: unknown, depth = 0): unknown {
  // Guards against a pathological payload turning every write into a deep walk.
  if (depth > 4) return REDACTED;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        REDACTED_FIELDS.has(key) ? REDACTED : redact(item, depth + 1),
      ]),
    );
  }
  return value;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();

    // Reads aren't state changes. Logging them would bury the trail in noise
    // and multiply its size by an order of magnitude.
    if (request.method === "GET") return next.handle();

    return next.handle().pipe(
      tap((response) => {
        void this.write(context, request, response, "SUCCESS", http.getResponse().statusCode);
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        // Failures matter most: repeated 403s are what an intrusion looks like.
        void this.write(context, request, null, "FAILURE", statusCode);
        return throwError(() => error);
      }),
    );
  }

  private async write(
    context: ExecutionContext,
    request: Request & { user?: AuthenticatedUser },
    response: unknown,
    outcome: "SUCCESS" | "FAILURE",
    statusCode: number,
  ) {
    try {
      const user = request.user;
      const entityId =
        response && typeof response === "object" && "id" in response
          ? String((response as { id: unknown }).id)
          : // Express types params as string | string[]; a repeated `:id` in a
            // route isn't a shape we produce, so take the first value.
            toSingleParam(request.params?.id);

      await this.audit.record({
        schoolId: user?.schoolId ?? null,
        // An `api-key:<id>` principal isn't a real user row, so it can only be
        // recorded as a label — the FK would fail.
        actorUserId: user && !user.id.startsWith("api-key:") ? user.id : null,
        actorLabel: user?.id ?? "anonymous",
        actorRole: user?.role ?? null,
        action: `${context.getClass().name}.${context.getHandler().name}`,
        method: request.method,
        path: request.route?.path ?? request.path,
        entityId,
        outcome,
        statusCode,
        ipAddress: request.ip ?? null,
        metadata: {
          body: redact(request.body),
          params: request.params,
        } as Prisma.InputJsonValue,
      });
    } catch (error) {
      // An unwritable audit row must not turn a successful operation into a
      // 500 for the user. It is logged loudly instead.
      this.logger.error(`Failed to write audit log: ${error}`);
    }
  }
}
