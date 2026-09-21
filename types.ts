export type TabType = 'search' | 'favorites' | 'graphs' | 'stats';

export interface DailyViewDataPoint {
  date: string;
  displayDate: string;
  dayName: string;
  fullDayName: string;
  views: number;
  isWeekend: boolean;
  isPeak?: boolean;
  videoTitle?: string;
}

export interface ChannelDailyStats {
  channel: YouTuber;
  dailyViews: DailyViewDataPoint[];
  totalViews7d: number;
  totalViews30d: number;
  totalViews14d: number;
  avgDailyViews30d: number;
  avgDailyViews7d: number;
  peakDay: DailyViewDataPoint;
  lowestDay: DailyViewDataPoint;
  trendPct7d: number;
  trendPct30d: number;
}

export type Category =
  | 'Alle'
  | 'Underholdning'
  | 'Gaming'
  | 'Vlogs & Livsstil'
  | 'Comedy'
  | 'Sport & Fodbold'
  | 'Musik & Kultur';

export interface BestPostingTime {
  day: string;
  hours: string;
  score: number; // 0-100
  boostPercent: number;
  recommendation: string;
}

export interface DayHeatmap {
  day: string; // 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'
  fullDay: string;
  // 6 intervals: 00-04, 04-08, 08-12, 12-16, 16-20, 20-24
  slots: {
    time: string;
    score: number; // 0 to 100
  }[];
}

export interface RecentVideo {
  id: string;
  title: string;
  views: number;
  uploadDate: string;
  likes: number;
  duration: string;
  thumbnailUrl?: string;
  url?: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export interface YouTuber {
  id: string;
  name: string;
  channelName: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
  category: Category | string;
  subscribers: number;
  totalViews: number;
  monthlyViews: number;
  monthlyGrowthPct: number;
  monthlySubGain: number;
  videoCount: number;
  avgViewsPerVideo: number;
  engagementRate: number; // e.g. 4.9%
  rankPosition: number;
  bestPostingTime: BestPostingTime;
  weeklyHeatmap: DayHeatmap[];
  recentVideos: RecentVideo[];
  bio: string;
  joinedYear: number;
  joinedDate?: string;
  description?: string;
  topAudienceAge: string;
  country?: string;
  uploadsPlaylistId?: string | null;
  bannerUrl?: string;
  topVideos?: { id?: string; title: string; views: number; publishedAt?: string }[];
}

export interface AggregateStats {
  totalTracked: number;
  totalSubscribersCombined: number;
  totalViewsCombined: number;
  monthlyViewsCombined: number;
  topPerformer: YouTuber;
  fastestGrowing: YouTuber;
  mostEngaged: YouTuber;
  averageEngagementRate: number;
  bestOverallPostingWindow: string;
  topCategoryShare: { category: string; count: number; percentage: number }[];
}

export interface WeeklyVideo {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  publishedAt: string;
  relativeDate: string;
  thumbnail: string;
  url: string;
}

export interface WeeklyTopYouTuber {
  rank: number;
  channelId: string;
  name: string;
  channelName: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
  category: string;
  subscribers: number;
  totalViews: number;
  weeklyViews: number; // Samlede visninger på videoer udgivet inden for de seneste 7 dage
  weeklyLikes: number;
  weeklyComments: number;
  weeklyVideosCount: number;
  hasVideosWithin7Days: boolean;
  topVideo?: WeeklyVideo;
  recentVideos7d: WeeklyVideo[];
  fullProfile: YouTuber;
}

export interface WeeklyRankingResponse {
  topWeekly: WeeklyTopYouTuber[];
  summary: {
    totalWeeklyViewsCombined: number;
    totalWeeklyLikesCombined: number;
    totalWeeklyVideosCombined: number;
    timeWindowLabel: string;
    fetchedAt: string;
    isLiveApi: boolean;
    activeChannelsCount: number;
  };
}

export interface RankedRecentVideo {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  durationSeconds: number;
  isShort: boolean;
  publishedAt: string;
  relativeDate: string;
  thumbnail: string;
  url: string;
  channelId: string;
  channelName: string;
  channelAvatar: string;
  subscribers: number;
  verified: boolean;
  category?: string;
  rank?: number;
}

export interface TopRecentVideosResponse {
  topShorts: RankedRecentVideo[];
  topLongVideos: RankedRecentVideo[];
  topAllVideos: RankedRecentVideo[];
  totalShortsFound: number;
  totalLongVideosFound: number;
  totalVideosFound: number;
  channelsCount: number;
  isLiveApi: boolean;
  fetchedAt: string;
  scope: 'favorites' | 'all';
}

export interface SubscriberMilestone {
  currentSubs: number;
  nextMilestone: number;
  prevMilestone: number;
  remainingSubs: number;
  progressPercent: number; // progress within the current milestone bracket (0-100)
  totalProgressPercent: number; // currentSubs / nextMilestone * 100
  title: string;
  badge: string;
  iconType: 'silver' | 'gold' | 'diamond' | 'special';
  estimatedDays: number | null;
  estimatedTimeText: string;
  isClose: boolean; // >= 80%
}
