import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  ExternalLink,
  Users,
  Eye,
  Video,
  Clock,
  Check,
  Calendar,
  Sparkles,
  TrendingUp,
  ThumbsUp,
  Play,
  Film,
} from 'lucide-react';
import { YouTuber, RecentVideo } from '../types';
import { formatCompact, formatNumberDK, formatPercent } from '../utils/formatters';
import { GrowthIndicator } from './GrowthIndicator';
import { MilestoneWidget } from './MilestoneWidget';
import { DailyViewsChart } from './DailyViewsChart';
import { calculateSubscriberMilestone } from '../utils/milestones';
import { getYouTubeChannelDetails } from '../services/youtubeApi';

interface DetailModalProps {
  youtuber: YouTuber | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (youtuber: YouTuber, e: React.MouseEvent) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  youtuber,
  isFavorite,
  onClose,
  onToggleFavorite,
}) => {
  // Default to 'videos' tab so the 5 latest videos are shown immediately
  const [activeTab, setActiveTab] = useState<'videos' | 'overview' | 'graph'>('videos');
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [fetchedVideos, setFetchedVideos] = useState<RecentVideo[] | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Fetch live recent videos if channel doesn't have 5 videos already
  useEffect(() => {
    setFetchedVideos(null);
    if (!youtuber) return;

    // If channel already has 5 recent videos, use them directly
    if (youtuber.recentVideos && youtuber.recentVideos.length >= 5) {
      return;
    }

    // Attempt to fetch from YouTube API if it's a UC... channel ID
    const targetChannelId = youtuber.id.startsWith('UC') ? youtuber.id : null;
    if (targetChannelId) {
      let isCancelled = false;
      setIsLoadingVideos(true);
      getYouTubeChannelDetails(targetChannelId)
        .then((details) => {
          if (!isCancelled && details?.recentVideos && details.recentVideos.length > 0) {
            setFetchedVideos(details.recentVideos.slice(0, 5));
          }
        })
        .catch((err) => {
          console.warn('Could not fetch latest videos for modal:', err);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingVideos(false);
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [youtuber?.id]);

  if (!youtuber) return null;

  const milestone = calculateSubscriberMilestone(
    youtuber.subscribers,
    youtuber.monthlySubGain,
    youtuber.monthlyGrowthPct
  );

  // Determine the 5 videos to show (strictly limited to 5)
  const rawVideos: RecentVideo[] =
    (fetchedVideos && fetchedVideos.length > 0 ? fetchedVideos : youtuber.recentVideos) ||
    youtuber.topVideos ||
    [];
  const videos: RecentVideo[] = rawVideos.slice(0, 5);

  const getWatchUrl = (vid: RecentVideo) => {
    if (vid.url) return vid.url;
    if (vid.id && vid.id.length > 5 && !vid.id.includes('-')) {
      return `https://www.youtube.com/watch?v=${vid.id}`;
    }
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${youtuber.channelName} ${vid.title}`
    )}`;
  };

  const getThumbnail = (vid: RecentVideo, idx: number) => {
    if (vid.thumbnailUrl) return vid.thumbnailUrl;
    // High quality fallbacks if missing
    const fallbacks = [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80',
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=480&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=480&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=480&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=480&q=80',
    ];
    return fallbacks[idx % fallbacks.length];
  };

  return (
    <div
      id="youtuber-detail-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner header image */}
        <div className="relative h-28 sm:h-32 w-full bg-gradient-to-r from-rose-900/60 via-slate-900 to-slate-900 overflow-hidden shrink-0">
          {youtuber.bannerUrl ? (
            <img
              src={youtuber.bannerUrl}
              alt={`${youtuber.channelName} banner`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950" />
          )}

          {/* Close button */}
          <button
            id="btn-close-detail-modal"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer z-10"
            aria-label="Luk vindue"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Favorite button in banner */}
          <button
            id="btn-modal-favorite"
            onClick={(e) => onToggleFavorite(youtuber, e)}
            className={`absolute top-3 left-3 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer z-10 ${
              isFavorite
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'bg-black/60 text-slate-200 hover:bg-rose-600 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
            <span>{isFavorite ? 'I favoritter' : 'Tilføj favorit'}</span>
          </button>
        </div>

        {/* Channel info bar */}
        <div className="px-5 pt-0 pb-2 relative border-b border-slate-800/80 shrink-0">
          <div className="flex items-end justify-between -mt-8 mb-2.5">
            <div className="relative">
              <img
                src={youtuber.avatarUrl}
                alt={youtuber.channelName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover ring-4 ring-slate-900 bg-slate-800 shadow-xl"
              />
              {youtuber.verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-white ring-2 ring-slate-900 text-[10px] font-bold">
                  ✓
                </div>
              )}
            </div>

            <a
              href={`https://youtube.com/${youtuber.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
            >
              <span>Se kanal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {youtuber.channelName}
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium">
                {youtuber.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{youtuber.handle}</span>
              <span>•</span>
              <span className="font-semibold text-slate-300">{formatCompact(youtuber.subscribers)} subs</span>
              <span>•</span>
              <span>{formatCompact(youtuber.totalViews)} visninger</span>
            </div>
          </div>

          {/* Modal Tab Controls */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60">
            <button
              id="tab-btn-videos"
              onClick={() => setActiveTab('videos')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'videos'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>5 Seneste videoer</span>
            </button>
            <button
              id="tab-btn-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40'
              }`}
            >
              Overblik & Tal
            </button>
            <button
              id="tab-btn-graph"
              onClick={() => setActiveTab('graph')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'graph'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40'
              }`}
            >
              Daglige Visninger
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: 5 LATEST VIDEOS (PRIMARY DEFAULT VIEW) */}
          {activeTab === 'videos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>5 Seneste Videoer</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                      {videos.length} videoer
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Se {youtuber.channelName}s nyeste uploads med visninger og statistik
                  </p>
                </div>
                <a
                  href={`https://youtube.com/${youtuber.handle}/videos`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Alle videoer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {isLoadingVideos && videos.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Henter de seneste 5 videoer fra YouTube...</p>
                </div>
              ) : videos.length > 0 ? (
                <div className="space-y-2.5">
                  {videos.map((vid: RecentVideo, idx: number) => {
                    const watchUrl = getWatchUrl(vid);
                    const thumbUrl = getThumbnail(vid, idx);

                    return (
                      <a
                        key={vid.id || idx}
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-2.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-rose-500/60 rounded-2xl flex items-center gap-3 transition-all duration-200 shadow-sm block cursor-pointer"
                      >
                        {/* Video Thumbnail with play icon and duration */}
                        <div className="relative w-28 h-18 sm:w-32 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60">
                          <img
                            src={thumbUrl}
                            alt={vid.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                            <div className="w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            </div>
                          </div>
                          {vid.duration && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-semibold text-white font-mono">
                              {vid.duration}
                            </span>
                          )}
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-rose-300">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
                            {vid.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 mt-1.5">
                            <span className="flex items-center gap-1 font-semibold text-rose-300">
                              <Eye className="w-3 h-3 text-rose-400" />
                              <span>{formatNumberDK(vid.views)}</span>
                            </span>

                            {vid.likes && vid.likes > 0 ? (
                              <span className="flex items-center gap-1 text-slate-400">
                                <ThumbsUp className="w-2.5 h-2.5 text-slate-500" />
                                <span>{formatCompact(vid.likes)}</span>
                              </span>
                            ) : null}

                            <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{vid.uploadDate || 'For nylig'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Watch Action Icon */}
                        <div className="shrink-0 p-1.5 text-slate-600 group-hover:text-rose-400 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                  Ingen videoer registreret for denne kanal endnu.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW & MILESTONE */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Primary Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-rose-500" />
                    <span>Abonnenter</span>
                  </div>
                  <div className="text-base font-bold text-white mt-1">
                    {formatNumberDK(youtuber.subscribers)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {formatCompact(youtuber.subscribers)} subs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Eye className="w-3.5 h-3.5 text-rose-500" />
                    <span>Samlede Visninger</span>
                  </div>
                  <div className="text-base font-bold text-white mt-1">
                    {formatCompact(youtuber.totalViews)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {formatNumberDK(youtuber.totalViews)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Video className="w-3.5 h-3.5 text-rose-500" />
                    <span>Månedsvisninger</span>
                  </div>
                  <div className="text-base font-bold text-rose-400 mt-1">
                    {formatCompact(youtuber.monthlyViews)}
                  </div>
                  <span className="text-[10px] text-slate-500">Sidste 30 dage</span>
                </div>
              </div>

              {/* Monthly Growth Badge */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">30-dages vækstrate</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    +{formatNumberDK(youtuber.monthlySubGain)} nye subs
                  </div>
                </div>
                <GrowthIndicator
                  growthPct={youtuber.monthlyGrowthPct}
                  monthlyGain={youtuber.monthlySubGain}
                  showSubGain={false}
                  size="md"
                />
              </div>

              {/* Quick Preview of the 5 latest videos on the Overview tab */}
              {videos.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-rose-500" />
                      <span>5 Seneste videoer</span>
                    </span>
                    <button
                      onClick={() => setActiveTab('videos')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Se detaljeret liste →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {videos.map((vid: RecentVideo, idx: number) => (
                      <a
                        key={vid.id || idx}
                        href={getWatchUrl(vid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/60 hover:border-rose-500/50 text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-rose-400 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-slate-200 group-hover:text-white truncate font-medium">
                            {vid.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] font-bold text-rose-400">
                            {formatCompact(vid.views)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Milestone Widget */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800">
                <MilestoneWidget milestone={milestone} variant="detailed" />
              </div>

              {/* Best Posting Time Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Optimalt Upload-tidspunkt</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    +{youtuber.bestPostingTime.boostPercent}% boost
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Højeste seerengagement registreres typisk på{' '}
                  <strong className="text-white font-semibold">{youtuber.bestPostingTime.day}</strong>{' '}
                  omkring <strong className="text-white font-semibold">{youtuber.bestPostingTime.hours}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY VIEWS GRAPH */}
          {activeTab === 'graph' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Vælg tidsinterval:</span>
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {(['7', '14', '30'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        timeRange === r
                          ? 'bg-rose-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r} dage
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                <DailyViewsChart
                  channel={youtuber}
                  compact={false}
                  timeRange={timeRange}
                  showTotalsOnRight={true}
                />
              </div>

              <div className="text-[11px] text-slate-400 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 leading-relaxed">
                💡 <strong className="text-slate-200">Tip:</strong> Hold markøren eller fingeren henover kurven for at aflæse det nøjagtige antal visninger pr. specifik dato.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
