'use client';

import React, { useState } from 'react';
import { BookOpen, FileText, Clock, DollarSign, Zap } from 'lucide-react';
import { MessageMetrics, formatTime, formatCost, formatNumber, formatProcessingTime } from '@/lib/metrics-calculator';
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
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-2">
        {/* Processing Time */}
        {metrics.processingTimeMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
            <Zap className="w-3 h-3" />
            <span>{formatProcessingTime(metrics.processingTimeMs)}</span>
          </div>
        )}

        {/* Sources Read */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
          <BookOpen className="w-3 h-3" />
          <span>{formatNumber(metrics.sourcesAnalyzed)} sources</span>
        </div>

        {/* Words Read */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
          <FileText className="w-3 h-3" />
          <span>{formatNumber(metrics.wordsProcessed)} words</span>
        </div>

        {/* Time Saved - Clickable - Orange */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/40 font-medium transition-colors"
          title="Click to see breakdown"
        >
          <Clock className="w-3 h-3" />
          <span>{formatTime(metrics.timeSavedMinutes)} saved</span>
        </button>

        {/* Cost Saved - Clickable - Green */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 font-medium transition-colors"
          title="Click to see breakdown"
        >
          <DollarSign className="w-3 h-3" />
          <span>{formatCost(metrics.moneySaved)} saved</span>
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
