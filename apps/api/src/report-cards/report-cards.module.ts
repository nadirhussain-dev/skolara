import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { ReportCardsController } from "./report-cards.controller";
import { ReportCardsService } from "./report-cards.service";

@Module({
  controllers: [ReportCardsController],
  providers: [ReportCardsService, StudentAccessService, ClassAccessService],
})
export class ReportCardsModule {}
