'use client';

import React, { useState } from 'react';
import { BookOpen, FileText, Clock, DollarSign, Zap } from 'lucide-react';
import { MessageMetrics, formatTime, formatNumber, formatProcessingTime } from '@/lib/metrics-calculator';
import { TimeSavedBreakdownDialog } from './time-saved-breakdown-dialog';

interface MetricsPillsProps {
  metrics: MessageMetrics;
}

export function MetricsPills({ metrics }: MetricsPillsProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (metrics.timeSavedMinutes === 0) {
    return null;
  }


  return (
    <>
      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide items-center gap-2 sm:gap-2.5 px-2 py-2 sm:py-2.5 -mx-2 sm:mx-0">
        {/* Processing Time */}
        {metrics.processingTimeMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap shadow-sm">
            <Zap className="w-3 h-3" />
            <span>{formatProcessingTime(metrics.processingTimeMs)}</span>
          </div>
        )}

        {/* Sources Read */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap shadow-sm">
          <BookOpen className="w-3 h-3" />
          <span>{formatNumber(metrics.sourcesAnalyzed)} sources</span>
        </div>

        {/* Words Read */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap shadow-sm">
          <FileText className="w-3 h-3" />
          <span>{formatNumber(metrics.wordsProcessed)} words</span>
        </div>

        {/* Time Saved - Clickable - Orange */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50 font-medium transition-all whitespace-nowrap shadow-sm"
          title="Click to see breakdown"
        >
          <Clock className="w-3 h-3" />
          <span>{formatTime(metrics.timeSavedMinutes)} saved</span>
        </button>

        {/* Cost Saved - Clickable - Green */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 font-medium transition-all whitespace-nowrap shadow-sm"
          title="Click to see breakdown"
        >
          <DollarSign className="w-3 h-3" />
          <span>{metrics.moneySaved.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} saved</span>
        </button>
      </div>

      {/* Breakdown Dialog */}
      <TimeSavedBreakdownDialog
        metrics={metrics}
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
      />
    </>
  );
}
