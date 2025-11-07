'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Search, BookOpen, FileText, Table, BarChart3, Brain, Code } from 'lucide-react';
import { MessageMetrics, formatTime, formatCost } from '@/lib/metrics-calculator';

interface TimeSavedBreakdownDialogProps {
  metrics: MessageMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeSavedBreakdownDialog({
  metrics,
  open,
  onOpenChange
}: TimeSavedBreakdownDialogProps) {
  const { breakdown, timeSavedMinutes, moneySaved } = metrics;

  const tasks = [
    {
      name: 'Source Finding',
      minutes: breakdown.sourceFindingMinutes,
      icon: Search,
      description: 'Searching and identifying relevant sources',
    },
    {
      name: 'Source Reading',
      minutes: breakdown.sourceReadingMinutes,
      icon: BookOpen,
      description: 'Reading and extracting key information',
    },
    {
      name: 'Writing',
      minutes: breakdown.writingMinutes,
      icon: FileText,
      description: 'Report composition and drafting',
    },
    {
      name: 'CSV Creation',
      minutes: breakdown.csvCreationMinutes,
      icon: Table,
      description: 'Data structuring and formatting',
    },
    {
      name: 'Chart Creation',
      minutes: breakdown.chartCreationMinutes,
      icon: BarChart3,
      description: 'Data visualization and design',
    },
    {
      name: 'Analysis & Reasoning',
      minutes: breakdown.analysisMinutes,
      icon: Brain,
      description: 'Critical thinking and synthesis',
    },
    {
      name: 'Data Processing',
      minutes: breakdown.dataProcessingMinutes,
      icon: Code,
      description: 'Model building and validation',
    },
  ].filter(task => task.minutes > 0);

  const totalHours = timeSavedMinutes / 60;
  const workDays = totalHours / 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Time Saved Breakdown</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(timeSavedMinutes)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">Equivalent to</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {workDays.toFixed(1)} work days
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Cost Saved: <span className="font-semibold">{formatCost(moneySaved)}</span> @ $200/hour
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Task Breakdown</h3>

          {tasks.map((task, idx) => {
            const Icon = task.icon;
            const percentage = (task.minutes / timeSavedMinutes) * 100;

            return (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{task.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatTime(task.minutes)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.description}</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Methodology Note */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">Calculation Methodology</p>
          <p>
            Time estimates are based on industry-standard benchmarks for a senior analyst @ $200/hour completing similar tasks manually.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
