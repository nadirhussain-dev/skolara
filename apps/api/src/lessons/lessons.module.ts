import { Module } from "@nestjs/common";
import { ClassAccessService } from "../common/class-access.service";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";

@Module({
  controllers: [LessonsController],
  providers: [LessonsService, ClassAccessService],
})
export class LessonsModule {}
