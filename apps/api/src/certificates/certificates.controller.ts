import { Body, Controller, ForbiddenException, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { issueCertificateSchema, type IssueCertificateInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { CertificatesService } from "./certificates.service";

@ApiTags("certificates")
@ApiBearerAuth()
@Controller("certificates")
@UseGuards(JwtAuthGuard, RolesGuard)
// School admins only. A certificate is the school formally asserting
// something about a student to a third party — not something a teacher,
// parent or student issues for themselves.
@Roles("SCHOOL_ADMIN")
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}

  @Post()
  issue(
    @Body(new ZodValidationPipe(issueCertificateSchema)) body: IssueCertificateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.certificates.issue(user.schoolId, body);
  }
}
