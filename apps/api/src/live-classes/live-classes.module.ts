import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { LiveClassesController } from "./live-classes.controller";
import { LiveClassesService } from "./live-classes.service";

@Module({
  controllers: [LiveClassesController],
  providers: [LiveClassesService, ClassAccessService, StudentAccessService],
})
export class LiveClassesModule {}
