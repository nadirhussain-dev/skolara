import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { AuditInterceptor } from "./audit.interceptor";
import type { AuditService } from "./audit.service";

describe("AuditInterceptor", () => {
  let audit: { record: jest.Mock };
  let interceptor: AuditInterceptor;

  function contextFor(
    request: Record<string, unknown>,
    statusCode = 200,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode }),
      }),
      getClass: () => ({ name: "PaymentsController" }),
      getHandler: () => ({ name: "review" }),
    } as unknown as ExecutionContext;
  }

  const baseRequest = {
    method: "PATCH",
    path: "/payments/p1/review",
    route: { path: "/payments/:id/review" },
    params: { id: "p1" },
    body: { status: "VERIFIED" },
    ip: "203.0.113.7",
    user: { id: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" },
  };

  beforeEach(() => {
    audit = { record: jest.fn().mockResolvedValue({}) };
    interceptor = new AuditInterceptor(audit as unknown as AuditService);
  });

  it("records a successful write with actor, route and entity", async () => {
    const next = { handle: () => of({ id: "p1", status: "VERIFIED" }) };
    await lastValueFrom(interceptor.intercept(contextFor(baseRequest), next));

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: "school-1",
        actorUserId: "user-1",
        actorRole: "SCHOOL_ADMIN",
        action: "PaymentsController.review",
        method: "PATCH",
        path: "/payments/:id/review",
        entityId: "p1",
        outcome: "SUCCESS",
        statusCode: 200,
        ipAddress: "203.0.113.7",
      }),
    );
  });

  it("ignores reads so the trail isn't buried in noise", async () => {
    const next = { handle: () => of([{ id: "a" }]) };
    await lastValueFrom(
      interceptor.intercept(contextFor({ ...baseRequest, method: "GET" }), next),
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("records a rejected write and lets the error through", async () => {
    const next = { handle: () => throwError(() => new ForbiddenException("nope")) };

    await expect(
      lastValueFrom(interceptor.intercept(contextFor(baseRequest), next)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "FAILURE", statusCode: 403 }),
    );
  });

  it("redacts secrets out of the recorded body", async () => {
    const request = {
      ...baseRequest,
      body: { email: "a@b.com", password: "hunter2", nested: { adminPassword: "s3cret" } },
    };
    const next = { handle: () => of({ id: "u1" }) };
    await lastValueFrom(interceptor.intercept(contextFor(request), next));

    const { metadata } = audit.record.mock.calls[0][0];
    expect(metadata.body).toEqual({
      email: "a@b.com",
      password: "[redacted]",
      nested: { adminPassword: "[redacted]" },
    });
  });

  it("records an API-key actor as a label, since it has no user row", async () => {
    const request = {
      ...baseRequest,
      user: { id: "api-key:key-1", role: "SCHOOL_ADMIN", schoolId: "school-1" },
    };
    const next = { handle: () => of({ id: "p1" }) };
    await lastValueFrom(interceptor.intercept(contextFor(request), next));

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorLabel: "api-key:key-1" }),
    );
  });

  it("does not fail the request when the audit write itself fails", async () => {
    audit.record.mockRejectedValue(new Error("db down"));
    const next = { handle: () => of({ id: "p1" }) };

    await expect(
      lastValueFrom(interceptor.intercept(contextFor(baseRequest), next)),
    ).resolves.toEqual({ id: "p1" });
  });
});
