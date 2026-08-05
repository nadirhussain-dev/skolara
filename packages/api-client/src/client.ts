import type {
  AddComplaintCommentInput,
  Assignment,
  AssignmentSubmission,
  AttendanceRecord,
  AuthResponse,
  Complaint,
  ComplaintComment,
  CreateAssignmentInput,
  CreateClassInput,
  CreateComplaintInput,
  CreateNoticeInput,
  CreateSchoolInput,
  DefaulterRisk,
  GradeAssignmentInput,
  GradeEntry,
  Invoice,
  LoginInput,
  MarkAttendanceInput,
  Message,
  MessageThread,
  Notice,
  PaymentSubmission,
  PaymentSubmissionStatus,
  PlatformAnalytics,
  ReviewPaymentInput,
  School,
  SchoolAnalytics,
  SchoolClass,
  SendMessageInput,
  StartThreadInput,
  SubmitAssignmentInput,
  SubmitPaymentInput,
  UpdateComplaintStatusInput,
  UpsertGradeEntryInput,
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

export interface GradeEntryWithStudent extends GradeEntry {
  student: { id: string; user: { firstName: string; lastName: string } };
}

export interface AssignmentSubmissionWithStudent extends AssignmentSubmission {
  student: { id: string; user: { id: string; firstName: string; lastName: string } };
}

export interface AssignmentSubmissionWithAssignment extends AssignmentSubmission {
  assignment: Assignment;
}

export interface MessageThreadWithStudent extends MessageThread {
  student: { id: string; user: { id: string; firstName: string; lastName: string } };
}

export interface ComplaintWithComments extends Complaint {
  comments: ComplaintComment[];
}

export interface DefaulterRiskWithExplanation extends DefaulterRisk {
  explanation: string;
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
      approve: (id: string) =>
        request<School>(`/schools/${id}/approve`, { method: "PATCH" }),
      reject: (id: string) =>
        request<School>(`/schools/${id}/reject`, { method: "PATCH" }),
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
    grades: {
      upsert: (input: UpsertGradeEntryInput) =>
        request<GradeEntry>("/grades", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      forClass: (classId: string, term?: string) =>
        request<GradeEntryWithStudent[]>(
          `/grades/class/${classId}${term ? `?term=${term}` : ""}`,
        ),
      forStudent: (studentId: string) =>
        request<GradeEntry[]>(`/grades/student/${studentId}`),
    },
    notices: {
      create: (input: CreateNoticeInput) =>
        request<Notice>("/notices", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: () => request<Notice[]>("/notices"),
    },
    assignments: {
      create: (input: CreateAssignmentInput) =>
        request<Assignment>("/assignments", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      forClass: (classId: string) =>
        request<Assignment[]>(`/assignments/class/${classId}`),
      submit: (assignmentId: string, studentId: string, input: SubmitAssignmentInput) =>
        request<AssignmentSubmission>(
          `/assignments/${assignmentId}/submissions/${studentId}`,
          { method: "POST", body: JSON.stringify(input) },
        ),
      submissions: (assignmentId: string) =>
        request<AssignmentSubmissionWithStudent[]>(
          `/assignments/${assignmentId}/submissions`,
        ),
      grade: (submissionId: string, input: GradeAssignmentInput) =>
        request<AssignmentSubmission>(`/assignments/submissions/${submissionId}/grade`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      forStudent: (studentId: string) =>
        request<AssignmentSubmissionWithAssignment[]>(`/assignments/student/${studentId}`),
    },
    complaints: {
      create: (input: CreateComplaintInput) =>
        request<Complaint>("/complaints", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: () => request<Complaint[]>("/complaints"),
      mine: () => request<Complaint[]>("/complaints/mine"),
      findOne: (id: string) => request<ComplaintWithComments>(`/complaints/${id}`),
      addComment: (id: string, input: AddComplaintCommentInput) =>
        request<ComplaintComment>(`/complaints/${id}/comments`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateStatus: (id: string, input: UpdateComplaintStatusInput) =>
        request<Complaint>(`/complaints/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    messaging: {
      startThread: (input: StartThreadInput) =>
        request<MessageThread>("/messages/threads", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      threads: () => request<MessageThreadWithStudent[]>("/messages/threads"),
      messages: (threadId: string) =>
        request<Message[]>(`/messages/threads/${threadId}/messages`),
      send: (threadId: string, input: SendMessageInput) =>
        request<Message>(`/messages/threads/${threadId}/messages`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    analytics: {
      platform: () => request<PlatformAnalytics>("/analytics/platform"),
      school: () => request<SchoolAnalytics>("/analytics/school"),
      defaulterRisk: (studentId: string) =>
        request<DefaulterRiskWithExplanation>(`/analytics/defaulter-risk/${studentId}`),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
