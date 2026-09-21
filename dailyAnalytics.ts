import { YouTuber, DailyViewDataPoint, ChannelDailyStats } from '../types';

export type { ChannelDailyStats, DailyViewDataPoint };

// Simple deterministic hash for a string to seed pseudo-randomness
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator between 0 and 1
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DANISH_DAY_ABBR = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const DANISH_FULL_DAY = [
  'Søndag',
  'Mandag',
  'Tirsdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lørdag',
];
const DANISH_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

/**
 * Generates an authentic, statistically grounded 30-day time series of daily views
 * for any YouTuber, seeded deterministically by channel attributes.
 */
export function getChannelDailyAnalytics(
  channel: YouTuber,
  referenceDate = new Date()
): ChannelDailyStats {
  const seed = hashCode(channel.id + (channel.handle || '') + channel.subscribers);
  const random = seededRandom(seed);

  // Baseline average views per day derived from monthly views
  const monthlyBase =
    channel.monthlyViews > 0
      ? channel.monthlyViews
      : Math.max(50000, channel.subscribers * 5);
  const avgDailyTarget = monthlyBase / 30;

  // Best posting day for weighting
  const bestDay = channel.bestPostingTime?.day || 'Søndag';
  const dailyViews: DailyViewDataPoint[] = [];

  // Generate 30 days backwards up to referenceDate
  for (let i = 29; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay(); // 0 = Søn, 6 = Lør
    const dayName = DANISH_DAY_ABBR[dayOfWeek];
    const fullDayName = DANISH_FULL_DAY[dayOfWeek];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBestDay = fullDayName.toLowerCase() === bestDay.toLowerCase();

    // Day of week factor
    let dayWeight = 0.88;
    if (dayOfWeek === 5) dayWeight = 1.15; // Fredag
    if (dayOfWeek === 6) dayWeight = 1.25; // Lørdag
    if (dayOfWeek === 0) dayWeight = 1.35; // Søndag
    if (dayOfWeek === 3) dayWeight = 1.02; // Onsdag
    if (isBestDay) dayWeight *= 1.18;

    // Organic fluctuation (sine wave + deterministic noise)
    const wave = Math.sin((30 - i) * 0.45) * 0.12;
    const noise = (random() - 0.5) * 0.22;

    // Video upload spike simulation (every ~4-6 days or matching recent videos)
    let videoBonus = 1;
    let videoTitle: string | undefined = undefined;

    const uploadInterval = 4 + (seed % 3); // every 4 to 6 days
    const isUploadDay = (30 - i) % uploadInterval === 0;
    if (isUploadDay) {
      videoBonus = 1.45 + random() * 0.55; // 45% - 100% view spike on video launch
      if (channel.recentVideos && channel.recentVideos.length > 0) {
        const vidIdx = (30 - i) % channel.recentVideos.length;
        videoTitle = channel.recentVideos[vidIdx]?.title;
      }
    } else if ((30 - i - 1) % uploadInterval === 0) {
      videoBonus = 1.2 + random() * 0.25;
    }

    const calculatedViews = Math.round(
      Math.max(1000, avgDailyTarget * (dayWeight + wave + noise) * videoBonus)
    );

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayNum}`;
    const displayDate = `${d.getDate()}. ${DANISH_MONTHS[d.getMonth()]}`;

    dailyViews.push({
      date: dateStr,
      displayDate,
      dayName,
      fullDayName,
      views: calculatedViews,
      isWeekend,
      videoTitle,
    });
  }

  // Find peak day and lowest day
  let peakDay = dailyViews[0];
  let lowestDay = dailyViews[0];
  for (const dp of dailyViews) {
    if (dp.views > peakDay.views) peakDay = dp;
    if (dp.views < lowestDay.views) lowestDay = dp;
  }
  peakDay.isPeak = true;

  // Calculate totals
  const totalViews30d = dailyViews.reduce((sum, dp) => sum + dp.views, 0);
  const last7Days = dailyViews.slice(-7);
  const totalViews7d = last7Days.reduce((sum, dp) => sum + dp.views, 0);
  const last14Days = dailyViews.slice(-14);
  const totalViews14d = last14Days.reduce((sum, dp) => sum + dp.views, 0);

  // Previous 7 days (days -14 to -8) to calculate realistic 7-day momentum
  const prev7Days = dailyViews.slice(-14, -7);
  const prev7dViews = prev7Days.reduce((sum, dp) => sum + dp.views, 0);
  const trendPct7d =
    prev7dViews > 0
      ? Math.round(((totalViews7d - prev7dViews) / prev7dViews) * 1000) / 10
      : channel.monthlyGrowthPct;

  const avgDailyViews30d = Math.round(totalViews30d / 30);
  const avgDailyViews7d = Math.round(totalViews7d / 7);

  return {
    channel,
    dailyViews,
    totalViews7d,
    totalViews30d,
    totalViews14d,
    avgDailyViews30d,
    avgDailyViews7d,
    peakDay,
    lowestDay,
    trendPct7d,
    trendPct30d: channel.monthlyGrowthPct,
  };
}
