import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { ComplaintsController } from "./complaints.controller";
import { ComplaintsService } from "./complaints.service";

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService, StudentAccessService],
})
export class ComplaintsModule {}
