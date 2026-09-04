import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { HostelController } from "./hostel.controller";
import { HostelService } from "./hostel.service";

@Module({
  controllers: [HostelController],
  providers: [HostelService, StudentAccessService],
})
export class HostelModule {}
