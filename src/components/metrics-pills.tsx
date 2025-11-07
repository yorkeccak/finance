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
      <div className="flex flex-wrap items-center gap-2 px-2 py-2">
        {/* Processing Time */}
        {metrics.processingTimeMs > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
            <Zap className="w-3 h-3" />
            <span className="font-medium">{formatProcessingTime(metrics.processingTimeMs)}</span>
          </div>
        )}

        {/* Sources Read */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <BookOpen className="w-3 h-3" />
          <span className="font-medium">{formatNumber(metrics.sourcesAnalyzed)} sources</span>
        </div>

        {/* Words Read */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <FileText className="w-3 h-3" />
          <span className="font-medium">{formatNumber(metrics.wordsProcessed)} words</span>
        </div>

        {/* Time Saved - Clickable */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          title="Click to see breakdown"
        >
          <Clock className="w-3 h-3" />
          <span className="font-medium">{formatTime(metrics.timeSavedMinutes)} saved</span>
        </button>

        {/* Cost Saved - Clickable */}
        <button
          onClick={() => setShowBreakdown(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          title="Click to see breakdown"
        >
          <DollarSign className="w-3 h-3" />
          <span className="font-medium">{formatCost(metrics.moneySaved)} saved</span>
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
