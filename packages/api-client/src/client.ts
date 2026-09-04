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
  CreateBroadcastInput,
  PlatformBroadcast,
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
  StudyMaterial,
  PublishStudyMaterialInput,
  CreateQuizInput,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionForStudent,
  ReplaceQuizQuestionsInput,
  SaveQuizAnswerInput,
  AddSyllabusTopicsInput,
  LessonPlan,
  SyllabusCoverage,
  SyllabusTopic,
  UpdateSyllabusTopicInput,
  UpsertLessonPlanInput,
  LiveClass,
  UpsertLiveClassInput,
  StudentPerformance,
  AllocateHostelBedInput,
  HostelAllocation,
  HostelOccupancy,
  HostelRoom,
  HostelSummary,
  UpsertHostelRoomInput,
  AssetAssignment,
  InventoryItem,
  InventorySummary,
  IssueAssetInput,
  ReturnAssetInput,
  UpsertInventoryItemInput,
  AssignRoleTemplateInput,
  CAPABILITY_GROUPS,
  ROLE_TEMPLATE_PRESETS,
  RoleTemplate,
  TEMPLATABLE_ROLES,
  UpsertRoleTemplateInput,
  HealthDetail,
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

export interface StudyMaterialDetail extends StudyMaterial {
  uploadedByUser: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string; section: string };
}

export interface QuizSummary extends Quiz {
  class: { id: string; name: string; section: string };
  _count: { questions: number; attempts: number };
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
  class: { id: string; name: string; section: string };
  _count: { attempts: number };
}

/** A student's own view of a quiz: never the questions, never the answer key. */
export interface QuizForStudent extends Quiz {
  totalMarks: number;
  isOpen: boolean;
  canAttempt: boolean;
  _count: { questions: number };
  attempts: Pick<
    QuizAttempt,
    | "id"
    | "attemptNumber"
    | "status"
    | "startedAt"
    | "expiresAt"
    | "submittedAt"
    | "score"
    | "maxScore"
  >[];
}

/** The paper as handed to a student mid-attempt. */
export interface QuizAttemptPaper extends QuizAttempt {
  quiz: Quiz;
  questions: QuizQuestionForStudent[];
  answers: Pick<QuizAnswer, "questionId" | "selectedIndex">[];
}

/** The marked paper, released only once the attempt is settled. */
export interface QuizAttemptResult extends QuizAttempt {
  quiz: Quiz;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    marks: number;
    correctIndex: number;
    selectedIndex: number | null;
    isCorrect: boolean;
    marksAwarded: number;
  }[];
}

export interface QuizAttemptWithQuiz extends QuizAttempt {
  quiz: { id: string; title: string; subject: string };
}

export interface QuizResults {
  quizId: string;
  maxScore: number;
  rows: {
    student: {
      id: string;
      admissionNumber: string;
      user: { firstName: string; lastName: string };
    };
    attemptCount: number;
    bestScore: number | null;
    percentage: number | null;
    lastStatus: QuizAttempt["status"] | null;
  }[];
}

export interface SyllabusTopicWithCounts extends SyllabusTopic {
  _count: { lessons: number };
}

export interface LessonPlanDetail extends LessonPlan {
  topic: { id: string; title: string; status: SyllabusTopic["status"] } | null;
  period: { id: string; name: string; startTime: string; endTime: string } | null;
  teacherUser: { id: string; firstName: string; lastName: string };
}

export interface LiveClassDetail extends LiveClass {
  hostUser: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string; section: string };
}

/**
 * A student's view. `meetingUrl` is null until `joinableFrom` and again once
 * the lesson ends — the API withholds it, so this is not a UI convention the
 * client could choose to ignore.
 */
export interface JoinableLiveClass {
  id: string;
  classId: string;
  subject: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  hostUser: { id: string; firstName: string; lastName: string };
  meetingUrl: string | null;
  joinable: boolean;
  joinableFrom: Date;
}

export interface HostelRoomWithOccupancy extends HostelOccupancy {
  notes: string | null;
}

