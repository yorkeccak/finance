'use client';

import React, { JSX, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Cell, LabelList, ResponsiveContainer
} from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// Minimal professional color palette for finance
const DEFAULT_COLORS = [
  '#1e40af', // Deep Blue
  '#0891b2', // Cyan
  '#6366f1', // Indigo
  '#64748b', // Slate
  '#78716c', // Stone
  '#475569', // Slate Dark
] as const;

interface DataPoint {
  x: string | number;
  y: number;
  size?: number;   // For scatter/bubble charts
  label?: string;  // For scatter charts
}

interface DataSeries {
  name: string;
  data: DataPoint[];
}

interface FinancialChartProps {
  chartType: 'line' | 'bar' | 'area' | 'scatter' | 'quadrant';
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
  hideDownloadButton?: boolean;
}

function FinancialChartComponent({
  chartType,
  title,
  xAxisLabel,
  yAxisLabel,
  dataSeries,
  description,
  metadata,
  hideDownloadButton = false,
}: FinancialChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Download chart as PNG
  const handleDownload = async () => {
    if (!chartRef.current) return;

    setIsDownloading(true);
    try {
      // Dynamically import html-to-image (code splitting)
      const { toPng } = await import('html-to-image');

      // Convert to PNG with 2x pixel ratio for high-res
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        pixelRatio: 2,  // Retina-quality export
        backgroundColor: '#ffffff',
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Sanitize filename
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;

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
    } finally {
      setIsDownloading(false);
    }
  };

  // Transform data for Recharts format
  const transformedData = React.useMemo(() => {
    if (chartType === 'scatter' || chartType === 'quadrant') {
      return []; // Scatter uses raw data
    }

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
  }, [dataSeries, chartType]);

  // Create chart config for shadcn with professional colors
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

  // Calculate min/max for scatter charts
  const scatterMetrics = React.useMemo(() => {
    if (chartType !== 'scatter' && chartType !== 'quadrant') {
      return null;
    }

    // Filter out points without y values (scatter/quadrant requires y)
    const validPoints = dataSeries.flatMap(s =>
      s.data.filter(d => d.y !== undefined && d.y !== null)
    );

    if (validPoints.length === 0) {
      return null;
    }

    const allXValues = validPoints.map(d => Number(d.x));
    const allYValues = validPoints.map(d => d.y!); // Safe because we filtered
    const allSizes = validPoints.map(d => d.size || 100);

    const minX = Math.min(...allXValues);
    const maxX = Math.max(...allXValues);
    const minY = Math.min(...allYValues);
    const maxY = Math.max(...allYValues);
    const minZ = Math.min(...allSizes);
    const maxZ = Math.max(...allSizes);

    // Add 20% padding for better spacing
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const xPadding = Math.max(xRange * 0.2, 0.5);
    const yPadding = Math.max(yRange * 0.2, 0.5);

    return {
      minX: Math.floor(minX - xPadding),
      maxX: Math.ceil(maxX + xPadding),
      minY: Math.floor(minY - yPadding),
      maxY: Math.ceil(maxY + yPadding),
      minZ,
      maxZ,
      xMid: (minX + maxX) / 2,
      yMid: (minY + maxY) / 2,
    };
  }, [dataSeries, chartType]);

  const renderChart = (): JSX.Element => {
    const commonProps = {
      data: transformedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataSeries.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fillOpacity={0.2}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
      case 'quadrant':
        if (!scatterMetrics) return <div>Loading scatter chart...</div>;

        return (
          <ScatterChart margin={{ top: 30, right: 40, left: 40, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis
              type="number"
              dataKey="x"
              name={xAxisLabel}
              domain={[scatterMetrics.minX, scatterMetrics.maxX]}
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: xAxisLabel, position: 'bottom', offset: -10, style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yAxisLabel}
              domain={[scatterMetrics.minY, scatterMetrics.maxY]}
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <ZAxis type="number" dataKey="z" range={[64, 1600]} name="Size" />
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-white/98 p-3 shadow-lg">
                      <div className="text-sm font-semibold mb-2">{data.label || data.name}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{data.category}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">{xAxisLabel}:</span>
                          <span className="font-medium">{Number(data.x).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">{yAxisLabel}:</span>
                          <span className="font-medium">{(data.y ?? 0).toFixed(2)}</span>
                        </div>
                        {data.z && (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium">{data.z.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />

            {/* Reference lines for quadrant chart */}
            {chartType === 'quadrant' && (
              <>
                <ReferenceLine
                  x={scatterMetrics.xMid}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <ReferenceLine
                  y={scatterMetrics.yMid}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </>
            )}

            {dataSeries.map((series, seriesIndex) => {
              const seriesColor = DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];
              // Filter out points without y values (required for scatter/quadrant)
              const seriesData = series.data
                .filter(point => point.y !== undefined && point.y !== null)
                .map(point => ({
                  x: point.x,
                  y: point.y!,  // Safe because we filtered
                  z: point.size || 100,
                  label: point.label || series.name,
                  category: series.name,
                  name: point.label || series.name,
                  fill: seriesColor,
                }));

              return (
                <Scatter
                  key={series.name}
                  name={series.name}
                  data={seriesData}
                  fill={seriesColor}
                  isAnimationActive={false}
                  shape={(props: any) => {
                    const { cx, cy, fill } = props;
                    const z = props.payload.z || 100;

                    // Power scale for bubble sizing (0.6 exponent)
                    const minRadius = 8;
                    const maxRadius = 40;
                    const normalizedZ = (Math.pow(z, 0.6) - Math.pow(scatterMetrics.minZ, 0.6)) /
                                       (Math.pow(scatterMetrics.maxZ, 0.6) - Math.pow(scatterMetrics.minZ, 0.6));
                    const radius = minRadius + normalizedZ * (maxRadius - minRadius);

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={2}
                        opacity={0.85}
                      />
                    );
                  }}
                />
              );
            })}
          </ScatterChart>
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
    <div className="w-full">
      <div ref={chartRef} className="w-full bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-900/80 rounded-xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden shadow-sm">
        {/* Elegant Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200/60 dark:border-gray-700/50">
          <div className="flex gap-4 items-start justify-between">
            {/* Left: Title + Description */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Metadata Badges - Refined */}
              {metadata && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {metadata.totalSeries} {metadata.totalSeries === 1 ? 'Series' : 'Series'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {metadata.totalDataPoints} Points
                  </span>
                  {metadata.dateRange && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {metadata.dateRange.start} → {metadata.dateRange.end}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Logo */}
            <div className="flex items-center justify-center flex-shrink-0">
              <Image
                src="/valyu.svg"
                alt="Valyu"
                width={70}
                height={70}
                className="opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Chart Container - Spacious and clean */}
        <div className="p-6">
          <div className="h-[400px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              {renderChart()}
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* Download Button - Below chart, OUTSIDE the ref */}
      {!hideDownloadButton && (
        <div className="mt-3 px-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
                       border border-gray-200 dark:border-gray-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDownloading ? 'Downloading...' : 'Download Chart'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const FinancialChart = React.memo(FinancialChartComponent, (prevProps, nextProps) => {
  return (
    prevProps.chartType === nextProps.chartType &&
    prevProps.title === nextProps.title &&
    prevProps.xAxisLabel === nextProps.xAxisLabel &&
    prevProps.yAxisLabel === nextProps.yAxisLabel &&
    prevProps.description === nextProps.description &&
    JSON.stringify(prevProps.dataSeries) === JSON.stringify(nextProps.dataSeries) &&
    JSON.stringify(prevProps.metadata) === JSON.stringify(nextProps.metadata)
  );
});

FinancialChart.displayName = 'FinancialChart';
