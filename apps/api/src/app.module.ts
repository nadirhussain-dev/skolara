import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "./ai/ai.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { BankStatementModule } from "./bank-statement/bank-statement.module";
import { BroadcastsModule } from "./broadcasts/broadcasts.module";
import { CalendarModule } from "./calendar/calendar.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { ClassesModule } from "./classes/classes.module";
import { ComplaintsModule } from "./complaints/complaints.module";
import { DevicesModule } from "./devices/devices.module";
import { DocumentsModule } from "./documents/documents.module";
import { ExamsModule } from "./exams/exams.module";
import { ExportModule } from "./export/export.module";
import { GradesModule } from "./grades/grades.module";
import { HealthModule } from "./health/health.module";
import { HostelModule } from "./hostel/hostel.module";
import { InventoryModule } from "./inventory/inventory.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { AbsencesModule } from "./absences/absences.module";
import { LeaveModule } from "./leave/leave.module";
import { LessonsModule } from "./lessons/lessons.module";
import { LibraryModule } from "./library/library.module";
import { LiveClassesModule } from "./live-classes/live-classes.module";
import { MeetingsModule } from "./meetings/meetings.module";
import { MessagingModule } from "./messaging/messaging.module";
import { NoticesModule } from "./notices/notices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentGatewayModule } from "./payment-gateway/payment-gateway.module";
import { PaymentsModule } from "./payments/payments.module";
import { PayrollModule } from "./payroll/payroll.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { ReportCardsModule } from "./report-cards/report-cards.module";
import { ReportsModule } from "./reports/reports.module";
import { RoleTemplatesModule } from "./role-templates/role-templates.module";
import { SchoolGroupsModule } from "./school-groups/school-groups.module";
import { SchoolsModule } from "./schools/schools.module";
import { StorageModule } from "./storage/storage.module";
import { StudentsModule } from "./students/students.module";
import { StudyMaterialsModule } from "./study-materials/study-materials.module";
import { SupportModule } from "./support/support.module";
import { TeachersModule } from "./teachers/teachers.module";
import { TimetableModule } from "./timetable/timetable.module";
import { TransportModule } from "./transport/transport.module";
import { UsersModule } from "./users/users.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { PermissionGuard } from "./common/guards/permission.guard";
import { validateEnv } from "./env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Default: 100 requests / minute per IP across the API. Individual routes
    // (e.g. login) can tighten this further with @Throttle(...).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    HealthModule,
    NotificationsModule,
    StorageModule,
    DocumentsModule,
    AiModule,
    AuthModule,
    DevicesModule,
    SchoolsModule,
    ReportCardsModule,
    ReportsModule,
    RoleTemplatesModule,
    SchoolGroupsModule,
    UsersModule,
    StudentsModule,
    StudyMaterialsModule,
    SupportModule,
    TeachersModule,
    TimetableModule,
    ClassesModule,
    BroadcastsModule,
    CalendarModule,
    CertificatesModule,
    AttendanceModule,
    InvoicesModule,
    PaymentsModule,
    PaymentGatewayModule,
    BankStatementModule,
    GradesModule,
    QuizzesModule,
    NoticesModule,
    AssignmentsModule,
    MeetingsModule,
    MessagingModule,
    ComplaintsModule,
    ExamsModule,
    ExportModule,
    AbsencesModule,
    LeaveModule,
    HostelModule,
    InventoryModule,
    LessonsModule,
    LibraryModule,
    LiveClassesModule,
    TransportModule,
    PayrollModule,
    AnalyticsModule,
    ApiKeysModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global rather than per-controller, for the same reason the audit
    // interceptor is: a new endpoint falls under a user's access template the
    // moment it exists, instead of whenever somebody remembers to annotate it.
    // A no-op for every account without a template, which is all of them until
    // a school builds one.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Global rather than per-controller: a new write endpoint is audited the
    // moment it exists, instead of whenever someone remembers to add it.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
