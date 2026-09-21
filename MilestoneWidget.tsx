import React from 'react';
import { Award, Trophy, Sparkles, Clock } from 'lucide-react';
import { SubscriberMilestone } from '../types';
import { formatCompact, formatNumberDK } from '../utils/formatters';

interface MilestoneWidgetProps {
  milestone: SubscriberMilestone;
  variant?: 'compact' | 'detailed' | 'inline';
}

export const MilestoneWidget: React.FC<MilestoneWidgetProps> = ({
  milestone,
  variant = 'detailed',
}) => {
  const {
    currentSubs,
    nextMilestone,
    remainingSubs,
    progressPercent,
    title,
    badge,
    iconType,
    estimatedTimeText,
    isClose,
  } = milestone;

  // Icon styling based on tier
  const getBadgeStyle = () => {
    switch (iconType) {
      case 'gold':
        return {
          gradient: 'from-amber-400 via-amber-500 to-yellow-600',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          bar: 'from-amber-500 to-yellow-400',
          iconColor: 'text-amber-400',
        };
      case 'silver':
        return {
          gradient: 'from-slate-200 via-slate-300 to-zinc-400',
          bg: 'bg-slate-300/10 border-slate-300/30 text-slate-200',
          bar: 'from-slate-200 to-zinc-400',
          iconColor: 'text-slate-300',
        };
      case 'diamond':
        return {
          gradient: 'from-cyan-400 via-sky-500 to-blue-600',
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          bar: 'from-cyan-400 to-blue-500',
          iconColor: 'text-cyan-400',
        };
      default:
        return {
          gradient: 'from-rose-500 via-rose-600 to-red-600',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          bar: 'from-rose-500 to-rose-400',
          iconColor: 'text-rose-400',
        };
    }
  };

  const style = getBadgeStyle();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] border ${style.bg}`}>
          {badge}
        </span>
        <span className="text-slate-400">
          {progressPercent}% • mangler {formatCompact(remainingSubs)}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className={`w-3.5 h-3.5 shrink-0 ${style.iconColor}`} />
            <span className="text-[11px] font-semibold text-slate-200 truncate">
              Mål: <strong className="text-white">{formatCompact(nextMilestone)}</strong> ({badge})
            </span>
          </div>
          <span className="text-[11px] font-bold text-white shrink-0">
            {progressPercent}%
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-slate-800/90 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
            style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span>
            Mangler: <strong className="text-slate-300 font-medium">{formatNumberDK(remainingSubs)}</strong>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-2.5 h-2.5 text-slate-500" />
            <span className="truncate">{estimatedTimeText}</span>
          </span>
        </div>
      </div>
    );
  }

  // Detailed profile variant (for YouTuberDetailScreen)
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 border border-slate-800/90 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border ${style.bg} shrink-0`}>
            {iconType === 'gold' || iconType === 'silver' ? (
              <Award className={`w-5 h-5 ${style.iconColor}`} />
            ) : (
              <Trophy className={`w-5 h-5 ${style.iconColor}`} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Næste abonnent-milepæl
              </h3>
              {isClose && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Snart i mål
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{title}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${style.bg} shrink-0`}>
          {badge}
        </span>
      </div>

      {/* Progress Bar & Percent */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Fremskridt mod {formatCompact(nextMilestone)}:
          </span>
          <span className="font-extrabold text-sm text-white">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${style.bar} shadow-sm transition-all duration-700`}
            style={{ width: `${Math.max(3, Math.min(100, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Numbers Breakdown 3-col grid */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
            Nuværende
          </span>
          <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
            {formatNumberDK(currentSubs)}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
            Mangler endnu
          </span>
          <p className="text-xs sm:text-sm font-bold text-rose-400 mt-0.5">
            {formatNumberDK(remainingSubs)}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
            Mål
          </span>
          <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">
            {formatCompact(nextMilestone)}
          </p>
        </div>
      </div>

      {/* Estimated Arrival Banner */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">
            Estimeret tid til milepæl:{' '}
            <strong className="text-white font-semibold">{estimatedTimeText}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
