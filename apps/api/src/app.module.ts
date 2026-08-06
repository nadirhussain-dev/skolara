import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { BankStatementModule } from "./bank-statement/bank-statement.module";
import { ClassesModule } from "./classes/classes.module";
import { ComplaintsModule } from "./complaints/complaints.module";
import { ExamsModule } from "./exams/exams.module";
import { GradesModule } from "./grades/grades.module";
import { HealthModule } from "./health/health.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { LibraryModule } from "./library/library.module";
import { MessagingModule } from "./messaging/messaging.module";
import { NoticesModule } from "./notices/notices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentGatewayModule } from "./payment-gateway/payment-gateway.module";
import { PaymentsModule } from "./payments/payments.module";
import { PayrollModule } from "./payroll/payroll.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SchoolGroupsModule } from "./school-groups/school-groups.module";
import { SchoolsModule } from "./schools/schools.module";
import { StudentsModule } from "./students/students.module";
import { TeachersModule } from "./teachers/teachers.module";
import { TransportModule } from "./transport/transport.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    NotificationsModule,
    AiModule,
    AuthModule,
    SchoolsModule,
    SchoolGroupsModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    AttendanceModule,
    InvoicesModule,
    PaymentsModule,
    PaymentGatewayModule,
    BankStatementModule,
    GradesModule,
    NoticesModule,
    AssignmentsModule,
    MessagingModule,
    ComplaintsModule,
    ExamsModule,
    LibraryModule,
    TransportModule,
    PayrollModule,
    AnalyticsModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