export interface HostelResident extends HostelAllocation {
  student: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string; phone: string | null };
    class: { id: string; name: string; section: string } | null;
  };
}

export interface HostelRoomDetail extends HostelRoom {
  residents: HostelResident[];
  past: HostelResident[];
  freeBeds: number[];
}

export interface HostelAllocationWithRoom extends HostelAllocation {
  room: { id: string; blockName: string; roomNumber: string; floor: number | null };
}

export interface InventoryItemWithAvailability
  extends Omit<InventoryItem, "purchaseCostPkr"> {
  purchaseCostPkr: number | null;
  /** quantity minus what is out. */
  available: number;
  /** Available *and* in a condition that may go out again. */
  issuable: boolean;
}

export interface AssetAssignmentDetail extends AssetAssignment {
  item: { id: string; name: string; category: string; assetTag: string | null };
  assignedToUser: { id: string; firstName: string; lastName: string; role: string } | null;
  class: { id: string; name: string; section: string } | null;
}

export interface InventoryItemDetail extends InventoryItemWithAvailability {
  out: AssetAssignmentDetail[];
  history: AssetAssignmentDetail[];
}

export interface RoleTemplateWithCount extends RoleTemplate {
  _count: { users: number };
}

export interface RoleTemplateDetail extends RoleTemplate {
  users: { id: string; firstName: string; lastName: string; email: string; role: RoleType }[];
}

