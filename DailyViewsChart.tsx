import React, { useState, useMemo } from 'react';
import { Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { YouTuber, DailyViewDataPoint } from '../types';
import { formatCompact, formatPercent } from '../utils/formatters';
import { getChannelDailyAnalytics, ChannelDailyStats } from '../utils/dailyAnalytics';

interface DailyViewsChartProps {
  channel: YouTuber;
  stats?: ChannelDailyStats;
  compact?: boolean;
  timeRange?: '30' | '14' | '7';
  showTotalsOnRight?: boolean;
  onSelectChannel?: () => void;
}

export const DailyViewsChart: React.FC<DailyViewsChartProps> = ({
  channel,
  stats: providedStats,
  compact = false,
  timeRange = '30',
  showTotalsOnRight = true,
}) => {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    return providedStats || getChannelDailyAnalytics(channel);
  }, [providedStats, channel]);

  const { dailyViews, totalViews7d, totalViews30d, avgDailyViews30d, peakDay, trendPct7d } = stats;
  const rangeCount = parseInt(timeRange, 10);

  const visibleDaily = useMemo(() => {
    return dailyViews.slice(-rangeCount);
  }, [dailyViews, rangeCount]);

  const hoveredPoint =
    activeHoverIdx !== null && activeHoverIdx < visibleDaily.length
      ? visibleDaily[activeHoverIdx]
      : null;

  // Compute SVG parameters
  const maxViews = Math.max(...visibleDaily.map((p: DailyViewDataPoint) => p.views), 1);
  const minViews = Math.min(...visibleDaily.map((p: DailyViewDataPoint) => p.views), 0);
  const range = Math.max(1, maxViews - minViews);

  const svgWidth = compact ? 260 : 340;
  const svgHeight = compact ? 65 : 85;
  const paddingX = 6;
  const paddingTop = 8;
  const paddingBottom = compact ? 12 : 16;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  const coordinates = useMemo(() => {
    return visibleDaily.map((dp: DailyViewDataPoint, idx: number) => {
      const x = paddingX + (idx / Math.max(1, visibleDaily.length - 1)) * usableWidth;
      const y = paddingTop + usableHeight - ((dp.views - minViews) / range) * usableHeight;
      return { x, y, dp };
    });
  }, [visibleDaily, paddingX, usableWidth, paddingTop, usableHeight, minViews, range]);

  // Smooth bezier curve
  const pathD = useMemo(() => {
    return coordinates.reduce((acc: string, pt: { x: number; y: number; dp: DailyViewDataPoint }, i: number) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = coordinates[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, '');
  }, [coordinates]);

  const areaD = useMemo(() => {
    if (coordinates.length === 0) return '';
    return `${pathD} L ${coordinates[coordinates.length - 1].x} ${svgHeight - paddingBottom} L ${coordinates[0].x} ${svgHeight - paddingBottom} Z`;
  }, [pathD, coordinates, svgHeight, paddingBottom]);

  const avgY = paddingTop + usableHeight - ((avgDailyViews30d - minViews) / range) * usableHeight;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const closestIdx = Math.round(ratio * (visibleDaily.length - 1));
    setActiveHoverIdx(closestIdx);
  };

  const isPositiveGrowth = trendPct7d >= 0;

  return (
    <div className="w-full space-y-2">
      <div
        className={`flex ${
          showTotalsOnRight ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'
        } gap-2.5`}
      >
        {/* The SVG interactive chart */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-500" />
              <span>Daglige visninger ({rangeCount} dage)</span>
            </span>
            {/* Hover tooltip or latest day */}
            {hoveredPoint ? (
              <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                {hoveredPoint.displayDate} ({hoveredPoint.dayName}):{' '}
                <strong className="text-rose-400 font-bold">{formatCompact(hoveredPoint.views)}</strong>
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">
                Peak: <strong className="text-amber-400">{formatCompact(peakDay.views)}</strong>
              </span>
            )}
          </div>

          <div className="relative w-full rounded-xl bg-slate-950/70 border border-slate-800/80 p-1.5 overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto cursor-crosshair select-none block"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActiveHoverIdx(null)}
            >
              <defs>
                <linearGradient id={`grad-chart-${channel.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                  <stop offset="85%" stopColor="#f43f5e" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Baseline Grid & Avg Line */}
              <line
                x1={paddingX}
                y1={avgY}
                x2={svgWidth - paddingX}
                y2={avgY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.35"
              />
              {/* Filled Area */}
              {areaD && (
                <path
                  d={areaD}
                  fill={`url(#grad-chart-${channel.id})`}
                  className="transition-all duration-300"
                />
              )}
              {/* Curve Stroke */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)]"
                />
              )}
              {/* Data points */}
              {coordinates.map((pt: { x: number; y: number; dp: DailyViewDataPoint }, idx: number) => {
                const isHovered = activeHoverIdx === idx;
                const isPeak = pt.dp.isPeak;
                if (!isHovered && !isPeak && idx % 5 !== 0 && idx !== coordinates.length - 1) {
                  return null;
                }
                return (
                  <circle
                    key={pt.dp.date}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : isPeak ? 3.5 : 2}
                    fill={isHovered ? '#ffffff' : isPeak ? '#f59e0b' : '#f43f5e'}
                    stroke={isHovered ? '#f43f5e' : '#0f172a'}
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-transform duration-150"
                  />
                );
              })}
              {/* Active vertical crosshair */}
              {activeHoverIdx !== null && coordinates[activeHoverIdx] && (
                <line
                  x1={coordinates[activeHoverIdx].x}
                  y1={paddingTop}
                  x2={coordinates[activeHoverIdx].x}
                  y2={svgHeight - paddingBottom}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />
              )}
            </svg>
          </div>
        </div>

        {/* 7-dages & 30-dages totaler i højre side / under grafen */}
        {showTotalsOnRight && (
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 shrink-0 sm:w-28">
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">7-dages total</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {formatCompact(totalViews7d)}
              </span>
              <span
                className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${
                  isPositiveGrowth ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositiveGrowth ? (
                  <ArrowUpRight className="w-2.5 h-2.5 inline" />
                ) : (
                  <ArrowDownRight className="w-2.5 h-2.5 inline" />
                )}
                {formatPercent(trendPct7d)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">30-dages total</span>
              <span className="text-xs font-bold text-rose-400 block mt-0.5">
                {formatCompact(totalViews30d)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ~{formatCompact(avgDailyViews30d)}/d
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
