import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/csvs/[csvId]
 * Fetches CSV data by csvId
 * Used by citation renderer to load CSV data for inline markdown table display
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ csvId: string }> }
) {
  try {
    const { csvId } = await params;

    if (!csvId) {
      return NextResponse.json(
        { error: 'CSV ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch CSV from database
    const { data: csvData, error } = await supabase
      .from('csvs')
      .select('*')
      .eq('id', csvId)
      .single();

    if (error || !csvData) {
      console.error('[GET /api/csvs/[csvId]] CSV not found:', error);
      return NextResponse.json(
        { error: 'CSV not found' },
        { status: 404 }
      );
    }

    // Parse rows if they're stored as a JSON string (shouldn't happen, but handle it)
    let parsedRows = csvData.rows;
    if (typeof csvData.rows === 'string') {
      try {
        parsedRows = JSON.parse(csvData.rows);
      } catch (e) {
        console.error('[GET /api/csvs/[csvId]] Failed to parse rows:', e);
        return NextResponse.json(
          { error: 'Invalid CSV data format' },
          { status: 500 }
        );
      }
    }

    // Return CSV data for markdown table rendering
    return NextResponse.json({
      id: csvData.id,
      title: csvData.title,
      description: csvData.description,
      headers: csvData.headers,
      rows: parsedRows,
      createdAt: csvData.created_at,
    });
  } catch (error: any) {
    console.error('[GET /api/csvs/[csvId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
