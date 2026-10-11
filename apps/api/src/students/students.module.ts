import { Module } from "@nestjs/common";
import { StudentsController } from "./students.controller";
import { ClassAccessService } from "../common/class-access.service";
import { StudentsService } from "./students.service";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, ClassAccessService],
})
export class StudentsModule {}
