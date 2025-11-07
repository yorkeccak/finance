'use client';

import React, { useState } from 'react';
import { Download, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface CSVPreviewProps {
  title: string;
  description?: string;
  headers: string[];
  rows: string[][];
  csvContent: string;
  rowCount: number;
  columnCount: number;
}

function CSVPreviewComponent({
  title,
  description,
  headers,
  rows,
  csvContent,
  rowCount,
  columnCount,
}: CSVPreviewProps) {
  const [copied, setCopied] = useState(false);

  // Download CSV file
  const handleDownload = () => {
    try {
      // Create blob with proper CSV MIME type
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Sanitize filename
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  // Copy CSV to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying CSV:', error);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - matching chart style */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-4">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy CSV to clipboard"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Download CSV file"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {rowCount} Row{rowCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {columnCount} Column{columnCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table Container - more zoomed out with smaller text */}
      <div className="overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            {/* Header */}
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
              <tr className="border-b border-gray-300 dark:border-gray-600">
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`
                    ${rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-850'}
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                    border-b border-gray-100 dark:border-gray-700/50 last:border-b-0
                  `}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-1.5 text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700/50 last:border-r-0 whitespace-nowrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const CSVPreview = React.memo(CSVPreviewComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.csvContent === nextProps.csvContent &&
    prevProps.rowCount === nextProps.rowCount &&
    prevProps.columnCount === nextProps.columnCount
  );
});

CSVPreview.displayName = 'CSVPreview';
