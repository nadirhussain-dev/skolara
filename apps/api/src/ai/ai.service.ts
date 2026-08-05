import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

export interface ReportCommentContext {
  firstName: string;
  subject: string;
  marksObtained: number;
  maxMarks: number;
}

export interface DefaulterRiskContext {
  firstName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(@Optional() private config?: ConfigService) {
    const apiKey = this.config?.get<string>("ANTHROPIC_API_KEY");
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateReportComment(ctx: ReportCommentContext): Promise<string> {
    const percentage = Math.round((ctx.marksObtained / ctx.maxMarks) * 100);

    if (!this.client) {
      return this.fallbackReportComment(ctx, percentage);
    }

    try {
      const message = await this.client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        messages: [
          {
            role: "user",
            content: `Write one short, warm, constructive report-card comment (2 sentences max) for a student named ${ctx.firstName} who scored ${ctx.marksObtained}/${ctx.maxMarks} (${percentage}%) in ${ctx.subject}. Address the student directly. No preamble, just the comment.`,
          },
        ],
      });
      const text = message.content.find((block) => block.type === "text");
      return text?.type === "text" ? text.text.trim() : this.fallbackReportComment(ctx, percentage);
    } catch (error) {
      this.logger.warn(`AI report comment generation failed: ${error}`);
      return this.fallbackReportComment(ctx, percentage);
    }
  }

  async explainDefaulterRisk(ctx: DefaulterRiskContext): Promise<string> {
    if (!this.client) {
      return this.fallbackRiskExplanation(ctx);
    }

    try {
      const message = await this.client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `A school fee-collection system flagged ${ctx.firstName}'s family as ${ctx.riskLevel} risk of missing their next payment, based on: ${ctx.reasons.join("; ")}. Write one short, neutral sentence a school admin could read before calling the family. No preamble.`,
          },
        ],
      });
      const text = message.content.find((block) => block.type === "text");
      return text?.type === "text" ? text.text.trim() : this.fallbackRiskExplanation(ctx);
    } catch (error) {
      this.logger.warn(`AI risk explanation failed: ${error}`);
      return this.fallbackRiskExplanation(ctx);
    }
  }

  private fallbackRiskExplanation(ctx: DefaulterRiskContext): string {
    return `${ctx.firstName}'s family is flagged as ${ctx.riskLevel} risk: ${ctx.reasons.join(", ")}.`;
  }

  private fallbackReportComment(ctx: ReportCommentContext, percentage: number): string {
    if (percentage >= 80) {
      return `${ctx.firstName} showed excellent understanding of ${ctx.subject} this term. Keep up the great work!`;
    }
    if (percentage >= 50) {
      return `${ctx.firstName} is making steady progress in ${ctx.subject}. Continued practice will help build further confidence.`;
    }
    return `${ctx.firstName} needs additional support in ${ctx.subject} this term. We recommend extra practice and a follow-up with the teacher.`;
  }
}
