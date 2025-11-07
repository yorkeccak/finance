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
      <DialogContent className="!max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Productivity Analysis
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Time Saved</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              {formatTime(timeSavedMinutes)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              ≈ {workDays.toFixed(1)} work days
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Cost Saved</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              {formatCost(moneySaved)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              @ $200/hour analyst rate
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Task Breakdown</h3>

          <div className="space-y-2">
            {tasks.map((task, idx) => {
              const Icon = task.icon;
              const percentage = (task.minutes / timeSavedMinutes) * 100;

              return (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatTime(task.minutes)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 ml-8">{task.description}</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1 ml-8">
                    <div
                      className="bg-gray-600 dark:bg-gray-500 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Methodology Note */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Methodology</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Time estimates based on industry benchmarks for senior financial analysts ($200/hour) performing equivalent manual research, analysis, and deliverable creation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
