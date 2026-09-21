import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  PlusCircle,
  ArrowUpRight,
  Layers,
  BarChart3,
  Zap,
} from 'lucide-react';
import { YouTuber, TabType } from '../types';
import { formatCompact, formatNumberDK, formatPercent } from '../utils/formatters';
import { getChannelDailyAnalytics, ChannelDailyStats, DailyViewDataPoint } from '../utils/dailyAnalytics';
import { getFavoriteYouTubers } from '../utils/favorites';

interface FavoritesDailyChartsScreenProps {
  youtubers: YouTuber[];
  favoriteIds: string[];
  onRemoveFavorite: (id: string, e: React.MouseEvent) => void;
  onSelectYouTuber: (youtuber: YouTuber) => void;
  onSwitchTab: (tab: TabType) => void;
  onAddDefaultFavorites?: () => void;
}

const COMPARISON_COLORS = [
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export const FavoritesDailyChartsScreen: React.FC<FavoritesDailyChartsScreenProps> = ({
  youtubers,
  favoriteIds,
  onRemoveFavorite,
  onSelectYouTuber,
  onSwitchTab,
  onAddDefaultFavorites,
}) => {
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [sortBy, setSortBy] = useState<'30d' | '7d' | 'growth' | 'subs'>('30d');
  const [viewMode, setViewMode] = useState<'cards' | 'compare'>('cards');

  const [hoveredDayIndices, setHoveredDayIndices] = useState<Record<string, number | null>>({});
  const [compareHoverIndex, setCompareHoverIndex] = useState<number | null>(null);

  const favoriteYouTubers = useMemo(() => {
    return getFavoriteYouTubers(youtubers, favoriteIds);
  }, [youtubers, favoriteIds]);

  const channelAnalyticsList: ChannelDailyStats[] = useMemo(() => {
    return favoriteYouTubers.map((channel) => getChannelDailyAnalytics(channel));
  }, [favoriteYouTubers]);

  const sortedAnalytics = useMemo(() => {
    return [...channelAnalyticsList].sort((a, b) => {
      if (sortBy === '7d') return b.totalViews7d - a.totalViews7d;
      if (sortBy === 'growth') return b.trendPct7d - a.trendPct7d;
      if (sortBy === 'subs') return b.channel.subscribers - a.channel.subscribers;
      return b.totalViews30d - a.totalViews30d;
    });
  }, [channelAnalyticsList, sortBy]);

  const aggregateSummary = useMemo(() => {
    const total30d = channelAnalyticsList.reduce((sum, item) => sum + item.totalViews30d, 0);
    const total7d = channelAnalyticsList.reduce((sum, item) => sum + item.totalViews7d, 0);
    const avgDailyCombined = Math.round(total30d / 30);
    const top30dChannel = [...channelAnalyticsList].sort(
      (a, b) => b.totalViews30d - a.totalViews30d
    )[0];
    const fastestGrowing = [...channelAnalyticsList].sort(
      (a, b) => b.trendPct7d - a.trendPct7d
    )[0];
    return {
      total30d,
      total7d,
      avgDailyCombined,
      top30dChannel,
      fastestGrowing,
    };
  }, [channelAnalyticsList]);

  const rangeDaysCount = parseInt(timeRange, 10);

  const getVisiblePoints = (points: DailyViewDataPoint[]) => {
    return points.slice(-rangeDaysCount);
  };

  return (
    <div id="daily-views-charts-screen" className="space-y-4 pb-24">
      {/* Header */}
      <div className="pt-2 pb-3 border-b border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Daglige Visningsgrafer</span>
                <TrendingUp className="w-5 h-5 text-rose-500" />
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                Favoritter
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Udvikling dag for dag for dine favoritkanaler med 7- og 30-dages totaler
            </p>
          </div>
          {/* Time range selector pills: 7, 14, 30 days */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            {(['7', '14', '30'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Sub-bar: View Mode & Sorting */}
        {sortedAnalytics.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Kanalvisning</span>
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'compare'
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sammenlign alle</span>
              </button>
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-slate-500 hidden sm:inline">Sorter:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sorter favoritkanaler"
                className="bg-slate-900 text-slate-200 text-xs border border-slate-800 rounded-lg px-2 py-1 outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="30d">Flest 30-dages visninger</option>
                <option value="7d">Flest 7-dages visninger</option>
                <option value="growth">Højeste ugevækst</option>
                <option value="subs">Flest abonnenter</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Aggregate Overview Card */}
      {sortedAnalytics.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-slate-800/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">
                Samlet for {sortedAnalytics.length} favorit
                {sortedAnalytics.length === 1 ? 'kanal' : 'kanaler'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Gns. ~{formatCompact(aggregateSummary.avgDailyCombined)}/dag
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                Sidste 7 dage
              </span>
              <p className="text-base font-bold text-white mt-0.5">
                {formatCompact(aggregateSummary.total7d)}
              </p>
              <span className="text-[10px] text-slate-400">
                ~{formatCompact(Math.round(aggregateSummary.total7d / 7))}/dag
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                Sidste 30 dage
              </span>
              <p className="text-base font-bold text-rose-400 mt-0.5">
                {formatCompact(aggregateSummary.total30d)}
              </p>
              <span className="text-[10px] text-slate-400">
                ~{formatCompact(aggregateSummary.avgDailyCombined)}/dag
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                Top favorit
              </span>
              <p className="text-xs font-bold text-white truncate mt-1">
                {aggregateSummary.top30dChannel?.channel.channelName || '-'}
              </p>
              <span className="text-[10px] text-emerald-400 font-medium">
                {formatCompact(aggregateSummary.top30dChannel?.totalViews30d || 0)} visninger
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                Største fremgang
              </span>
              <p className="text-xs font-bold text-white truncate mt-1">
                {aggregateSummary.fastestGrowing?.channel.channelName || '-'}
              </p>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 inline" />
                {formatPercent(aggregateSummary.fastestGrowing?.trendPct7d || 0)} denne uge
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: CHANNEL-BY-CHANNEL CARDS */}
      {viewMode === 'cards' && sortedAnalytics.length > 0 && (
        <div className="space-y-4">
          {sortedAnalytics.map((stats) => {
            const {
              channel,
              dailyViews,
              totalViews7d,
              totalViews30d,
              avgDailyViews30d,
              avgDailyViews7d,
              peakDay,
              trendPct7d,
            } = stats;
            const visibleDaily = getVisiblePoints(dailyViews);
            const channelId = channel.id;
            const activeHoverIdx = hoveredDayIndices[channelId] ?? null;
            const hoveredPoint = activeHoverIdx !== null ? visibleDaily[activeHoverIdx] : null;

            const maxViews = Math.max(...visibleDaily.map((p) => p.views), 1);
            const minViews = Math.min(...visibleDaily.map((p) => p.views), 0);
            const range = Math.max(1, maxViews - minViews);
            const svgWidth = 360;
            const svgHeight = 90;
            const paddingX = 8;
            const paddingTop = 12;
            const paddingBottom = 16;
            const usableWidth = svgWidth - paddingX * 2;
            const usableHeight = svgHeight - paddingTop - paddingBottom;

            const coordinates = visibleDaily.map((dp, idx) => {
              const x = paddingX + (idx / Math.max(1, visibleDaily.length - 1)) * usableWidth;
              const y = paddingTop + usableHeight - ((dp.views - minViews) / range) * usableHeight;
              return { x, y, dp };
            });

            const pathD = coordinates.reduce((acc, pt, i) => {
              if (i === 0) return `M ${pt.x} ${pt.y}`;
              const prev = coordinates[i - 1];
              const cx1 = prev.x + (pt.x - prev.x) / 2;
              const cy1 = prev.y;
              const cx2 = prev.x + (pt.x - prev.x) / 2;
              const cy2 = pt.y;
              return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
            }, '');

            const areaD = `${pathD} L ${
              coordinates[coordinates.length - 1].x
            } ${svgHeight - paddingBottom} L ${coordinates[0].x} ${svgHeight - paddingBottom} Z`;

            const avgY =
              paddingTop + usableHeight - ((avgDailyViews30d - minViews) / range) * usableHeight;

            return (
              <div
                key={channel.id}
                id={`daily-graph-card-${channel.id}`}
                className="p-4 bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl transition-all duration-200 shadow-sm relative overflow-hidden"
              >
                {/* Top Row: Channel Identity & Quick Actions */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div
                    onClick={() => onSelectYouTuber(channel)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={channel.avatarUrl}
                        alt={channel.channelName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-rose-500/50 transition-all"
                      />
                      {channel.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-white ring-2 ring-slate-900 text-[8px] font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                          {channel.channelName}
                        </h2>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">
                          {channel.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="truncate">{channel.handle}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-300 font-medium shrink-0">
                          {formatCompact(channel.subscribers)} subs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => onRemoveFavorite(channel.id, e)}
                      title="Fjern fra favoritter"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      aria-label={`Fjern ${channel.channelName} fra favoritter`}
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </button>
                    <button
                      onClick={() => onSelectYouTuber(channel)}
                      title="Åbn fuld kanalprofil"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Graph & Right Totals Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 pb-1">
                  {/* Left/Center Column: Daily Views SVG Graph */}
                  <div className="md:col-span-8 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 relative">
                    <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-semibold text-white">
                          Daglige visninger ({rangeDaysCount} dage)
                        </span>
                      </div>
                      {hoveredPoint ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px]">
                          <span className="font-medium">
                            {hoveredPoint.fullDayName} {hoveredPoint.displayDate}:
                          </span>
                          <span className="font-bold text-white">
                            {formatNumberDK(hoveredPoint.views)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>
                            Gns:{' '}
                            <strong className="text-slate-200 font-medium">
                              ~{formatCompact(avgDailyViews30d)}/dag
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Interactive SVG Chart */}
                    <div className="relative w-full h-[100px] select-none touch-none">
                      <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        preserveAspectRatio="none"
                        className="w-full h-full overflow-visible"
                        onPointerLeave={() => {
                          setHoveredDayIndices((prev) => ({ ...prev, [channelId]: null }));
                        }}
                        onPointerMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clientX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clientX / rect.width));
                          const index = Math.round(ratio * (visibleDaily.length - 1));
                          setHoveredDayIndices((prev) => ({ ...prev, [channelId]: index }));
                        }}
                      >
                        <defs>
                          <linearGradient id={`grad-${channelId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line
                          x1={paddingX}
                          y1={avgY}
                          x2={svgWidth - paddingX}
                          y2={avgY}
                          stroke="#64748b"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                          opacity="0.5"
                        />
                        <path d={areaD} fill={`url(#grad-${channelId})`} />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {coordinates.map((pt, i) => {
                          if (pt.dp.isPeak) {
                            return (
                              <g key={`peak-${i}`}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4"
                                  fill="#f43f5e"
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                />
                              </g>
                            );
                          }
                          return null;
                        })}
                        {activeHoverIdx !== null && coordinates[activeHoverIdx] && (
                          <g>
                            <line
                              x1={coordinates[activeHoverIdx].x}
                              y1={paddingTop}
                              x2={coordinates[activeHoverIdx].x}
                              y2={svgHeight - paddingBottom}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                              opacity="0.8"
                            />
                            <circle
                              cx={coordinates[activeHoverIdx].x}
                              cy={coordinates[activeHoverIdx].y}
                              r="4.5"
                              fill="#f43f5e"
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                          </g>
                        )}
                      </svg>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1 px-1">
                        <span>{visibleDaily[0]?.displayDate}</span>
                        <span>
                          {visibleDaily[Math.floor(visibleDaily.length / 2)]?.displayDate}
                        </span>
                        <span>{visibleDaily[visibleDaily.length - 1]?.displayDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          Toppunkt:{' '}
                          <strong className="text-white font-medium">
                            {formatNumberDK(peakDay.views)}
                          </strong>{' '}
                          ({peakDay.displayDate})
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {channel.bestPostingTime?.day}: +{channel.bestPostingTime?.boostPercent}% boost
                      </span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: 7-DAGES OG 30-DAGES TOTALER */}
                  <div className="md:col-span-4 flex md:flex-col gap-2.5">
                    {/* 7-Dages Total Box */}
                    <div className="flex-1 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-slate-400">
                          Sidste 7 dage
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                            trendPct7d >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {trendPct7d >= 0 ? '+' : ''}
                          {trendPct7d}%
                        </span>
                      </div>
                      <div className="my-1">
                        <div className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                          {formatNumberDK(totalViews7d)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Gns. ~{formatCompact(avgDailyViews7d)}/dag
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-1 flex items-center justify-between">
                        <span>7-dages total</span>
                        <span className="text-slate-300 font-medium">
                          {formatCompact(totalViews7d)}
                        </span>
                      </div>
                    </div>

                    {/* 30-Dages Total Box */}
                    <div className="flex-1 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-rose-400">
                          Sidste 30 dage
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          30d total
                        </span>
                      </div>
                      <div className="my-1">
                        <div className="text-base sm:text-lg font-extrabold text-rose-400 tracking-tight">
                          {formatNumberDK(totalViews30d)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Gns. ~{formatCompact(avgDailyViews30d)}/dag
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-1 flex items-center justify-between">
                        <span>Månedsvisninger</span>
                        <span className="text-white font-medium">
                          {formatCompact(totalViews30d)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link to channel detail */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload-tidspunkt: {channel.bestPostingTime?.hours}</span>
                  </span>
                  <button
                    onClick={() => onSelectYouTuber(channel)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <span>Åbn analyse</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: MULTI-CHANNEL COMPARISON CHART */}
      {viewMode === 'compare' && sortedAnalytics.length > 0 && (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Sammenlign Daglig Udvikling</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Overblik over alle {sortedAnalytics.length} favoritkanaler på samme tidslinje ({rangeDaysCount} dage)
              </p>
            </div>
          </div>

          {/* Color Legend for Each Channel */}
          <div className="flex flex-wrap gap-2 pt-1">
            {sortedAnalytics.map((item, idx) => {
              const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
              return (
                <div
                  key={item.channel.id}
                  onClick={() => onSelectYouTuber(item.channel)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-all"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-200 font-medium truncate max-w-[120px]">
                    {item.channel.channelName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatCompact(item.totalViews30d)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Multi-Line Comparative SVG Chart */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 relative">
            {(() => {
              const svgWidth = 400;
              const svgHeight = 180;
              const paddingX = 10;
              const paddingTop = 15;
              const paddingBottom = 25;
              const usableWidth = svgWidth - paddingX * 2;
              const usableHeight = svgHeight - paddingTop - paddingBottom;

              let globalMax = 1;
              sortedAnalytics.forEach((stat) => {
                const visible = getVisiblePoints(stat.dailyViews);
                const localMax = Math.max(...visible.map((p) => p.views));
                if (localMax > globalMax) globalMax = localMax;
              });

              const dateLabels = getVisiblePoints(sortedAnalytics[0]?.dailyViews || []);

              return (
                <div className="relative w-full h-[200px] select-none touch-none">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                    onPointerLeave={() => setCompareHoverIndex(null)}
                    onPointerMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clientX = e.clientX - rect.left;
                      const ratio = Math.max(0, Math.min(1, clientX / rect.width));
                      const index = Math.round(ratio * (dateLabels.length - 1));
                      setCompareHoverIndex(index);
                    }}
                  >
                    {[0.25, 0.5, 0.75, 1].map((frac) => {
                      const yVal = paddingTop + usableHeight - frac * usableHeight;
                      return (
                        <g key={frac}>
                          <line
                            x1={paddingX}
                            y1={yVal}
                            x2={svgWidth - paddingX}
                            y2={yVal}
                            stroke="#334155"
                            strokeWidth="0.5"
                            strokeDasharray="2 2"
                          />
                          <text
                            x={svgWidth - paddingX + 2}
                            y={yVal + 3}
                            fill="#64748b"
                            fontSize="8"
                            textAnchor="start"
                          >
                            {formatCompact(globalMax * frac)}
                          </text>
                        </g>
                      );
                    })}

                    {sortedAnalytics.map((stat, sIdx) => {
                      const visible = getVisiblePoints(stat.dailyViews);
                      const color = COMPARISON_COLORS[sIdx % COMPARISON_COLORS.length];
                      const coords = visible.map((dp, idx) => {
                        const x = paddingX + (idx / Math.max(1, visible.length - 1)) * usableWidth;
                        const y = paddingTop + usableHeight - (dp.views / globalMax) * usableHeight;
                        return { x, y, dp };
                      });

                      const pathD = coords.reduce((acc, pt, i) => {
                        if (i === 0) return `M ${pt.x} ${pt.y}`;
                        const prev = coords[i - 1];
                        const cx1 = prev.x + (pt.x - prev.x) / 2;
                        const cy1 = prev.y;
                        const cx2 = prev.x + (pt.x - prev.x) / 2;
                        const cy2 = pt.y;
                        return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
                      }, '');

                      return (
                        <g key={stat.channel.id}>
                          <path
                            d={pathD}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={compareHoverIndex !== null ? 0.7 : 0.9}
                          />
                          {compareHoverIndex !== null && coords[compareHoverIndex] && (
                            <circle
                              cx={coords[compareHoverIndex].x}
                              cy={coords[compareHoverIndex].y}
                              r="4"
                              fill={color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          )}
                        </g>
                      );
                    })}

                    {compareHoverIndex !== null && (
                      <line
                        x1={
                          paddingX +
                          (compareHoverIndex / Math.max(1, dateLabels.length - 1)) * usableWidth
                        }
                        y1={paddingTop}
                        x2={
                          paddingX +
                          (compareHoverIndex / Math.max(1, dateLabels.length - 1)) * usableWidth
                        }
                        y2={svgHeight - paddingBottom}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />
                    )}
                  </svg>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1 font-mono">
                    <span>{dateLabels[0]?.displayDate}</span>
                    <span>{dateLabels[Math.floor(dateLabels.length / 2)]?.displayDate}</span>
                    <span>{dateLabels[dateLabels.length - 1]?.displayDate}</span>
                  </div>
                </div>
              );
            })()}

            {compareHoverIndex !== null && (
              <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span>
                    {getVisiblePoints(sortedAnalytics[0]?.dailyViews || [])[compareHoverIndex]?.fullDayName}{' '}
                    {getVisiblePoints(sortedAnalytics[0]?.dailyViews || [])[compareHoverIndex]?.displayDate}
                  </span>
                  <span className="text-slate-400 text-[10px]">Visninger denne dag:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {sortedAnalytics.map((stat, sIdx) => {
                    const color = COMPARISON_COLORS[sIdx % COMPARISON_COLORS.length];
                    const pts = getVisiblePoints(stat.dailyViews);
                    const pt = pts[compareHoverIndex];
                    return (
                      <div key={stat.channel.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate text-slate-300">{stat.channel.channelName}</span>
                        </div>
                        <span className="font-bold text-white font-mono shrink-0">
                          {formatNumberDK(pt?.views || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2 font-medium">Kanal</th>
                  <th className="pb-2 font-medium text-right">Sidste 7 dage</th>
                  <th className="pb-2 font-medium text-right text-rose-400">Sidste 30 dage</th>
                  <th className="pb-2 font-medium text-right">Ugevækst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedAnalytics.map((item, idx) => {
                  const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
                  return (
                    <tr
                      key={item.channel.id}
                      onClick={() => onSelectYouTuber(item.channel)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-white truncate max-w-[130px]">
                          {item.channel.channelName}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-white">
                        {formatNumberDK(item.totalViews7d)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-rose-400">
                        {formatNumberDK(item.totalViews30d)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.trendPct7d >= 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {item.trendPct7d >= 0 ? '+' : ''}
                          {item.trendPct7d}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {sortedAnalytics.length === 0 && (
        <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">
              Ingen favoritkanaler at vise grafer for
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tilføj danske YouTubere til dine favoritter ved at trykke på plus-ikonet (+) på søgesiden, eller indlæs et sæt standardkanaler for at se 30-dages graferne i aktion.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => onSwitchTab('search')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Gå til søgning og find kanaler</span>
            </button>
            {onAddDefaultFavorites && (
              <button
                onClick={onAddDefaultFavorites}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Indlæs eksempler</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
