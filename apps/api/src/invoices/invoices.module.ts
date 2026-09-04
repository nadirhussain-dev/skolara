import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, StudentAccessService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
