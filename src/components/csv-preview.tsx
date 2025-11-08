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
    <div className="w-full bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/80 rounded-xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden shadow-sm">
      {/* Header - elegant and clean */}
      <div className="px-5 py-4 border-b border-gray-200/60 dark:border-gray-700/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            )}

            {/* Metadata Badges - minimal and refined */}
            <div className="flex gap-2 mt-2.5">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {rowCount} Row{rowCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {columnCount} Column{columnCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Action Buttons - refined styling */}
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Copy CSV to clipboard"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              )}
            </Button>
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Download CSV file"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table Container - elegant typography */}
      <div className="overflow-hidden">
        <div className="max-h-[500px] overflow-x-auto overflow-y-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse text-xs min-w-max">
            {/* Header - refined styling */}
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-850/80 backdrop-blur-sm">
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-2.5 text-left font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body - clean rows with subtle hover */}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
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
