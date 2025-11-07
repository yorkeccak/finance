import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const supabase = await createClient();

    // Fetch chart from database
    const { data: chartData, error } = await supabase
      .from('charts')
      .select('chart_data')
      .eq('id', chartId)
      .single();

    if (error || !chartData) {
      console.error('[GET /api/charts/[chartId]] Chart not found:', error);
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }

    // Parse chart_data if it's a string
    const parsedChartData = typeof chartData.chart_data === 'string'
      ? JSON.parse(chartData.chart_data)
      : chartData.chart_data;

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
