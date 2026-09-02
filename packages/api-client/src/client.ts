import type {
  AddComplaintCommentInput,
  AdmitStudentInput,
  ApiKey,
  AssignSchoolToGroupInput,
  AssignStudentToBusInput,
  Assignment,
  AssignmentSubmission,
  AttendanceRecord,
  AuditLogPage,
  AuthResponse,
  AuthTokens,
  BankStatementLine,
  Book,
  BookLoan,
  BorrowBookInput,
  Bus,
  BusLocationPing,
  CalendarEvent,
  Complaint,
  ComplaintComment,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  CreateAssignmentInput,
  CreateBookInput,
  CreateBusInput,
  CreateCalendarEventInput,
  CreateClassInput,
  CreateComplaintInput,
  CreateExamInput,
  CreateInvoiceInput,
  CreateNoticeInput,
  CreatePeriodInput,
  CreatePayslipInput,
  CreateSchoolGroupInput,
  CreateSchoolInput,
  CreateTeacherInput,
  CreateUserInput,
  DefaulterRisk,
  DeviceToken,
  ForgotPasswordInput,
  Exam,
  GradeAssignmentInput,
  GradeEntry,
  ImportBankStatementInput,
  Invoice,
  IssueCertificateInput,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LoginInput,
  MarkAttendanceInput,
  MeetingSlot,
  BookMeetingSlotInput,
  PublishMeetingSlotsInput,
  Message,
  MessageThread,
  Notice,
  Period,
  Payslip,
  PaymentSubmission,
  PaymentSubmissionStatus,
  PlatformAnalytics,
  RankListEntry,
  RegisterDeviceInput,
  RequestLeaveInput,
  ReviewLeaveInput,
  RegisterSchoolInput,
  RegisterSchoolResponse,
  ReportBusLocationInput,
  ResetPasswordInput,
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
  SupportTicket,
  SupportTicketComment,
  SupportTicketStatus,
  CreateSupportTicketInput,
  AddSupportCommentInput,
  UpdateSupportTicketInput,
  UpdateBrandingInput,
  TimetableEntry,
  UpdateComplaintStatusInput,
  UploadPurpose,
  UploadedFile,
  UpsertGradeEntryInput,
  UpsertTimetableEntryInput,
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

export interface ClassAttendanceSummary {
  classId: string;
  name: string;
  section: string | null;
  marked: boolean;
  presentCount: number;
  totalCount: number;
  attendanceRate: number | null;
}

export interface SchoolDayAttendance {
  date: string;
  classes: ClassAttendanceSummary[];
  unmarkedClassCount: number;
  presentCount: number;
  totalCount: number;
  attendanceRate: number | null;
}

export interface TimetableEntryDetail extends TimetableEntry {
  period: Period;
  teacherUser: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string; section: string };
}

export interface SupportTicketDetail extends SupportTicket {
  school: { id: string; name: string; subdomain: string; plan: string };
  raisedByUser: { id: string; firstName: string; lastName: string; email: string };
}

export interface SupportTicketWithComments extends SupportTicketDetail {
  comments: (SupportTicketComment & {
    authorUser: { id: string; firstName: string; lastName: string; role: string };
  })[];
}

export interface MeetingSlotDetail extends MeetingSlot {
  teacherUser: { id: string; firstName: string; lastName: string };
  student: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string };
  } | null;
  bookedByParentUser: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
}

export interface LeaveRequestWithRequester extends LeaveRequest {
  requesterUser: { id: string; firstName: string; lastName: string; role: string };
}

export interface GeneratedReportCard {
  studentId: string;
  studentName: string;
  file: UploadedFile;
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

