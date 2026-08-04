import { Body, Controller, Post, UsePipes } from "@nestjs/common";
import { loginSchema, type LoginInput } from "@skolara/types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput) {
    return this.authService.login(body);
  }
}