export interface CapabilityCatalogue {
  groups: typeof CAPABILITY_GROUPS;
  presets: typeof ROLE_TEMPLATE_PRESETS;
  templatableRoles: typeof TEMPLATABLE_ROLES;
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
  async function requestText(
    path: string,
    { accept = "text/csv", isRetry = false }: { accept?: string; isRetry?: boolean } = {},
  ): Promise<string> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: accept,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry && getRefreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) return requestText(path, { accept, isRetry: true });
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
      /** Every student in the school — hostel and inventory aren't per class. */
      all: () => request<StudentWithUser[]>("/students"),
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
      performance: (studentId: string, subject?: string) =>
        request<StudentPerformance>(
          `/grades/student/${studentId}/performance${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
        ),
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
    broadcasts: {
      create: (input: CreateBroadcastInput) =>
        request<PlatformBroadcast>("/broadcasts", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      active: () => request<PlatformBroadcast[]>("/broadcasts/active"),
      list: () => request<PlatformBroadcast[]>("/broadcasts"),
      withdraw: (id: string) => request<void>(`/broadcasts/${id}`, { method: "DELETE" }),
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
    health: {
      /** Guarded — the two probes a load balancer uses stay unauthenticated. */
      detail: () => request<HealthDetail>("/health/detail"),
    },
    roleTemplates: {
      catalogue: () => request<CapabilityCatalogue>("/role-templates/catalogue"),
      create: (input: UpsertRoleTemplateInput) =>
        request<RoleTemplate>("/role-templates", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      list: () => request<RoleTemplateWithCount[]>("/role-templates"),
      findOne: (id: string) => request<RoleTemplateDetail>(`/role-templates/${id}`),
      update: (id: string, input: UpsertRoleTemplateInput) =>
        request<RoleTemplate>(`/role-templates/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      remove: (id: string) => request<void>(`/role-templates/${id}`, { method: "DELETE" }),
      assign: (userId: string, input: AssignRoleTemplateInput) =>
        request<User>(`/role-templates/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    inventory: {
      createItem: (input: UpsertInventoryItemInput) =>
        request<InventoryItem>("/inventory/items", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateItem: (id: string, input: UpsertInventoryItemInput) =>
        request<InventoryItem>(`/inventory/items/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      removeItem: (id: string) =>
        request<void>(`/inventory/items/${id}`, { method: "DELETE" }),
      items: (
        filters: { category?: string; search?: string; onlyAvailable?: boolean } = {},
      ) => {
        const query = new URLSearchParams();
        if (filters.category) query.set("category", filters.category);
        if (filters.search) query.set("search", filters.search);
        if (filters.onlyAvailable) query.set("onlyAvailable", "true");
        const suffix = query.toString();
        return request<InventoryItemWithAvailability[]>(
          `/inventory/items${suffix ? `?${suffix}` : ""}`,
        );
      },
      itemDetail: (id: string) => request<InventoryItemDetail>(`/inventory/items/${id}`),
      summary: () => request<InventorySummary>("/inventory/summary"),
      categories: () => request<string[]>("/inventory/categories"),
      outstanding: () => request<AssetAssignmentDetail[]>("/inventory/outstanding"),
      issue: (itemId: string, input: IssueAssetInput) =>
        request<AssetAssignmentDetail>(`/inventory/items/${itemId}/assignments`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      returnAsset: (assignmentId: string, input: ReturnAssetInput) =>
        request<AssetAssignmentDetail>(`/inventory/assignments/${assignmentId}/return`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    hostel: {
      createRoom: (input: UpsertHostelRoomInput) =>
        request<HostelRoom>("/hostel/rooms", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateRoom: (id: string, input: UpsertHostelRoomInput) =>
        request<HostelRoom>(`/hostel/rooms/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      removeRoom: (id: string) => request<void>(`/hostel/rooms/${id}`, { method: "DELETE" }),
      rooms: (filters: { blockName?: string; onlyWithFreeBeds?: boolean } = {}) => {
        const query = new URLSearchParams();
        if (filters.blockName) query.set("blockName", filters.blockName);
        if (filters.onlyWithFreeBeds) query.set("onlyWithFreeBeds", "true");
        const suffix = query.toString();
        return request<HostelRoomWithOccupancy[]>(`/hostel/rooms${suffix ? `?${suffix}` : ""}`);
      },
      roomDetail: (id: string) => request<HostelRoomDetail>(`/hostel/rooms/${id}`),
      summary: () => request<HostelSummary>("/hostel/summary"),
      allocate: (roomId: string, input: AllocateHostelBedInput) =>
        request<HostelResident>(`/hostel/rooms/${roomId}/allocations`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      vacate: (allocationId: string) =>
        request<HostelResident>(`/hostel/allocations/${allocationId}/vacate`, {
          method: "PATCH",
        }),
      forStudent: (studentId: string) =>
        request<HostelAllocationWithRoom[]>(`/hostel/student/${studentId}`),
    },
    liveClasses: {
      create: (input: UpsertLiveClassInput) =>
        request<LiveClassDetail>("/live-classes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: UpsertLiveClassInput) =>
        request<LiveClassDetail>(`/live-classes/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      remove: (id: string) => request<void>(`/live-classes/${id}`, { method: "DELETE" }),
      forClass: (classId: string, includePast = false) =>
        request<LiveClassDetail[]>(
          `/live-classes/class/${classId}${includePast ? "?includePast=true" : ""}`,
        ),
      mine: (includePast = false) =>
        request<LiveClassDetail[]>(`/live-classes/mine${includePast ? "?includePast=true" : ""}`),
      forStudent: (studentId: string) =>
        request<JoinableLiveClass[]>(`/live-classes/student/${studentId}`),
    },
    lessons: {
      addTopics: (input: AddSyllabusTopicsInput) =>
        request<{ added: number; requested: number }>("/lessons/topics", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      topicsForClass: (classId: string, filters: { subject?: string; term?: string } = {}) => {
        const query = new URLSearchParams();
        if (filters.subject) query.set("subject", filters.subject);
        if (filters.term) query.set("term", filters.term);
        const suffix = query.toString();
        return request<SyllabusTopicWithCounts[]>(
          `/lessons/topics/class/${classId}${suffix ? `?${suffix}` : ""}`,
        );
      },
      updateTopic: (id: string, input: UpdateSyllabusTopicInput) =>
        request<SyllabusTopic>(`/lessons/topics/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      removeTopic: (id: string) => request<void>(`/lessons/topics/${id}`, { method: "DELETE" }),
      coverage: (classId: string, term?: string) =>
        request<SyllabusCoverage[]>(
          `/lessons/coverage/class/${classId}${term ? `?term=${encodeURIComponent(term)}` : ""}`,
        ),
      createPlan: (input: UpsertLessonPlanInput) =>
        request<LessonPlanDetail>("/lessons/plans", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updatePlan: (id: string, input: UpsertLessonPlanInput) =>
        request<LessonPlanDetail>(`/lessons/plans/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      minePlans: (range: { from?: string; to?: string } = {}) =>
        request<LessonPlanDetail[]>(`/lessons/plans/mine${dateRangeQuery(range)}`),
      plansForClass: (classId: string, range: { from?: string; to?: string } = {}) =>
        request<LessonPlanDetail[]>(`/lessons/plans/class/${classId}${dateRangeQuery(range)}`),
      removePlan: (id: string) => request<void>(`/lessons/plans/${id}`, { method: "DELETE" }),
    },
    quizzes: {
      create: (input: CreateQuizInput) =>
        request<QuizWithQuestions>("/quizzes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      replaceQuestions: (id: string, input: ReplaceQuizQuestionsInput) =>
        request<QuizWithQuestions>(`/quizzes/${id}/questions`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      publish: (id: string) =>
        request<QuizWithQuestions>(`/quizzes/${id}/publish`, { method: "PATCH" }),
      remove: (id: string) => request<void>(`/quizzes/${id}`, { method: "DELETE" }),
      forClass: (classId: string, subject?: string) =>
        request<QuizSummary[]>(
          `/quizzes/class/${classId}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
        ),
      findOne: (id: string) => request<QuizWithQuestions>(`/quizzes/${id}`),
      results: (id: string) => request<QuizResults>(`/quizzes/${id}/results`),
      availableForStudent: (studentId: string) =>
        request<QuizForStudent[]>(`/quizzes/student/${studentId}/available`),
      attemptsForStudent: (studentId: string) =>
        request<QuizAttemptWithQuiz[]>(`/quizzes/student/${studentId}/attempts`),
      startAttempt: (quizId: string) =>
        request<QuizAttemptPaper>(`/quizzes/${quizId}/attempts`, { method: "POST" }),
      saveAnswer: (attemptId: string, input: SaveQuizAnswerInput) =>
        request<{ saved: true; questionId: string }>(`/quizzes/attempts/${attemptId}/answer`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      submitAttempt: (attemptId: string) =>
        request<QuizAttemptResult>(`/quizzes/attempts/${attemptId}/submit`, { method: "POST" }),
    },
    studyMaterials: {
      publish: (input: PublishStudyMaterialInput) =>
        request<StudyMaterialDetail>("/study-materials", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      forClass: (classId: string, subject?: string) =>
        request<StudyMaterialDetail[]>(
          `/study-materials/class/${classId}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
        ),
      subjectsForClass: (classId: string) =>
        request<string[]>(`/study-materials/class/${classId}/subjects`),
      forStudent: (studentId: string, subject?: string) =>
        request<StudyMaterialDetail[]>(
          `/study-materials/student/${studentId}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
        ),
      withdraw: (id: string) => request<void>(`/study-materials/${id}`, { method: "DELETE" }),
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
    exports: {
      tables: () => request<{ tables: string[] }>("/export/tables"),
      /**
       * The whole bundle as text. Fetched through the client rather than a
       * plain link because the route is behind the bearer token, and returned
       * as a string so the caller can hand it straight to a download without
       * a parse-then-restringify round trip.
       */
      schoolJson: () => requestText("/export/school.json", { accept: "application/json" }),
      tableCsv: (table: string) =>
        requestText(`/export/school.csv?table=${encodeURIComponent(table)}`),
      schoolJsonFor: (schoolId: string) =>
        requestText(`/export/school/${schoolId}.json`, { accept: "application/json" }),
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
      /** Staff only — safe for teachers, unlike the full user list. */
      staffDirectory: () => request<User[]>("/users/staff-directory"),
      setActive: (id: string, isActive: boolean) =>
        request<User>(`/users/${id}/active`, {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** `?from=&to=` for the routes that take a date window, omitted when empty. */
function dateRangeQuery(range: { from?: string; to?: string }): string {
  const query = new URLSearchParams();
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}
