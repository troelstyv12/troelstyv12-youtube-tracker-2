import React, { useState, useMemo } from 'react';
import {
  Heart,
  Trash2,
  ChevronRight,
  Clock,
  PlusCircle,
  Trophy,
  BarChart2,
} from 'lucide-react';
import { YouTuber, TabType } from '../types';
import { formatCompact, formatPercent } from '../utils/formatters';
import { GrowthIndicator } from './GrowthIndicator';
import { MilestoneWidget } from './MilestoneWidget';
import { DailyViewsChart } from './DailyViewsChart';
import { calculateSubscriberMilestone } from '../utils/milestones';
import { getFavoriteYouTubers } from '../utils/favorites';

interface FavoritesScreenProps {
  youtubers: YouTuber[];
  favoriteIds: string[];
  onRemoveFavorite: (id: string, e: React.MouseEvent) => void;
  onSelectYouTuber: (youtuber: YouTuber) => void;
  onSwitchTab: (tab: TabType) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  youtubers,
  favoriteIds,
  onRemoveFavorite,
  onSelectYouTuber,
  onSwitchTab,
}) => {
  const [sortBy, setSortBy] = useState<'views' | 'subscribers' | 'growth' | 'milestone'>('views');
  const [viewMode, setViewMode] = useState<'graphs' | 'compact'>('graphs');
  const [expandedGraphs, setExpandedGraphs] = useState<Record<string, boolean>>({});

  const toggleChannelGraph = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGraphs((prev) => ({
      ...prev,
      [channelId]: !prev[channelId],
    }));
  };

  const favoriteYouTubers = useMemo(() => {
    return getFavoriteYouTubers(youtubers, favoriteIds)
      .sort((a, b) => {
        if (sortBy === 'subscribers') return b.subscribers - a.subscribers;
        if (sortBy === 'growth') return b.monthlyGrowthPct - a.monthlyGrowthPct;
        if (sortBy === 'milestone') {
          const mA = calculateSubscriberMilestone(a.subscribers, a.monthlySubGain, a.monthlyGrowthPct);
          const mB = calculateSubscriberMilestone(b.subscribers, b.monthlySubGain, b.monthlyGrowthPct);
          return mB.progressPercent - mA.progressPercent;
        }
        return b.monthlyViews - a.monthlyViews;
      });
  }, [youtubers, favoriteIds, sortBy]);

  const totalFavoriteSubs = useMemo(() => {
    return favoriteYouTubers.reduce((acc, curr) => acc + curr.subscribers, 0);
  }, [favoriteYouTubers]);

  const totalFavoriteMonthlyViews = useMemo(() => {
    return favoriteYouTubers.reduce((acc, curr) => acc + curr.monthlyViews, 0);
  }, [favoriteYouTubers]);

  // Find the favorite channel that is closest to their next round milestone
  const closestMilestoneChannel = useMemo(() => {
    if (favoriteYouTubers.length === 0) return null;
    let closest: { yt: YouTuber; milestone: ReturnType<typeof calculateSubscriberMilestone> } | null = null;
    for (const yt of favoriteYouTubers) {
      const m = calculateSubscriberMilestone(yt.subscribers, yt.monthlySubGain, yt.monthlyGrowthPct);
      if (!closest || m.progressPercent > closest.milestone.progressPercent) {
        closest = { yt, milestone: m };
      }
    }
    return closest;
  }, [favoriteYouTubers]);

  return (
    <div id="favorites-screen-container" className="space-y-4 pb-24">
      {/* Header */}
      <div className="pt-2 pb-3 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Dine Favoritter</span>
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {favoriteYouTubers.length} {favoriteYouTubers.length === 1 ? 'YouTuber' : 'YouTubere'} gemt
          </p>
        </div>

        {favoriteYouTubers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Grafer vs Kompakt */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('graphs')}
                className={`px-2 py-1 rounded flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'graphs'
                    ? 'bg-rose-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vis daglige visningsgrafer direkte på listen"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Med Grafer</span>
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`px-2 py-1 rounded cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Kompakt listevisning"
              >
                <span>Kompakt</span>
              </button>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setSortBy('views')}
                className={`px-2 py-1 rounded cursor-pointer ${
                  sortBy === 'views'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visninger
              </button>
              <button
                onClick={() => setSortBy('subscribers')}
                className={`px-2 py-1 rounded cursor-pointer ${
                  sortBy === 'subscribers'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Subs
              </button>
              <button
                onClick={() => setSortBy('growth')}
                className={`px-2 py-1 rounded cursor-pointer ${
                  sortBy === 'growth'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vækst %
              </button>
              <button
                onClick={() => setSortBy('milestone')}
                className={`px-2 py-1 rounded flex items-center gap-1 cursor-pointer ${
                  sortBy === 'milestone'
                    ? 'bg-slate-800 text-amber-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Milepæl</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Closest Milestone Highlight Banner */}
      {closestMilestoneChannel && (
        <div
          id="closest-milestone-banner"
          onClick={() => onSelectYouTuber(closestMilestoneChannel.yt)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                    Nærmeste Abonnent-Milepæl
                  </span>
                  {closestMilestoneChannel.milestone.isClose && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[9px] font-bold border border-amber-500/40 animate-pulse">
                      Tæt på
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 truncate mt-0.5">
                  <strong className="text-white font-semibold">
                    {closestMilestoneChannel.yt.channelName}
                  </strong>{' '}
                  er på{' '}
                  <span className="text-amber-300 font-bold">
                    {closestMilestoneChannel.milestone.progressPercent}%
                  </span>{' '}
                  mod{' '}
                  <strong className="text-white">
                    {formatCompact(closestMilestoneChannel.milestone.nextMilestone)}
                  </strong>{' '}
                  ({closestMilestoneChannel.milestone.badge})
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Mangler kun</span>
              <span className="text-xs font-bold text-amber-300">
                {formatCompact(closestMilestoneChannel.milestone.remainingSubs)} subs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Overview Metrics */}
      {favoriteYouTubers.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/20 border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Samlede månedlige visninger</span>
            <p className="text-base font-bold text-white">
              {formatCompact(totalFavoriteMonthlyViews)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Samlet abonnentbase</span>
            <p className="text-base font-bold text-rose-400">
              {formatCompact(totalFavoriteSubs)}
            </p>
          </div>
        </div>
      )}

      {/* List of Favorite YouTubers */}
      <div className="space-y-3.5">
        {favoriteYouTubers.map((yt) => {
          const milestone = calculateSubscriberMilestone(
            yt.subscribers,
            yt.monthlySubGain,
            yt.monthlyGrowthPct
          );
          const showGraph = viewMode === 'graphs' || !!expandedGraphs[yt.id];

          return (
            <div
              key={yt.id}
              id={`favorite-card-${yt.id}`}
              onClick={() => onSelectYouTuber(yt)}
              className="group p-4 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden space-y-3"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={yt.avatarUrl}
                    alt={yt.channelName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-rose-500/50 transition-all shrink-0 bg-slate-800"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
                        {yt.channelName}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="truncate">{yt.handle}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {yt.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right actions: Growth indicator + delete + expand */}
                <div className="flex items-center gap-2 shrink-0">
                  <GrowthIndicator
                    growthPct={yt.monthlyGrowthPct}
                    monthlyGain={yt.monthlySubGain}
                    showSubGain={true}
                    size="sm"
                  />
                  <button
                    id={`btn-toggle-graph-${yt.id}`}
                    onClick={(e) => toggleChannelGraph(yt.id, e)}
                    title={showGraph ? 'Skjul graf' : 'Vis graf'}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      showGraph
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`btn-remove-favorite-${yt.id}`}
                    onClick={(e) => onRemoveFavorite(yt.id, e)}
                    title="Fjern fra favoritter"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    aria-label={`Fjern ${yt.channelName} fra favoritter`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors hidden sm:block" />
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Abonnenter</span>
                  <span className="font-semibold text-slate-100">
                    {formatCompact(yt.subscribers)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Månedsvisninger</span>
                  <span className="font-semibold text-slate-100">
                    {formatCompact(yt.monthlyViews)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Månedlig vækst</span>
                  <span className="font-semibold text-emerald-400">
                    {formatPercent(yt.monthlyGrowthPct)}
                  </span>
                </div>
              </div>

              {/* Milestone Progress Component on Card */}
              <div className="pt-2 border-t border-slate-800/60">
                <MilestoneWidget milestone={milestone} variant="compact" />
              </div>

              {/* Daily Views Graph */}
              {showGraph && (
                <div
                  className="pt-2.5 border-t border-slate-800/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DailyViewsChart
                    channel={yt}
                    showTotalsOnRight={true}
                    timeRange="30"
                    onSelectChannel={() => onSelectYouTuber(yt)}
                  />
                </div>
              )}

              {/* Highlighted Best Posting Time banner */}
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] truncate">
                    Bedste tidspunkt:{' '}
                    <strong className="text-white font-medium">
                      {yt.bestPostingTime.day} {yt.bestPostingTime.hours}
                    </strong>
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  +{yt.bestPostingTime.boostPercent}% boost
                </span>
              </div>
            </div>
          );
        })}

        {favoriteYouTubers.length === 0 && (
          <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-rose-500/60">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">
                Ingen favoritter gemt endnu
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Gå til søgesiden og tryk på plus-ikonet (+) for at gemme de danske YouTubere, du vil holde øje med.
              </p>
            </div>
            <button
              id="btn-goto-search"
              onClick={() => onSwitchTab('search')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Gå til søgning</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
