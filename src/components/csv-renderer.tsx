'use client';

import React, { useState, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { csvToMarkdownTable, formatCsvForMarkdown, CSVData } from '@/lib/csv-utils';

// Cache for CSV data to prevent re-fetching during streaming
const csvDataCache = new Map<string, CSVData>();

// CSV Renderer Component - fetches and displays CSV as markdown table
const CsvRendererComponent = ({ csvId, alt }: { csvId: string; alt?: string }) => {
  const [csvData, setCsvData] = useState<CSVData | null>(() => csvDataCache.get(csvId) || null);
  const [loading, setLoading] = useState(!csvDataCache.has(csvId));
  const [error, setError] = useState(false);

  useEffect(() => {
    // If already cached, don't fetch again
    if (csvDataCache.has(csvId)) {
      return;
    }

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const response = await fetch(`/api/csvs/${csvId}`);
        if (cancelled) return;

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const csvDataObj = {
          title: data.title,
          description: data.description,
          headers: data.headers,
          rows: data.rows,
        };

        // Cache the result
        csvDataCache.set(csvId, csvDataObj);
        setCsvData(csvDataObj);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, [csvId]);

  if (loading) {
    return (
      <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading table...</div>
      </div>
    );
  }

  if (error || !csvData) {
    return (
      <div className="my-4 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
        <div className="text-sm text-red-600 dark:text-red-400">Failed to load table</div>
      </div>
    );
  }

  // Validate that rows is an array
  if (!Array.isArray(csvData.rows)) {
    return (
      <div className="my-4 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
        <div className="text-sm text-red-600 dark:text-red-400">Invalid table data format</div>
      </div>
    );
  }

  // Format and convert to markdown table
  const formattedCsvData = formatCsvForMarkdown(csvData);
  const markdownTable = csvToMarkdownTable(formattedCsvData);

  return (
    <div className="my-4 w-full overflow-x-auto scrollbar-hide">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownTable}
      </ReactMarkdown>
    </div>
  );
};

export const CsvRenderer = memo(CsvRendererComponent, (prevProps, nextProps) => {
  return prevProps.csvId === nextProps.csvId && prevProps.alt === nextProps.alt;
});

CsvRenderer.displayName = 'CsvRenderer';
