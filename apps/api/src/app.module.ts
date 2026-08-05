import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { ClassesModule } from "./classes/classes.module";
import { GradesModule } from "./grades/grades.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { NoticesModule } from "./notices/notices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SchoolsModule } from "./schools/schools.module";
import { StudentsModule } from "./students/students.module";
import { TeachersModule } from "./teachers/teachers.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    SchoolsModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    AttendanceModule,
    InvoicesModule,
    PaymentsModule,
    GradesModule,
    NoticesModule,
  ],
})
export class AppModule {}
