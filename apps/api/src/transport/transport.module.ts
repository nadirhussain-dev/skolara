import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { TransportController } from "./transport.controller";
import { TransportService } from "./transport.service";

@Module({
  controllers: [TransportController],
  providers: [TransportService, StudentAccessService],
})
export class TransportModule {}
