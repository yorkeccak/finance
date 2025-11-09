import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

/**
 * GET /api/charts/[chartId]
 * Fetches chart configuration data by chartId
 * Used by ChartImageRenderer to load chart data for rendering in markdown
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await params;

    if (!chartId) {
      return NextResponse.json(
        { error: 'Chart ID is required' },
        { status: 400 }
      );
    }

    // Fetch chart from database (works with both Supabase and local SQLite)
    const { data: chartData, error } = await db.getChart(chartId);

    if (error || !chartData) {
      console.error('[GET /api/charts/[chartId]] Chart not found:', error);
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }

    // Parse chart_data if it's a string (SQLite stores as TEXT, Supabase as JSONB)
    const chartDataField = (chartData as any).chart_data || (chartData as any).chartData;
    const parsedChartData = typeof chartDataField === 'string'
      ? JSON.parse(chartDataField)
      : chartDataField;

    // Return chart configuration for FinancialChart component
    return NextResponse.json({
      chartType: parsedChartData.chartType || parsedChartData.type,
      title: parsedChartData.title,
      xAxisLabel: parsedChartData.xAxisLabel,
      yAxisLabel: parsedChartData.yAxisLabel,
      dataSeries: parsedChartData.dataSeries,
      description: parsedChartData.description,
      metadata: parsedChartData.metadata,
    });
  } catch (error: any) {
    console.error('[GET /api/charts/[chartId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
