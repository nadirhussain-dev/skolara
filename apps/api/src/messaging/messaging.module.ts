import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({
  controllers: [MessagingController],
  providers: [MessagingService, StudentAccessService],
})
export class MessagingModule {}
