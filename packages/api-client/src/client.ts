import type {
  AddComplaintCommentInput,
  AdmitStudentInput,
  ApiKey,
  AssignSchoolToGroupInput,
  AssignStudentToBusInput,
  Assignment,
  AssignmentSubmission,
  AttendanceRecord,
  AuthResponse,
  AuthTokens,
  BankStatementLine,
  Book,
  BookLoan,
  BorrowBookInput,
  Bus,
  BusLocationPing,
  Complaint,
  ComplaintComment,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  CreateAssignmentInput,
  CreateBookInput,
  CreateBusInput,
  CreateClassInput,
  CreateComplaintInput,
  CreateExamInput,
  CreateInvoiceInput,
  CreateNoticeInput,
  CreatePayslipInput,
  CreateSchoolGroupInput,
  CreateSchoolInput,
  CreateTeacherInput,
  CreateUserInput,
  DefaulterRisk,
  Exam,
  GradeAssignmentInput,
  GradeEntry,
  ImportBankStatementInput,
  Invoice,
  LoginInput,
  MarkAttendanceInput,
  Message,
  MessageThread,
  Notice,
  Payslip,
  PaymentSubmission,
  PaymentSubmissionStatus,
  PlatformAnalytics,
  RankListEntry,
  ReportBusLocationInput,
  ReviewPaymentInput,
  School,
  SchoolAnalytics,
  SchoolClass,
  SchoolGroup,
  SendMessageInput,
  StartThreadInput,
  SubmitAssignmentInput,
  SubmitPaymentInput,
  SuggestedMatch,
  UpdateBrandingInput,
  UpdateComplaintStatusInput,
  UpsertGradeEntryInput,
  User,
  RoleType,
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
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
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

export interface TeacherWithUser {
  id: string;
  userId: string;
  employeeNumber: string;
  subjects: string[];
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
}

export interface BusWithLatestLocation {
  bus: Bus;
  latestLocation: BusLocationPing | null;
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
  /** Enables silent token refresh on 401s. Omit to disable (e.g. before login). */
  getRefreshToken?: () => string | null | Promise<string | null>;
  onTokensRefreshed?: (tokens: AuthTokens) => void | Promise<void>;
  /** Called once a 401 survives a refresh attempt (or there's no refresh token) — sign the user out. */
  onAuthFailure?: () => void | Promise<void>;
}

export function createApiClient({
  baseUrl,
  getAccessToken,
  getRefreshToken,
  onTokensRefreshed,
  onAuthFailure,
}: ApiClientOptions) {
  // Dedupes concurrent refreshes: if five requests 401 at once, only one
  // actual /auth/refresh call happens and the rest await its result.
  let refreshInFlight: Promise<string | null> | null = null;

  async function refreshAccessToken(): Promise<string | null> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = await getRefreshToken?.();
        if (!refreshToken) return null;
        try {
          const res = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (!res.ok) return null;
          const tokens = (await res.json()) as AuthTokens;
          await onTokensRefreshed?.(tokens);
          return tokens.accessToken;
        } catch {
          return null;
        }
      })();
    }
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function request<T>(
    path: string,
    init: RequestInit = {},
    isRetry = false,
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
      if (res.status === 401 && !isRetry && getRefreshToken && path !== "/auth/login" && path !== "/auth/refresh") {
        const newToken = await refreshAccessToken();
        if (newToken) return request<T>(path, init, true);
        await onAuthFailure?.();
      }
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
      mine: () => request<School>("/schools/me"),
      updateBranding: (id: string, input: UpdateBrandingInput) =>
        request<School>(`/schools/${id}/branding`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    schoolGroups: {
      list: () => request<SchoolGroup[]>("/school-groups"),
      create: (input: CreateSchoolGroupInput) =>
        request<SchoolGroup>("/school-groups", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      assignSchool: (groupId: string, input: AssignSchoolToGroupInput) =>
        request<School>(`/school-groups/${groupId}/schools`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      schools: (groupId: string) => request<School[]>(`/school-groups/${groupId}/schools`),
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
      admit: (input: AdmitStudentInput) =>
        request<StudentWithUser>("/students", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      byClass: (classId: string) =>
        request<StudentWithUser[]>(`/students?classId=${classId}`),
      mine: () => request<StudentWithUser[]>("/students/mine"),
      findOne: (id: string) => request<StudentWithUser>(`/students/${id}`),
      assignClass: (id: string, classId: string) =>
        request<StudentWithUser>(`/students/${id}/class`, {
          method: "PATCH",
          body: JSON.stringify({ classId }),
        }),
    },
    teachers: {
      create: (input: CreateTeacherInput) =>
        request<TeacherWithUser>("/teachers", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: () => request<TeacherWithUser[]>("/teachers"),
      findOne: (id: string) => request<TeacherWithUser>(`/teachers/${id}`),
    },
    invoices: {
      create: (input: CreateInvoiceInput) =>
        request<Invoice>("/invoices", {
          method: "POST",
          body: JSON.stringify(input),
        }),
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
    exams: {
      create: (input: CreateExamInput) =>
        request<Exam>("/exams", { method: "POST", body: JSON.stringify(input) }),
      forClass: (classId: string) => request<Exam[]>(`/exams/class/${classId}`),
      rankList: (examId: string) => request<RankListEntry[]>(`/exams/${examId}/rank-list`),
    },
    library: {
      createBook: (input: CreateBookInput) =>
        request<Book>("/library/books", { method: "POST", body: JSON.stringify(input) }),
      books: () => request<Book[]>("/library/books"),
      borrow: (input: BorrowBookInput) =>
        request<BookLoan>("/library/loans", { method: "POST", body: JSON.stringify(input) }),
      returnBook: (loanId: string) =>
        request<BookLoan>(`/library/loans/${loanId}/return`, { method: "PATCH" }),
      loansForStudent: (studentId: string) =>
        request<(BookLoan & { book: Book })[]>(`/library/loans/student/${studentId}`),
    },
    transport: {
      createBus: (input: CreateBusInput) =>
        request<Bus>("/transport/buses", { method: "POST", body: JSON.stringify(input) }),
      buses: () => request<Bus[]>("/transport/buses"),
      assignStudent: (busId: string, input: AssignStudentToBusInput) =>
        request(`/transport/buses/${busId}/assign`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      reportLocation: (busId: string, input: ReportBusLocationInput) =>
        request<BusLocationPing>(`/transport/buses/${busId}/location`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      latestLocation: (busId: string) =>
        request<BusLocationPing | null>(`/transport/buses/${busId}/location`),
      forStudent: (studentId: string) =>
        request<BusWithLatestLocation | null>(`/transport/student/${studentId}`),
    },
    payroll: {
      generate: (input: CreatePayslipInput) =>
        request<Payslip>("/payroll/payslips", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      forStaff: (staffUserId: string) =>
        request<Payslip[]>(`/payroll/payslips/staff/${staffUserId}`),
      mine: () => request<Payslip[]>("/payroll/payslips/mine"),
    },
    bankStatement: {
      import: (input: ImportBankStatementInput) =>
        request<{ imported: number }>("/bank-statement/import", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      suggestedMatches: () =>
        request<SuggestedMatch[]>("/bank-statement/suggested-matches"),
      confirmMatch: (lineId: string, paymentSubmissionId: string) =>
        request<BankStatementLine>(
          `/bank-statement/lines/${lineId}/match/${paymentSubmissionId}`,
          { method: "POST" },
        ),
    },
    apiKeys: {
      create: (input: CreateApiKeyInput) =>
        request<CreateApiKeyResponse>("/api-keys", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: () => request<ApiKey[]>("/api-keys"),
      revoke: (id: string) => request<ApiKey>(`/api-keys/${id}`, { method: "DELETE" }),
    },
    users: {
      create: (input: CreateUserInput) =>
        request<User>("/users", { method: "POST", body: JSON.stringify(input) }),
      list: (role?: RoleType) =>
        request<User[]>(`/users${role ? `?role=${role}` : ""}`),
      setActive: (id: string, isActive: boolean) =>
        request<User>(`/users/${id}/active`, {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
