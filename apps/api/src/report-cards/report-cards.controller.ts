import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BadRequestException } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ClassAccessService } from "../common/class-access.service";
import { FeatureGuard } from "../common/guards/feature.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ReportCardsService } from "./report-cards.service";

// Report cards sit behind the same gate as the exams module they draw from.
@ApiTags("report-cards")
@ApiBearerAuth()
@Controller("report-cards")
@RequiresFeature("EXAMS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class ReportCardsController {
  constructor(
    private reportCards: ReportCardsService,
    private studentAccess: StudentAccessService,
    private classAccess: ClassAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  private requireTerm(term?: string): string {
    if (!term) throw new BadRequestException("A term is required");
    return term;
  }

  /**
   * POST rather than GET: this renders a document and writes it to storage,
   * so it isn't safe to retry blindly or cache.
   */
  @Post("student/:studentId")
  @Roles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT")
  async forStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("term") term?: string,
  ) {
    // Parents and students may only generate their own — the role guard above
    // only establishes that they're one of those things.
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.reportCards.forStudent(
      this.schoolOf(user),
      studentId,
      this.requireTerm(term),
    );
  }

  @Post("class/:classId")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  async forClass(
    @Param("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("term") term?: string,
  ) {
    // A teacher can only bulk-generate for a class they actually teach.
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.reportCards.forClass(
      this.schoolOf(user),
      classId,
      this.requireTerm(term),
    );
  }
}
