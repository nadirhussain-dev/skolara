import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, ClassAccessService, StudentAccessService],
})
export class AttendanceModule {}
