import type {
  AttendanceRecord,
  AuthResponse,
  CreateClassInput,
  CreateSchoolInput,
  Invoice,
  LoginInput,
  MarkAttendanceInput,
  PaymentSubmission,
  PaymentSubmissionStatus,
  ReviewPaymentInput,
  School,
  SchoolClass,
  SubmitPaymentInput,
} from "@skolara/types";

export interface PaymentQueueItem extends PaymentSubmission {
  student: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string };
  };
  invoice: Invoice;
}

export interface StudentWithUser {
  id: string;
  admissionNumber: string;
  classId: string | null;
  user: { id: string; firstName: string; lastName: string };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
}

export function createApiClient({ baseUrl, getAccessToken }: ApiClientOptions) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      throw new ApiError(res.status, body?.message ?? res.statusText, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    request,
    auth: {
      login: (input: LoginInput) =>
        request<AuthResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    schools: {
      list: () => request<School[]>("/schools"),
      create: (input: CreateSchoolInput) =>
        request<School>("/schools", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    classes: {
      list: () => request<SchoolClass[]>("/classes"),
      create: (input: CreateClassInput) =>
        request<SchoolClass>("/classes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    students: {
      byClass: (classId: string) =>
        request<StudentWithUser[]>(`/students?classId=${classId}`),
      mine: () => request<StudentWithUser[]>("/students/mine"),
    },
    invoices: {
      forStudent: (studentId: string) =>
        request<Invoice[]>(`/invoices/student/${studentId}`),
    },
    attendance: {
      mark: (input: MarkAttendanceInput) =>
        request<AttendanceRecord[]>("/attendance", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      byClass: (classId: string, date: string) =>
        request<AttendanceRecord[]>(
          `/attendance/class/${classId}?date=${date}`,
        ),
    },
    payments: {
      submit: (studentId: string, input: SubmitPaymentInput) =>
        request<PaymentSubmission>(`/payments/student/${studentId}`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      queue: (status?: PaymentSubmissionStatus) =>
        request<PaymentQueueItem[]>(
          `/payments/queue${status ? `?status=${status}` : ""}`,
        ),
      review: (id: string, input: ReviewPaymentInput) =>
        request(`/payments/${id}/review`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
