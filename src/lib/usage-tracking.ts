import { Polar } from "@polar-sh/sdk";
import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";

export class UsageTracker {
  private polar: Polar;
  private llmIngestion: any;

  constructor() {
    this.polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
    });

    // Setup LLM ingestion strategy
    this.llmIngestion = Ingestion({ accessToken: process.env.POLAR_ACCESS_TOKEN! })
      .strategy(new LLMStrategy(openai("gpt-5")))
      .ingest("ai_usage");
  }

  // Track AI model usage
  async trackAIUsage(userId: string, promptTokens: number, completionTokens: number, model: string) {
    await this.polar.events.ingest({
      events: [{
        name: "ai_usage",
        externalCustomerId: userId,
        metadata: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          model
        }
      }]
    });
  }

  // Track tool usage costs
  async trackToolUsage(userId: string, toolName: string, cost: number, metadata: any = {}) {
    await this.polar.events.ingest({
      events: [{
        name: "tool_usage",
        externalCustomerId: userId,
        metadata: {
          tool: toolName,
          cost: cost * 1.2, // 20% markup
          ...metadata
        }
      }]
    });
  }

  // Get wrapped model for LLM usage tracking
  getTrackedModel(userId: string, _baseModel: any) {
    return this.llmIngestion.client({
      customerId: userId
    });
  }
}