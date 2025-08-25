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
        console.error('[PolarEvents] POLAR_ACCESS_TOKEN not configured for production');
        throw new Error('Polar access token required for production event tracking');
      }
      
      this.polar = new Polar({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
      });
      
      console.log('[PolarEvents] Polar client initialized for production');
    } else {
      console.log('[PolarEvents] Development mode detected - Polar events disabled');
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
      console.log('[PolarEvents] Skipping Valyu API tracking (development mode)');
      return;
    }

    // Input validation
    if (!userId || !sessionId || !toolName) {
      console.error('[PolarEvents] Missing required parameters for Valyu API tracking');
      return;
    }

    if (valyuCostDollars < 0) {
      console.error('[PolarEvents] Invalid Valyu API cost:', valyuCostDollars);
      return;
    }

    // Skip zero-cost API calls
    if (valyuCostDollars === 0) {
      console.log('[PolarEvents] Skipping zero-cost Valyu API call');
      return;
    }

    try {
      // Calculate billable amount with 20% markup, multiply by 100 for $0.01 unit pricing
      // Example: $0.05 cost * 1.2 markup * 100 = 6 units at $0.01 each = $0.06 total
      const markupMultiplier = 1.2; // 20% markup
      const billableAmount = Math.ceil(valyuCostDollars * markupMultiplier * 100);

      console.log(`[PolarEvents] Tracking Valyu API usage: ${toolName}`, {
        userId,
        sessionId,
        valyuCostDollars,
        billableAmount,
        finalCost: billableAmount * 0.01
      });

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

      console.log('[PolarEvents] Valyu API usage sent to Polar successfully');
    } catch (error) {
      console.error('[PolarEvents] Error sending Valyu API usage to Polar:', error);
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
      console.log('[PolarEvents] Skipping Daytona tracking (development mode)');
      return;
    }

    // Input validation
    if (!userId || !sessionId) {
      console.error('[PolarEvents] Missing required parameters for Daytona tracking');
      return;
    }

    if (executionTimeMs < 0) {
      console.error('[PolarEvents] Invalid execution time:', executionTimeMs);
      return;
    }

    try {
      // Calculate cost: $0.001 per second base cost
      const executionSeconds = Math.max(executionTimeMs / 1000, 0.1); // Minimum 0.1 seconds
      const baseCostDollars = executionSeconds * 0.001;
      
      // Apply 20% markup and multiply by 100 for $0.01 unit pricing
      const markupMultiplier = 1.2;
      const billableAmount = Math.ceil(baseCostDollars * markupMultiplier * 100);

      console.log(`[PolarEvents] Tracking Daytona execution:`, {
        userId,
        sessionId,
        executionTimeMs,
        executionSeconds,
        baseCostDollars,
        billableAmount,
        finalCost: billableAmount * 0.01
      });

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

      console.log('[PolarEvents] Daytona usage sent to Polar successfully');
    } catch (error) {
      console.error('[PolarEvents] Error sending Daytona usage to Polar:', error);
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
      console.log('[PolarEvents] Skipping dark mode tracking (development mode)');
      return;
    }

    // Input validation
    if (!userId || !sessionId) {
      console.error('[PolarEvents] Missing required parameters for dark mode tracking');
      return;
    }

    try {
      // Fixed $0.01 charge per toggle (1 unit at $0.01 pricing)
      const billableAmount = 1;

      console.log(`[PolarEvents] Tracking dark mode switch: ${fromTheme} → ${toTheme}`, {
        userId,
        sessionId,
        billableAmount,
        finalCost: billableAmount * 0.01
      });

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

      console.log('[PolarEvents] Dark mode switch sent to Polar successfully');
    } catch (error) {
      console.error('[PolarEvents] Error sending dark mode switch to Polar:', error);
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