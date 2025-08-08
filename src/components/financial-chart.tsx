'use client';

import React, { JSX } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// Default color palette with fallback colors
const DEFAULT_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red  
  '#16a34a', // Green
  '#ca8a04', // Yellow
  '#9333ea', // Purple
] as const;

interface DataPoint {
  x: string | number;
  y: number;
}

interface DataSeries {
  name: string;
  data: DataPoint[];
}

interface FinancialChartProps {
  chartType: 'line' | 'bar' | 'area';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  dataSeries: DataSeries[];
  description?: string;
  metadata?: {
    totalSeries: number;
    totalDataPoints: number;
    dateRange?: {
      start: string | number;
      end: string | number;
    } | null;
  };
}

export function FinancialChart({
  chartType,
  title,
  xAxisLabel,
  yAxisLabel,
  dataSeries,
  description,
  metadata
}: FinancialChartProps) {
  // Transform data for Recharts format
  // Combine all series data into single array with x as key
  const transformedData = React.useMemo(() => {
    const dataMap = new Map<string | number, any>();
    
    // Collect all unique x values
    dataSeries.forEach(series => {
      series.data.forEach(point => {
        if (!dataMap.has(point.x)) {
          dataMap.set(point.x, { x: point.x });
        }
        dataMap.get(point.x)![series.name] = point.y;
      });
    });
    
    return Array.from(dataMap.values()).sort((a, b) => {
      // Sort by x value (handles both strings and numbers)
      if (typeof a.x === 'string' && typeof b.x === 'string') {
        return a.x.localeCompare(b.x);
      }
      return Number(a.x) - Number(b.x);
    });
  }, [dataSeries]);

  // Create chart config for shadcn with default colors
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    dataSeries.forEach((series, index) => {
      config[series.name] = {
        label: series.name,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      };
    });
    return config;
  }, [dataSeries]);

  const renderChart = (): JSX.Element => {
    const commonProps = {
      data: transformedData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(value) => `${xAxisLabel}: ${value}`}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(value) => `${xAxisLabel}: ${value}`}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(value) => `${xAxisLabel}: ${value}`}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unsupported chart type: {chartType}
          </div>
        );
    }
  };



  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📈 {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
        {metadata && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              {metadata.totalSeries} series • {metadata.totalDataPoints} data points
            </div>
            {metadata.dateRange && (
              <div>
                Range: {metadata.dateRange.start} → {metadata.dateRange.end}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full border border-gray-200 rounded-lg bg-white dark:bg-gray-900">
          <ChartContainer config={chartConfig} className="h-full w-full">
            {renderChart()}
          </ChartContainer>
        </div>
        <div className="mt-4 text-center">
          <div className="text-xs text-muted-foreground">
            {xAxisLabel} vs {yAxisLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}