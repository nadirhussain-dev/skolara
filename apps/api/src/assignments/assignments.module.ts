import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { AssignmentsController } from "./assignments.controller";
import { AssignmentsService } from "./assignments.service";

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, StudentAccessService],
})
export class AssignmentsModule {}
