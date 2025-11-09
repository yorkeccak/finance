import { Polar } from "@polar-sh/sdk";

export class PolarEventTracker {
  private polar: Polar | null = null;
  private isDevelopment: boolean;

  constructor() {
    // Check environment consistently with chat API
    this.isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
    
    // Only initialize Polar in production
    if (!this.isDevelopment) {
      if (!process.env.POLAR_ACCESS_TOKEN) {
        throw new Error('Polar access token required for production event tracking');
      }
      
      this.polar = new Polar({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
      });
      
    } else {
    }
  }

  /**
   * Track Valyu API usage
   * Uses actual cost from Valyu API response, multiplied by 100 for $0.01 unit pricing
   */
  async trackValyuAPIUsage(
    userId: string,
    sessionId: string,
    toolName: string,
    valyuCostDollars: number,
    metadata: any = {}
  ) {
    // Skip in development
    if (this.isDevelopment || !this.polar) {
      return;
    }

    // Input validation
    if (!userId || !sessionId || !toolName) {
      return;
    }

    if (valyuCostDollars < 0) {
      return;
    }

    // Skip zero-cost API calls
    if (valyuCostDollars === 0) {
      return;
    }

    try {
      // Calculate billable amount with 20% markup, multiply by 100 for $0.01 unit pricing
      // Example: $0.05 cost * 1.2 markup * 100 = 6 units at $0.01 each = $0.06 total
      const markupMultiplier = 1.2; // 20% markup
      const billableAmount = Math.ceil(valyuCostDollars * markupMultiplier * 100);

      
      // Send event to Polar
      await this.polar.events.ingest({
        events: [{
          name: 'valyu_api_usage',
          externalCustomerId: userId,
          metadata: {
            billable_amount: billableAmount, // This will be summed in Polar meter
            tool_name: toolName,
            session_id: sessionId,
            valyu_cost_dollars: valyuCostDollars,
            markup_multiplier: markupMultiplier,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }]
      });

    } catch (error) {
    }
  }

  /**
   * Track Daytona code execution usage
   * Uses execution time in milliseconds, converted to billable units
   */
  async trackDaytonaUsage(
    userId: string,
    sessionId: string,
    executionTimeMs: number,
    metadata: any = {}
  ) {
    // Skip in development
    if (this.isDevelopment || !this.polar) {
      return;
    }

    // Input validation
    if (!userId || !sessionId) {
      return;
    }

    if (executionTimeMs < 0) {
      return;
    }

    try {
      // Calculate cost: $0.001 per second base cost
      const executionSeconds = Math.max(executionTimeMs / 1000, 0.1); // Minimum 0.1 seconds
      const baseCostDollars = executionSeconds * 0.001;
      
      // Apply 20% markup and multiply by 100 for $0.01 unit pricing
      const markupMultiplier = 1.2;
      const billableAmount = Math.ceil(baseCostDollars * markupMultiplier * 100);

      
      // Send event to Polar
      await this.polar.events.ingest({
        events: [{
          name: 'daytona_execution',
          externalCustomerId: userId,
          metadata: {
            billable_amount: billableAmount, // This will be summed in Polar meter
            execution_time_ms: executionTimeMs,
            execution_time_seconds: executionSeconds,
            session_id: sessionId,
            base_cost_dollars: baseCostDollars,
            markup_multiplier: markupMultiplier,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }]
      });

    } catch (error) {
    }
  }

  /**
   * Track dark mode theme switching usage
   * $0.01 per toggle for pay-per-use plan
   */
  async trackDarkModeSwitch(
    userId: string,
    sessionId: string,
    fromTheme: string,
    toTheme: string,
    metadata: any = {}
  ) {
    // Skip in development
    if (this.isDevelopment || !this.polar) {
      return;
    }

    // Input validation
    if (!userId || !sessionId) {
      return;
    }

    try {
      // Fixed $0.01 charge per toggle (1 unit at $0.01 pricing)
      const billableAmount = 1;

      
      // Send event to Polar
      await this.polar.events.ingest({
        events: [{
          name: 'dark_mode_switcher',
          externalCustomerId: userId,
          metadata: {
            dark_mode_switcher: 1,
            billable_amount: billableAmount, // This will be summed in Polar meter
            from_theme: fromTheme,
            to_theme: toTheme,
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }]
      });

    } catch (error) {
    }
  }

  /**
   * Check if user should be tracked for billing
   */
  async shouldTrackUsage(userId: string): Promise<boolean> {
    // Skip in development
    if (this.isDevelopment) return false;
    
    // In production, we'll track for pay-per-use users
    // This will be used in tools to determine if events should be sent
    return true; // Let Polar handle the customer tier logic
  }
}