export interface MessageMetrics {
  sourcesAnalyzed: number;
  wordsProcessed: number;
  timeSavedMinutes: number;
  moneySaved: number;
  processingTimeMs: number; // Total AI processing time in milliseconds
  breakdown: {
    sourceReadingMinutes: number;
    sourceFindingMinutes: number;
    writingMinutes: number;
    csvCreationMinutes: number;
    chartCreationMinutes: number;
    analysisMinutes: number;
    dataProcessingMinutes: number;
  };
}

const HOURLY_RATE = 200; // $200/hour

// Time estimation constants (in minutes)
const TIME_ESTIMATES = {
  SOURCE_FINDING_BASE: 15,
  SOURCE_FINDING_PER_SOURCE: 8,
  SOURCE_READING_BASE: 30,
  SOURCE_READING_PER_SOURCE: 20,
  WRITING_PER_WORD: 0.2,
  CSV_BASE: 45,
  CSV_PER_ROW: 0.5,
  CHART_PER_CHART: 120,
  ANALYSIS_PER_BLOCK: 60,
  DATA_PROCESSING_PER_EXECUTION: 180,
};

export function calculateMessageMetrics(messageParts: any[]): MessageMetrics {
  let sourcesAnalyzed = 0;
  let wordsProcessed = 0;
  let breakdown = {
    sourceReadingMinutes: 0,
    sourceFindingMinutes: 0,
    writingMinutes: 0,
    csvCreationMinutes: 0,
    chartCreationMinutes: 0,
    analysisMinutes: 0,
    dataProcessingMinutes: 0,
  };

  for (const part of messageParts) {
    // Handle tool parts - the type is like 'tool-financialSearch', 'tool-webSearch', etc.
    if (part.type?.startsWith('tool-')) {
      // Extract tool name from type (e.g., 'tool-financialSearch' -> 'financialSearch')
      const toolName = part.type.replace('tool-', '');

      // The part structure is: { type, input, state, output, toolCallId, callProviderMetadata }
      // The actual result is in 'output'
      let result = part.output || part.result || part.args || part;

      // Parse result if it's a string
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (e) {
          // If not JSON, treat as plain text
        }
      }

      // Search tools: web search, financial search, wiley search
      if (
        toolName === 'webSearch' ||
        toolName === 'search' ||
        toolName === 'financialSearch' ||
        toolName === 'wileySearch' ||
        toolName === 'researchSearch'
      ) {
        // The result is structured as: { type, query, resultCount, results: [...] }
        const resultsArray = result?.results || [];
        const sources = resultsArray.length;

        if (sources > 0) {
          sourcesAnalyzed += sources;

          // Time to find sources
          breakdown.sourceFindingMinutes +=
            TIME_ESTIMATES.SOURCE_FINDING_BASE +
            (TIME_ESTIMATES.SOURCE_FINDING_PER_SOURCE * sources);

          // Time to read sources
          breakdown.sourceReadingMinutes +=
            TIME_ESTIMATES.SOURCE_READING_BASE +
            (TIME_ESTIMATES.SOURCE_READING_PER_SOURCE * sources);

          // Count words using the 'length' field from Valyu (word count) or fallback to counting
          resultsArray.forEach((item: any) => {
            // Valyu provides 'length' field which is the word count
            if (item.length && typeof item.length === 'number') {
              wordsProcessed += item.length;
            } else if (item.content) {
              // Fallback: count words manually
              const words = item.content.split(/\s+/).filter((w: string) => w.length > 0).length;
              wordsProcessed += words;
            }
          });
        }
      }

      // Chart creation
      if (toolName === 'createChart' || toolName === 'generateChart') {
        breakdown.chartCreationMinutes += TIME_ESTIMATES.CHART_PER_CHART;
      }

      // CSV/spreadsheet creation
      if (toolName === 'createCSV' || toolName === 'generateSpreadsheet') {
        const rows = result?.rows?.length ||
                    result?.data?.length ||
                    (Array.isArray(result) ? result.length : 10);

        breakdown.csvCreationMinutes +=
          TIME_ESTIMATES.CSV_BASE +
          (TIME_ESTIMATES.CSV_PER_ROW * rows);
      }

      // Code execution / data analysis
      if (
        toolName === 'executeCode' ||
        toolName === 'codeExecution' ||
        toolName === 'analyzeData' ||
        toolName === 'runAnalysis'
      ) {
        breakdown.dataProcessingMinutes += TIME_ESTIMATES.DATA_PROCESSING_PER_EXECUTION;
      }
    } // End of tool handling

    // Text content: writing time (but DON'T count as "words processed" - that's for sources read!)
    if (part.type === 'text' && part.text) {
      const words = part.text.split(/\s+/).length;
      // DO NOT ADD TO wordsProcessed - that's only for words READ from sources!

      // Only count substantial text as "writing"
      if (words > 50) {
        breakdown.writingMinutes += TIME_ESTIMATES.WRITING_PER_WORD * words;
      }

      // Detect reasoning blocks (long analytical text)
      if (words > 150) {
        breakdown.analysisMinutes += TIME_ESTIMATES.ANALYSIS_PER_BLOCK;
      }
    }

    // Reasoning parts
    if (part.type === 'reasoning' && part.text) {
      const words = part.text.split(/\s+/).length;
      if (words > 50) {
        breakdown.analysisMinutes += TIME_ESTIMATES.ANALYSIS_PER_BLOCK;
      }
    }
  }

  // Calculate totals
  const timeSavedMinutes = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const moneySaved = (timeSavedMinutes / 60) * HOURLY_RATE;

  return {
    sourcesAnalyzed,
    wordsProcessed,
    timeSavedMinutes,
    moneySaved,
    processingTimeMs: 0, // Will be added separately from message metadata
    breakdown,
  };
}

export function formatTime(minutes: number): string {
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatCost(cost: number): string {
  return `$${cost.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}
