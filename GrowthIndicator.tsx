import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatPercent, formatCompact } from '../utils/formatters';

interface GrowthIndicatorProps {
  growthPct: number;
  monthlyGain?: number;
  size?: 'sm' | 'md' | 'lg';
  showSubGain?: boolean;
  className?: string;
  variant?: 'badge' | 'text' | 'compact';
}

export const GrowthIndicator: React.FC<GrowthIndicatorProps> = ({
  growthPct,
  monthlyGain,
  size = 'sm',
  showSubGain = false,
  className = '',
  variant = 'badge',
}) => {
  const isPositive = growthPct > 0;
  const isNegative = growthPct < 0;
  const isZero = growthPct === 0;

  const colorClasses = isPositive
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : isNegative
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : 'text-slate-400 bg-slate-800/60 border-slate-700/50';

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm font-bold',
  };

  if (variant === 'text') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold ${
          isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
        } ${textSizes[size]} ${className}`}
      >
        {isPositive && <ArrowUpRight className={iconSizes[size]} />}
        {isNegative && <ArrowDownRight className={iconSizes[size]} />}
        {isZero && <Minus className={iconSizes[size]} />}
        <span>{formatPercent(growthPct)}</span>
        {showSubGain && monthlyGain !== undefined && monthlyGain > 0 && (
          <span className="text-[10px] font-normal text-slate-400 ml-0.5">
            (+{formatCompact(monthlyGain)}/md)
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-medium transition-colors ${colorClasses} ${textSizes[size]} ${className}`}
      title={`Månedlig vækst: ${growthPct > 0 ? '+' : ''}${growthPct}%`}
    >
      {isPositive && <ArrowUpRight className={`${iconSizes[size]} shrink-0`} />}
      {isNegative && <ArrowDownRight className={`${iconSizes[size]} shrink-0`} />}
      {isZero && <Minus className={`${iconSizes[size]} shrink-0`} />}
      <span className="font-semibold whitespace-nowrap">{formatPercent(growthPct)}</span>
      {showSubGain && monthlyGain !== undefined && monthlyGain > 0 && (
        <span className="text-[10px] opacity-80 whitespace-nowrap hidden sm:inline">
          (+{formatCompact(monthlyGain)})
        </span>
      )}
    </span>
  );
};
