import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { ClassAccessService } from "../common/class-access.service";
import { AssignmentsController } from "./assignments.controller";
import { AssignmentsService } from "./assignments.service";

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, StudentAccessService, ClassAccessService],
})
export class AssignmentsModule {}
