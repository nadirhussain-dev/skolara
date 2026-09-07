import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  leaveStatusSchema,
  requestAbsenceSchema,
  reviewAbsenceSchema,
  type LeaveStatus,
  type RequestAbsenceInput,
  type ReviewAbsenceInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { AbsencesService } from "./absences.service";

@ApiTags("absences")
@ApiBearerAuth()
@Controller("absences")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(
    private absences: AbsencesService,
    private studentAccess: StudentAccessService,
    private prisma: PrismaService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  /**
   * Families only. A teacher or admin who wants a pupil marked away edits the
   * register directly — routing that through a request they would then
   * approve themselves is a loop with nobody on the other end of it.
   */
  @Post()
  @Roles("PARENT", "STUDENT")
  async request(
    @Body(new ZodValidationPipe(requestAbsenceSchema)) body: RequestAbsenceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, body.studentId);
    return this.absences.request(this.schoolOf(user), user.id, body);
  }

  /**
   * A parent's children, or a student themselves.
   *
   * Resolved from the caller's own links rather than taken as a parameter, so
   * there is no id to tamper with.
   */
  @Get("mine")
  @Roles("PARENT", "STUDENT")
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.absences.findForStudents(await this.studentIdsFor(user));
  }

  @Get()
  @Roles("SCHOOL_ADMIN")
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    const parsed = status ? leaveStatusSchema.safeParse(status) : null;
    return this.absences.findForSchool(
      this.schoolOf(user),
      parsed?.success ? (parsed.data as LeaveStatus) : undefined,
    );
  }

  @Patch(":id/review")
  @Roles("SCHOOL_ADMIN")
  review(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewAbsenceSchema)) body: ReviewAbsenceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.absences.review(this.schoolOf(user), id, user.id, body);
  }

  @Patch(":id/cancel")
  @Roles("PARENT", "STUDENT")
  cancel(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.absences.cancel(user.id, id);
  }

  private async studentIdsFor(user: AuthenticatedUser): Promise<string[]> {
    if (user.role === "STUDENT") {
      const own = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      return own ? [own.id] : [];
    }
    const children = await this.prisma.studentProfile.findMany({
      where: { parentLinks: { some: { parentUserId: user.id } } },
      select: { id: true },
    });
    return children.map((child) => child.id);
  }
}
