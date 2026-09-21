import { YouTuber, AggregateStats } from '../types';

export function formatCompact(val: number): string {
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(1).replace('.', ',') + ' mia.';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(1).replace('.', ',') + ' mio.';
  }
  if (val >= 1_000) {
    return Math.round(val / 1_000) + 'K';
  }
  return val.toString();
}

export function formatNumberDK(val: number): string {
  return new Intl.NumberFormat('da-DK').format(val);
}

export function formatPercent(val: number, showPlus = true): string {
  const prefix = showPlus && val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(1).replace('.', ',')}%`;
}

export function calculateAggregateStats(list: YouTuber[]): AggregateStats | null {
  if (!list || list.length === 0) return null;

  const sortedByPerformance = [...list].sort((a, b) => {
    const scoreA = a.monthlyViews + a.monthlyGrowthPct * 200000 + a.avgViewsPerVideo * 2;
    const scoreB = b.monthlyViews + b.monthlyGrowthPct * 200000 + b.avgViewsPerVideo * 2;
    return scoreB - scoreA;
  });

  const topPerformer = sortedByPerformance[0];
  const sortedByGrowth = [...list].sort((a, b) => b.monthlyGrowthPct - a.monthlyGrowthPct);
  const fastestGrowing = sortedByGrowth[0];
  const sortedByEngagement = [...list].sort((a, b) => b.engagementRate - a.engagementRate);
  const mostEngaged = sortedByEngagement[0];

  const totalSubscribersCombined = list.reduce((acc, curr) => acc + curr.subscribers, 0);
  const totalViewsCombined = list.reduce((acc, curr) => acc + curr.totalViews, 0);
  const monthlyViewsCombined = list.reduce((acc, curr) => acc + curr.monthlyViews, 0);
  const avgEngagement =
    list.reduce((acc, curr) => acc + curr.engagementRate, 0) / list.length;

  // Category distribution
  const categoryCounts: Record<string, number> = {};
  list.forEach((y) => {
    categoryCounts[y.category] = (categoryCounts[y.category] || 0) + 1;
  });

  const topCategoryShare = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / list.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalTracked: list.length,
    totalSubscribersCombined,
    totalViewsCombined,
    monthlyViewsCombined,
    topPerformer,
    fastestGrowing,
    mostEngaged,
    averageEngagementRate: avgEngagement,
    bestOverallPostingWindow: 'Søndag kl. 15:00 - 18:00',
    topCategoryShare,
  };
}
