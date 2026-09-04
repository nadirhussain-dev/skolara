import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesService } from "./quizzes.service";

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService, ClassAccessService, StudentAccessService],
})
export class QuizzesModule {}
