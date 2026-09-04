import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { StudyMaterialsController } from "./study-materials.controller";
import { StudyMaterialsService } from "./study-materials.service";

@Module({
  controllers: [StudyMaterialsController],
  providers: [StudyMaterialsService, ClassAccessService, StudentAccessService],
})
export class StudyMaterialsModule {}
