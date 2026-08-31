import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { TimetableController } from "./timetable.controller";
import { TimetableService } from "./timetable.service";

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, StudentAccessService],
})
export class TimetableModule {}
