import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  createBudgetCategorySchema,
  createExpenseSchema,
  expenseStatusSchema,
  monthKeySchema,
  reviewExpenseSchema,
  setBudgetSchema,
  type CreateBudgetCategoryInput,
  type CreateExpenseInput,
  type ExpenseStatus,
  type ReviewExpenseInput,
  type SetBudgetInput,
} from "@skolara/types";
import { z } from "zod";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FinanceService, monthKey } from "./finance.service";

const archiveSchema = z.object({ archived: z.boolean() });
const copyBudgetSchema = z.object({ month: monthKeySchema });

function schoolOf(user: AuthenticatedUser): string {
  if (!user.schoolId) throw new ForbiddenException("No school context");
  return user.schoolId;
}

/** Validates an optional `?month=`; a missing one means the current month. */
function parseMonth(value: string | undefined, fallbackToNow: boolean): string | undefined {
  if (value === undefined || value === "") {
    return fallbackToNow ? monthKey(new Date()) : undefined;
  }
  const parsed = monthKeySchema.safeParse(value);
  if (!parsed.success) throw new BadRequestException("Month must look like 2026-10");
  return parsed.data;
}

/**
 * School money: budget, expenses and the monthly picture.
 * School admins only — teachers, parents and students never see it.
 */
@Controller("finance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SCHOOL_ADMIN")
export class FinanceController {
  constructor(private finance: FinanceService) {}

  @Get("overview")
  overview(@CurrentUser() user: AuthenticatedUser, @Query("month") month?: string) {
    return this.finance.overview(schoolOf(user), parseMonth(month, true) as string);
  }

  @Get("categories")
  categories(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.categories(schoolOf(user));
  }

  @Post("categories")
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBudgetCategorySchema)) body: CreateBudgetCategoryInput,
  ) {
    return this.finance.createCategory(schoolOf(user), body);
  }

  @Patch("categories/:id")
  archiveCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(archiveSchema)) body: { archived: boolean },
  ) {
    return this.finance.setCategoryArchived(schoolOf(user), id, body.archived);
  }

  @Put("budget")
  setBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(setBudgetSchema)) body: SetBudgetInput,
  ) {
    return this.finance.setBudget(schoolOf(user), body);
  }

  @Post("budget/copy-previous")
  copyPrevious(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(copyBudgetSchema)) body: { month: string },
  ) {
    return this.finance.copyPreviousBudget(schoolOf(user), body.month);
  }

  @Get("expenses")
  expenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query("month") month?: string,
    @Query("status") status?: string,
  ) {
    let parsedStatus: ExpenseStatus | undefined;
    if (status !== undefined && status !== "") {
      const parsed = expenseStatusSchema.safeParse(status);
      if (!parsed.success) throw new BadRequestException("Unknown status");
      parsedStatus = parsed.data;
    }
    return this.finance.expenses(schoolOf(user), {
      month: parseMonth(month, false),
      status: parsedStatus,
    });
  }

  @Post("expenses")
  createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createExpenseSchema)) body: CreateExpenseInput,
  ) {
    return this.finance.createExpense(schoolOf(user), user.id, body);
  }

  @Post("expenses/:id/review")
  reviewExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewExpenseSchema)) body: ReviewExpenseInput,
  ) {
    return this.finance.reviewExpense(schoolOf(user), user.id, id, body);
  }

  @Delete("expenses/:id")
  deleteExpense(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.finance.deleteExpense(schoolOf(user), id);
  }
}
