import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

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

    // Fetch CSV from database (works with both Supabase and local SQLite)
    const { data: csvData, error } = await db.getCSV(csvId);

    if (error || !csvData) {
      console.error('[GET /api/csvs/[csvId]] CSV not found:', error);
      return NextResponse.json(
        { error: 'CSV not found' },
        { status: 404 }
      );
    }

    // Parse fields if they're stored as JSON strings (SQLite stores as TEXT)
    let parsedRows = csvData.rows;
    let parsedHeaders = csvData.headers;

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

    if (typeof csvData.headers === 'string') {
      try {
        parsedHeaders = JSON.parse(csvData.headers);
      } catch (e) {
        console.error('[GET /api/csvs/[csvId]] Failed to parse headers:', e);
      }
    }

    // Return CSV data for markdown table rendering
    const createdAt = (csvData as any).created_at || (csvData as any).createdAt;
    return NextResponse.json({
      id: csvData.id,
      title: csvData.title,
      description: csvData.description,
      headers: parsedHeaders,
      rows: parsedRows,
      createdAt: createdAt,
    });
  } catch (error: any) {
    console.error('[GET /api/csvs/[csvId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
