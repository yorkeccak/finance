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
      <DialogContent className="!max-w-4xl !max-h-[85vh]" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div>
            <DialogTitle className="text-lg font-semibold text-foreground">Productivity Analysis</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Time and cost breakdown</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 py-3">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="text-xs font-medium text-primary mb-1">Time Saved</div>
            <div className="text-2xl font-bold text-foreground">{formatTime(timeSavedMinutes)}</div>
            <div className="text-[10px] text-primary mt-0.5">≈ {workDays.toFixed(1)} work days</div>
          </div>

          <div className="bg-accent/30 border border-accent rounded-lg p-3">
            <div className="text-xs font-medium text-accent-foreground mb-1">Cost Saved</div>
            <div className="text-2xl font-bold text-foreground">{formatCost(moneySaved)}</div>
            <div className="text-[10px] text-accent-foreground mt-0.5">@ $200/hour analyst rate</div>
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
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {allTasks[activeIndex].name}
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {formatTime(allTasks[activeIndex].minutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">
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
                      ? `cursor-pointer ${isActive ? 'bg-muted' : 'hover:bg-muted/50'}`
                      : 'opacity-40 cursor-default'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: isUsed ? taskColor : 'var(--muted)' }}
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    isUsed ? 'bg-muted' : 'bg-muted/50'
                  }`}>
                    <Icon className={`w-3 h-3 ${
                      isUsed ? 'text-foreground' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium truncate ${
                      isUsed ? 'text-foreground' : 'text-muted-foreground'
                    }`}>{task.name}</div>
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isUsed ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {isUsed ? formatTime(task.minutes) : '—'}
                    </span>
                    <span className={`text-[10px] w-9 text-right tabular-nums ${
                      isUsed ? 'text-muted-foreground' : 'text-muted-foreground'
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
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Time estimates based on industry benchmarks for senior financial analysts performing equivalent manual research, analysis, and deliverable creation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
