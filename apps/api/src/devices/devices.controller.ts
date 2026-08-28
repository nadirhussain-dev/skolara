import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { registerDeviceSchema, type RegisterDeviceInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { DevicesService } from "./devices.service";

@ApiTags("devices")
@ApiBearerAuth()
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post()
  register(
    @Body(new ZodValidationPipe(registerDeviceSchema)) body: RegisterDeviceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devicesService.register(user.id, body);
  }

  @Delete(":token")
  @HttpCode(204)
  unregister(@Param("token") token: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.unregister(user.id, token);
  }
}
