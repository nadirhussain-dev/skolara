import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { ClassAccessService } from "../common/class-access.service";
import { GradesController } from "./grades.controller";
import { GradesService } from "./grades.service";

@Module({
  controllers: [GradesController],
  providers: [GradesService, StudentAccessService, ClassAccessService],
})
export class GradesModule {}
