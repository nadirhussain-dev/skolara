import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  borrowBookSchema,
  createBookSchema,
  type BorrowBookInput,
  type CreateBookInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { LibraryService } from "./library.service";

@Controller("library")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(
    private libraryService: LibraryService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post("books")
  @Roles("SCHOOL_ADMIN")
  createBook(
    @Body(new ZodValidationPipe(createBookSchema)) body: CreateBookInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.libraryService.createBook(user.schoolId, body);
  }

  @Get("books")
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  findBooks(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.libraryService.findBooks(user.schoolId);
  }

  @Post("loans")
  @Roles("SCHOOL_ADMIN")
  borrow(
    @Body(new ZodValidationPipe(borrowBookSchema)) body: BorrowBookInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.libraryService.borrow(user.schoolId, body);
  }

  @Patch("loans/:id/return")
  @Roles("SCHOOL_ADMIN")
  returnBook(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.libraryService.returnBook(user.schoolId, id);
  }

  @Get("loans/student/:studentId")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  async findLoansForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.libraryService.findLoansForStudent(user.schoolId, studentId);
  }
}
