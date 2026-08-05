import { Module } from "@nestjs/common";
import { StudentAccessService } from "../common/student-access.service";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";

@Module({
  controllers: [LibraryController],
  providers: [LibraryService, StudentAccessService],
})
export class LibraryModule {}