  /**
   * Multipart sibling of `request`. Deliberately does NOT set Content-Type —
   * the runtime has to add its own `multipart/form-data` boundary, and setting
   * the header by hand strips it and breaks the parse server-side.
   */
  async function upload(body: FormData, isRetry = false): Promise<UploadedFile> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry && getRefreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) return upload(body, true);
        await onAuthFailure?.();
      }
      const detail = await res.json().catch(() => undefined);
      throw new ApiError(res.status, detail?.message ?? res.statusText, detail);
    }

    return res.json() as Promise<UploadedFile>;
  }

  /**
   * Text sibling of `request`, for endpoints that return CSV rather than JSON.
   * These are behind the bearer token, so a plain `<a href>` would arrive
   * unauthenticated — the body has to come through the client.
   */
  async function requestText(path: string, isRetry = false): Promise<string> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: "text/csv",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry && getRefreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) return requestText(path, true);
        await onAuthFailure?.();
      }
      throw new ApiError(res.status, res.statusText);
    }

    return res.text();
  }

  return {
    request,
    requestText,
    auth: {
      login: (input: LoginInput) =>
        request<AuthResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      logout: (refreshToken: string) =>
        request<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        }),
      forgotPassword: (input: ForgotPasswordInput) =>
        request<void>("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      resetPassword: (input: ResetPasswordInput) =>
        request<void>("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    schools: {
      list: () => request<School[]>("/schools"),
      register: (input: RegisterSchoolInput) =>
        request<RegisterSchoolResponse>("/schools/register", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      subdomainAvailable: (subdomain: string) =>
        request<{ available: boolean }>(
          `/schools/subdomain-available/${encodeURIComponent(subdomain)}`,
        ),
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
      parents: (id: string) => request<User[]>(`/students/${id}/parents`),
      linkParent: (id: string, parentUserId: string) =>
        request<User[]>(`/students/${id}/parents`, {
          method: "POST",
          body: JSON.stringify({ parentUserId }),
        }),
      unlinkParent: (id: string, parentUserId: string) =>
        request<User[]>(`/students/${id}/parents/${parentUserId}`, { method: "DELETE" }),
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
      schoolDay: (date: string) =>
        request<SchoolDayAttendance>(`/attendance/school-day?date=${date}`),
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
    audit: {
      list: (params: { outcome?: "SUCCESS" | "FAILURE"; cursor?: string; limit?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.outcome) query.set("outcome", params.outcome);
        if (params.cursor) query.set("cursor", params.cursor);
        if (params.limit) query.set("limit", String(params.limit));
        const suffix = query.toString();
        return request<AuditLogPage>(`/audit-logs${suffix ? `?${suffix}` : ""}`);
      },
    },
    support: {
      create: (input: CreateSupportTicketInput) =>
        request<SupportTicketDetail>("/support/tickets", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: (status?: SupportTicketStatus) =>
        request<SupportTicketDetail[]>(
          `/support/tickets${status ? `?status=${status}` : ""}`,
        ),
      findOne: (id: string) => request<SupportTicketWithComments>(`/support/tickets/${id}`),
      addComment: (id: string, input: AddSupportCommentInput) =>
        request<SupportTicketComment>(`/support/tickets/${id}/comments`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: UpdateSupportTicketInput) =>
        request<SupportTicket>(`/support/tickets/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    meetings: {
      publish: (input: PublishMeetingSlotsInput) =>
        request<{ published: number; requested: number }>("/meetings/slots", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      mine: () => request<MeetingSlotDetail[]>("/meetings/slots/mine"),
      available: (teacherUserId?: string) =>
        request<MeetingSlotDetail[]>(
          `/meetings/slots/available${teacherUserId ? `?teacherUserId=${teacherUserId}` : ""}`,
        ),
      booked: () => request<MeetingSlotDetail[]>("/meetings/slots/booked"),
      book: (slotId: string, input: BookMeetingSlotInput) =>
        request<MeetingSlotDetail>(`/meetings/slots/${slotId}/book`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      cancelBooking: (slotId: string) =>
        request<void>(`/meetings/slots/${slotId}/cancel-booking`, { method: "PATCH" }),
      withdraw: (slotId: string) =>
        request<void>(`/meetings/slots/${slotId}`, { method: "DELETE" }),
    },
    leave: {
      request: (input: RequestLeaveInput) =>
        request<LeaveRequest>("/leave", { method: "POST", body: JSON.stringify(input) }),
      mine: () => request<LeaveRequest[]>("/leave/mine"),
      balances: () => request<LeaveBalance[]>("/leave/balances"),
      list: (status?: LeaveStatus) =>
        request<LeaveRequestWithRequester[]>(`/leave${status ? `?status=${status}` : ""}`),
      review: (id: string, input: ReviewLeaveInput) =>
        request<LeaveRequest>(`/leave/${id}/review`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      cancel: (id: string) =>
        request<LeaveRequest>(`/leave/${id}/cancel`, { method: "PATCH" }),
    },
    reports: {
      platformRevenueCsv: () => requestText("/reports/platform-revenue.csv"),
      feeCollectionCsv: () => requestText("/reports/fee-collection.csv"),
    },
    certificates: {
      issue: (input: IssueCertificateInput) =>
        request<UploadedFile & { serial: string }>("/certificates", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    reportCards: {
      forStudent: (studentId: string, term: string) =>
        request<GeneratedReportCard>(
          `/report-cards/student/${studentId}?term=${encodeURIComponent(term)}`,
          { method: "POST" },
        ),
      forClass: (classId: string, term: string) =>
        request<GeneratedReportCard[]>(
          `/report-cards/class/${classId}?term=${encodeURIComponent(term)}`,
          { method: "POST" },
        ),
    },
    timetable: {
      periods: () => request<Period[]>("/timetable/periods"),
      createPeriod: (input: CreatePeriodInput) =>
        request<Period>("/timetable/periods", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      deletePeriod: (id: string) =>
        request<void>(`/timetable/periods/${id}`, { method: "DELETE" }),
      // PUT, not POST: placing a lesson replaces whatever the class had in
      // that slot, so the call is idempotent.
      upsertEntry: (input: UpsertTimetableEntryInput) =>
        request<TimetableEntryDetail>("/timetable/entries", {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      deleteEntry: (id: string) =>
        request<void>(`/timetable/entries/${id}`, { method: "DELETE" }),
      forClass: (classId: string) =>
        request<TimetableEntryDetail[]>(`/timetable/class/${classId}`),
      mine: () => request<TimetableEntryDetail[]>("/timetable/mine"),
      forTeacher: (teacherUserId: string) =>
        request<TimetableEntryDetail[]>(`/timetable/teacher/${teacherUserId}`),
      forStudent: (studentId: string) =>
        request<TimetableEntryDetail[]>(`/timetable/student/${studentId}`),
    },
    calendar: {
      list: (from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        const suffix = query.toString();
        return request<CalendarEvent[]>(`/calendar${suffix ? `?${suffix}` : ""}`);
      },
      create: (input: CreateCalendarEventInput) =>
        request<CalendarEvent>("/calendar", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      remove: (id: string) => request<void>(`/calendar/${id}`, { method: "DELETE" }),
    },
    devices: {
      register: (input: RegisterDeviceInput) =>
        request<DeviceToken>("/devices", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      unregister: (token: string) =>
        request<void>(`/devices/${encodeURIComponent(token)}`, { method: "DELETE" }),
    },
    uploads: {
      /**
       * `file` is a browser File/Blob on web, or a `{ uri, name, type }`
       * descriptor on React Native — both are accepted by the FormData
       * implementation in their respective runtimes.
       */
      upload: (
        file: Blob | { uri: string; name: string; type: string },
        purpose: UploadPurpose,
      ) => {
        const form = new FormData();
        form.append("file", file as Blob);
        form.append("purpose", purpose);
        return upload(form);
      },
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
