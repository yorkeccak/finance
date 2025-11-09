'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, Search, BookOpen, FileText, Table, BarChart3, Brain, Code } from 'lucide-react';
import { MessageMetrics, formatTime, formatCost } from '@/lib/metrics-calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface TimeSavedBreakdownDialogProps {
  metrics: MessageMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export function TimeSavedBreakdownDialog({
  metrics,
  open,
  onOpenChange
}: TimeSavedBreakdownDialogProps) {
  const { breakdown, timeSavedMinutes, moneySaved } = metrics;
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const allTasks = [
    { name: 'Source Finding', minutes: breakdown.sourceFindingMinutes, icon: Search },
    { name: 'Source Reading', minutes: breakdown.sourceReadingMinutes, icon: BookOpen },
    { name: 'Writing', minutes: breakdown.writingMinutes, icon: FileText },
    { name: 'Analysis & Reasoning', minutes: breakdown.analysisMinutes, icon: Brain },
    { name: 'CSV Creation', minutes: breakdown.csvCreationMinutes, icon: Table },
    { name: 'Chart Creation', minutes: breakdown.chartCreationMinutes, icon: BarChart3 },
    { name: 'Data Processing', minutes: breakdown.dataProcessingMinutes, icon: Code },
  ];

  // Create a color mapping for each task based on its position in allTasks
  const getTaskColor = (taskName: string) => {
    const index = allTasks.findIndex(t => t.name === taskName);
    return COLORS[index % COLORS.length];
  };

  // Only show active tasks (with minutes > 0) in the pie chart
  const activeTasks = allTasks.filter(task => task.minutes > 0);

  const chartData = activeTasks.map((task) => ({
    name: task.name,
    value: task.minutes,
    percentage: ((task.minutes / timeSavedMinutes) * 100).toFixed(1),
    color: getTaskColor(task.name),
  }));

  const totalHours = timeSavedMinutes / 60;
  const workDays = totalHours / 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl !max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Productivity Analysis</DialogTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Time and cost breakdown</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 py-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Time Saved</div>
            <div className="text-2xl font-bold text-blue-950 dark:text-blue-100">{formatTime(timeSavedMinutes)}</div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5">≈ {workDays.toFixed(1)} work days</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-3">
            <div className="text-xs font-medium text-emerald-900 dark:text-emerald-300 mb-1">Cost Saved</div>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">{formatCost(moneySaved)}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">@ $200/hour analyst rate</div>
          </div>
        </div>

        {/* Chart and Legend */}
        <div className="grid grid-cols-[1fr,280px] gap-6 py-2">
          {/* Pie Chart and Info */}
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width="60%" height={260}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(allTasks.findIndex(t => t.name === activeTasks[index].name))}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Active Section Info */}
            <div className="flex flex-col justify-center min-w-[140px]">
              {activeIndex !== undefined && allTasks[activeIndex].minutes > 0 && (
                <>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {allTasks[activeIndex].name}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    {formatTime(allTasks[activeIndex].minutes)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((allTasks[activeIndex].minutes / timeSavedMinutes) * 100).toFixed(1)}% of total
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col justify-center space-y-1.5 py-2">
            {allTasks.map((task, idx) => {
              const Icon = task.icon;
              const isUsed = task.minutes > 0;
              const percentage = isUsed ? ((task.minutes / timeSavedMinutes) * 100).toFixed(1) : '0.0';
              const isActive = activeIndex === idx;
              const taskColor = getTaskColor(task.name);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => isUsed ? setActiveIndex(idx) : undefined}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                    isUsed
                      ? `cursor-pointer ${isActive ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`
                      : 'opacity-40 cursor-default'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: isUsed ? taskColor : '#d1d5db' }}
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    isUsed ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-100/50 dark:bg-gray-800/50'
                  }`}>
                    <Icon className={`w-3 h-3 ${
                      isUsed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium truncate ${
                      isUsed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                    }`}>{task.name}</div>
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isUsed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {isUsed ? formatTime(task.minutes) : '—'}
                    </span>
                    <span className={`text-[10px] w-9 text-right tabular-nums ${
                      isUsed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {isUsed ? `${percentage}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center leading-relaxed">
            Time estimates based on industry benchmarks for senior financial analysts performing equivalent manual research, analysis, and deliverable creation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
