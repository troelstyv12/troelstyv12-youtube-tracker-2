import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Youtube,
  Radio,
} from 'lucide-react';
import { YouTuber, TabType, ToastNotification } from './types';
import { DANISH_YOUTUBERS } from './data/youtubers';
import { fetchBatchChannelStats } from './services/youtubeApi';
import { SearchScreen } from './components/SearchScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { FavoritesDailyChartsScreen } from './components/FavoritesDailyChartsScreen';
import { StatsOverviewScreen } from './components/StatsOverviewScreen';
import { DetailModal } from './components/DetailModal';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/Toast';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  isChannelInFavorites,
  getFavoriteYouTubers,
  toggleFavoriteIdList,
  normalizeId,
} from './utils/favorites';

const STORAGE_KEY_FAVORITES_V2 = 'dansk_yt_tracker_favorites_v2';
const STORAGE_KEY_FAVORITES_V1 = 'dansk_yt_tracker_favorites_v1';
const STORAGE_KEY_CUSTOM_CHANNELS = 'dansk_yt_tracker_custom_channels_v2';
const DEFAULT_FAVORITE_IDS = ['alexander-husum', 'morten-munster', 'robinsamse'];

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('search');
  
  // YouTubers state: initialized with default curated channels + any user-added custom channels
  const [youtubers, setYouTubers] = useState<YouTuber[]>(() => {
    try {
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_CHANNELS);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, YouTuber>();
          DANISH_YOUTUBERS.forEach((y) => map.set(normalizeId(y.id), y));
          parsed.forEach((y: YouTuber) => {
            if (y && y.id) {
              map.set(normalizeId(y.id), y);
            }
          });
          return Array.from(map.values());
        }
      }
    } catch {
      // ignore
    }
    return DANISH_YOUTUBERS;
  });

  // Favorite IDs state with migration support for v1 underscores
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEY_FAVORITES_V2);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((id: string) => normalizeId(id));
        }
      }
      const savedV1 = localStorage.getItem(STORAGE_KEY_FAVORITES_V1);
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize underscores to hyphens (e.g. alexander_husum -> alexander-husum)
          return parsed.map((id: string) => normalizeId(id));
        }
      }
    } catch {
      // ignore parse error
    }
    return DEFAULT_FAVORITE_IDS;
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [selectedYouTuber, setSelectedYouTuber] = useState<YouTuber | null>(null);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success', actionLabel?: string, onAction?: () => void) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, message, type, actionLabel, onAction }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES_V2, JSON.stringify(favoriteIds));
      localStorage.setItem(STORAGE_KEY_FAVORITES_V1, JSON.stringify(favoriteIds));
    } catch {
      // ignore write errors
    }
  }, [favoriteIds]);

  // Background Live Sync with YouTube API
  const syncChannelsWithLiveApi = useCallback(async (force = false) => {
    setIsLiveSyncing(true);
    try {
      const liveData = await fetchBatchChannelStats(force);
      if (liveData && liveData.length > 0) {
        setYouTubers((prev) => {
          return prev.map((localYt) => {
            const remoteMatch = liveData.find(
              (r: YouTuber) =>
                r.id === localYt.id ||
                normalizeId(r.id) === normalizeId(localYt.id) ||
                r.channelName.toLowerCase() === localYt.channelName.toLowerCase()
            );
            if (remoteMatch) {
              return {
                ...localYt,
                subscribers: remoteMatch.subscribers || localYt.subscribers,
                totalViews: remoteMatch.totalViews || localYt.totalViews,
                monthlyViews: remoteMatch.monthlyViews || localYt.monthlyViews,
                videoCount: remoteMatch.videoCount || localYt.videoCount,
                avatarUrl: remoteMatch.avatarUrl || localYt.avatarUrl,
                bannerUrl: remoteMatch.bannerUrl || localYt.bannerUrl,
                verified: remoteMatch.verified ?? localYt.verified,
              };
            }
            return localYt;
          });
        });
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('Live sync fallback to local curated data:', err);
    } finally {
      setIsLiveSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncChannelsWithLiveApi(false);
  }, [syncChannelsWithLiveApi]);

  // Toggle favorite helper: guarantees channel is added to youtubers array AND favoriteIds
  const handleToggleFavorite = useCallback(
    (youtuber: YouTuber, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      // 1. Ensure channel is in youtubers list (crucial for channels added from Search/API)
      setYouTubers((prev) => {
        const alreadyExists = prev.some((y) => isChannelInFavorites(y, [youtuber.id]));
        let updatedList: YouTuber[];
        if (alreadyExists) {
          updatedList = prev.map((y) =>
            isChannelInFavorites(y, [youtuber.id]) ? { ...y, ...youtuber } : y
          );
        } else {
          updatedList = [youtuber, ...prev];
        }

        // Persist any non-default channels so they remain on page refresh
        try {
          const customChannels = updatedList.filter(
            (u) => !DANISH_YOUTUBERS.some((d) => normalizeId(d.id) === normalizeId(u.id))
          );
          localStorage.setItem(STORAGE_KEY_CUSTOM_CHANNELS, JSON.stringify(customChannels));
        } catch {
          // ignore storage error
        }

        return updatedList;
      });

      // 2. Toggle inside favoriteIds array
      const currentlyFav = isChannelInFavorites(youtuber, favoriteIds);
      setFavoriteIds((prev) => toggleFavoriteIdList(youtuber, prev));

      // 3. User feedback toast with direct jump to Favoritter tab
      if (currentlyFav) {
        showToast(`${youtuber.channelName} fjernet fra favoritter`, 'info');
      } else {
        showToast(
          `✓ ${youtuber.channelName} tilføjet til favoritter`,
          'success',
          'Se i favoritter',
          () => {
            setCurrentTab('favorites');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        );
      }
    },
    [favoriteIds, showToast]
  );

  const handleRemoveFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const yt = youtubers.find((y) => isChannelInFavorites(y, [id]));
      if (yt) {
        setFavoriteIds((prev) => toggleFavoriteIdList(yt, prev));
        showToast(`${yt.channelName} fjernet fra favoritter`, 'info');
      } else {
        setFavoriteIds((prev) =>
          prev.filter((item) => item !== id && normalizeId(item) !== normalizeId(id))
        );
      }
    },
    [youtubers, showToast]
  );

  const handleAddDefaultFavorites = useCallback(() => {
    setFavoriteIds(DEFAULT_FAVORITE_IDS);
    showToast('Standard favoritter indlæst!', 'success');
  }, [showToast]);

  const favoritesCount = getFavoriteYouTubers(youtubers, favoriteIds).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* App Header */}
      <header
        id="app-header"
        className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-sm"
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            onClick={() => setCurrentTab('search')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/30 group-hover:scale-105 transition-transform">
              <Youtube className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Dansk YouTube Tracker</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Realtidsstatistik & analyser
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
            {/* Live API sync badge */}
            <div
              onClick={() => syncChannelsWithLiveApi(true)}
              title={
                lastSyncTime
                  ? `Synkroniseret med YouTube ${lastSyncTime.toLocaleTimeString('da-DK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}. Klik for at genindlæse.`
                  : 'Klik for at synkronisere live med YouTube'
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer select-none"
            >
              <Radio className="w-2.5 h-2.5 text-rose-500 animate-pulse" />
              <span className="font-medium text-xs hidden sm:inline">Live Sync</span>
              <RefreshCw
                className={`w-3 h-3 text-slate-400 ${isLiveSyncing ? 'animate-spin text-rose-400' : ''}`}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-20">
        {currentTab === 'search' && (
          <SearchScreen
            youtubers={youtubers}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectYouTuber={(yt) => setSelectedYouTuber(yt)}
          />
        )}

        {currentTab === 'favorites' && (
          <FavoritesScreen
            youtubers={youtubers}
            favoriteIds={favoriteIds}
            onRemoveFavorite={handleRemoveFavorite}
            onSelectYouTuber={(yt) => setSelectedYouTuber(yt)}
            onSwitchTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'graphs' && (
          <FavoritesDailyChartsScreen
            youtubers={youtubers}
            favoriteIds={favoriteIds}
            onRemoveFavorite={handleRemoveFavorite}
            onSelectYouTuber={(yt) => setSelectedYouTuber(yt)}
            onSwitchTab={(tab) => setCurrentTab(tab)}
            onAddDefaultFavorites={handleAddDefaultFavorites}
          />
        )}

        {currentTab === 'stats' && (
          <StatsOverviewScreen
            youtubers={youtubers}
            favoriteIds={favoriteIds}
            onSelectYouTuber={(yt) => setSelectedYouTuber(yt)}
            onSwitchToSearch={() => setCurrentTab('search')}
          />
        )}
      </main>

      {/* Persistent Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        favoritesCount={favoritesCount}
      />

      {/* Detailed YouTuber Profile Modal */}
      {selectedYouTuber && (
        <DetailModal
          youtuber={selectedYouTuber}
          isFavorite={isChannelInFavorites(selectedYouTuber, favoriteIds)}
          onClose={() => setSelectedYouTuber(null)}
          onToggleFavorite={(yt, e) => handleToggleFavorite(yt, e)}
        />
      )}

      {/* Feedback Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
