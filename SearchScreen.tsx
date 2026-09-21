import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Check,
  ChevronRight,
  Users,
  Eye,
  X,
  Loader2,
  Video,
  Radio,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { YouTuber, Category } from '../types';
import { formatCompact } from '../utils/formatters';
import { searchYouTubeChannels, fetchYouTubersByCategory } from '../services/youtubeApi';
import { GrowthIndicator } from './GrowthIndicator';
import { calculateSubscriberMilestone } from '../utils/milestones';
import { isChannelInFavorites } from '../utils/favorites';

interface SearchScreenProps {
  youtubers: YouTuber[];
  favoriteIds: string[];
  onToggleFavorite: (youtuber: YouTuber, e: React.MouseEvent) => void;
  onSelectYouTuber: (youtuber: YouTuber) => void;
}

const CATEGORIES: { label: Category; name: string }[] = [
  { label: 'Alle', name: 'Alle' },
  { label: 'Underholdning', name: 'Underholdning' },
  { label: 'Gaming', name: 'Gaming' },
  { label: 'Vlogs & Livsstil', name: 'Vlogs & Livsstil' },
  { label: 'Comedy', name: 'Comedy' },
  { label: 'Sport & Fodbold', name: 'Sport & Fodbold' },
  { label: 'Musik & Kultur', name: 'Musik & Kultur' },
];

const POPULAR_SEARCH_SUGGESTIONS = [
  'Alexander Husum',
  'Morten Münster',
  'RobinSamse',
  'Niki Topgaard',
  'Judex',
  'DR P3',
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  youtubers,
  favoriteIds,
  onToggleFavorite,
  onSelectYouTuber,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Alle');
  const [sortBy, setSortBy] = useState<'subscribers' | 'views' | 'growth' | 'milestone'>('subscribers');

  // Live YouTube API Search State (Text Search)
  const [isSearching, setIsSearching] = useState(false);
  const [apiResults, setApiResults] = useState<YouTuber[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Category Search State
  const [categoryResults, setCategoryResults] = useState<YouTuber[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Function to load channels dynamically for a category via YouTube Data API
  const loadCategoryChannels = async (cat: Category, forceRefresh = false) => {
    setIsCategoryLoading(true);
    setCategoryError(null);
    try {
      const res = await fetchYouTubersByCategory(cat, forceRefresh);
      setCategoryResults(res.channels || []);
    } catch (err: any) {
      console.warn(`Fejl ved hentning af kategori "${cat}":`, err);
      setCategoryError(
        `Kunne ikke hente ${cat} live via YouTube API (${err.message || 'fejl'}). Viser lokale data.`
      );
      // Fallback to local filtering
      const fallback = youtubers.filter(
        (yt) => cat === 'Alle' || yt.category === cat
      );
      setCategoryResults(fallback);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  // Trigger dynamic category load on category change
  useEffect(() => {
    loadCategoryChannels(selectedCategory, false);
  }, [selectedCategory]);

  // Live search effect on query change
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!trimmed) {
      setIsSearching(false);
      setApiResults([]);
      setSearchError(null);
      return;
    }

    // Debounce live search by 350ms
    setIsSearching(true);
    setSearchError(null);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchYouTubeChannels(trimmed);
        setApiResults(results);
        setSearchError(null);
      } catch (err: any) {
        console.warn('YouTube live search error:', err);
        setSearchError('Kunne ikke nå YouTube i øjeblikket. Viser lokale resultater.');
        // Fallback to local filtering if API error
        const localMatches = youtubers.filter(
          (y) =>
            y.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            y.channelName.toLowerCase().includes(trimmed.toLowerCase()) ||
            y.handle.toLowerCase().includes(trimmed.toLowerCase())
        );
        setApiResults(localMatches);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, youtubers]);

  // If search query is active, use apiResults; otherwise use dynamically fetched category results
  const displayList = useMemo(() => {
    const sortFn = (a: YouTuber, b: YouTuber) => {
      if (sortBy === 'views') return b.totalViews - a.totalViews;
      if (sortBy === 'growth') return b.monthlyGrowthPct - a.monthlyGrowthPct;
      if (sortBy === 'milestone') {
        const mA = calculateSubscriberMilestone(a.subscribers, a.monthlySubGain, a.monthlyGrowthPct);
        const mB = calculateSubscriberMilestone(b.subscribers, b.monthlySubGain, b.monthlyGrowthPct);
        return mB.progressPercent - mA.progressPercent;
      }
      return b.subscribers - a.subscribers;
    };

    if (searchQuery.trim().length > 0) {
      return [...apiResults].sort(sortFn);
    }

    // Dynamic Category view: use API categoryResults or fallback to youtubers list
    const baseList =
      categoryResults.length > 0
        ? categoryResults
        : youtubers.filter(
            (yt) => selectedCategory === 'Alle' || yt.category === selectedCategory
          );
    return [...baseList].sort(sortFn);
  }, [searchQuery, apiResults, categoryResults, youtubers, selectedCategory, sortBy]);

  return (
    <div id="search-screen-container" className="space-y-4 pb-24">
      {/* Top Header & Search Bar */}
      <div className="sticky top-0 z-30 pt-2 pb-3 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Søg YouTube</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
                Live API
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Søg alle eksisterende kanaler i realtid via YouTube Data API
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">
              {isSearching ? 'Søger...' : `${displayList.length} kanaler`}
            </span>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <input
            id="youtube-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søg kanal, handle (@navn) eller emne i realtid..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Ryd søgning"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips when search is empty */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap pl-1 pr-0.5">
              Populære:
            </span>
            {POPULAR_SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setSearchQuery(suggestion)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Category Pills (Visible when not actively searching text) */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40 ring-1 ring-rose-400/50'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isSelected && isCategoryLoading && (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Status & Live API Indicator / Refresh */}
      {!searchQuery && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
              <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
              <span>Kategori:</span>
              <span className="text-white font-semibold">{selectedCategory}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400">
              {isCategoryLoading ? 'Henter live...' : `${displayList.length} kanaler`}
            </span>
          </div>
          <button
            onClick={() => loadCategoryChannels(selectedCategory, true)}
            disabled={isCategoryLoading}
            title="Genindlæs kategori via YouTube Data API"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isCategoryLoading ? 'animate-spin text-rose-400' : 'text-slate-400'
              }`}
            />
            <span>Opdater</span>
          </button>
        </div>
      )}

      {/* Category Error Notice */}
      {categoryError && !isCategoryLoading && !searchQuery && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{categoryError}</span>
        </div>
      )}

      {/* Live search indicator or error notice for text search */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-rose-400 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Henter live data og kanalstatistik direkte fra YouTube...</span>
        </div>
      )}

      {searchError && !isSearching && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Sorting Controls */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-400">
        <span className="text-[11px]">
          {searchQuery ? `Realtidsresultater for "${searchQuery}"` : 'Sortering:'}
        </span>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setSortBy('subscribers')}
            className={`px-2 py-1 rounded cursor-pointer ${
              sortBy === 'subscribers'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Abonnenter
          </button>
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

      {/* Loading Skeletons for Category */}
      {isCategoryLoading && !searchQuery && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            <span>Søger dynamisk efter danske {selectedCategory}-kanaler via YouTube Data API...</span>
          </div>
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="animate-pulse flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1 min-w-0 pr-4">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800/70 rounded w-1/4" />
                  <div className="h-3 bg-slate-800/50 rounded w-1/2" />
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* List of YouTubers (Shown when not in category skeleton loading) */}
      {(!isCategoryLoading || searchQuery) && (
        <div className="space-y-2.5">
          {displayList.map((yt, index) => {
            const isFav = isChannelInFavorites(yt, favoriteIds);
            const milestone = calculateSubscriberMilestone(
              yt.subscribers,
              yt.monthlySubGain,
              yt.monthlyGrowthPct
            );
            return (
              <div
                key={yt.id}
                id={`youtuber-card-${yt.id}`}
                onClick={() => onSelectYouTuber(yt)}
                className="group relative flex items-center justify-between p-3.5 bg-slate-900/80 hover:bg-slate-850 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-black/40"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                  {/* Avatar with fallback */}
                  <div className="relative shrink-0">
                    <img
                      src={yt.avatarUrl}
                      alt={yt.channelName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-rose-500/50 transition-all bg-slate-800"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {index < 3 && !searchQuery && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-slate-100 truncate group-hover:text-rose-400 transition-colors">
                        {yt.channelName}
                      </h2>
                      {yt.verified && (
                        <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="truncate">{yt.handle}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {yt.category}
                      </span>
                    </div>

                    {/* Key Stats Line with Growth Indicator */}
                    <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-white">
                          {formatCompact(yt.subscribers)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>{formatCompact(yt.totalViews)}</span>
                      </div>
                      {yt.videoCount > 0 && (
                        <div className="flex items-center gap-1 text-slate-400 hidden sm:flex">
                          <Video className="w-3 h-3" />
                          <span>{yt.videoCount}</span>
                        </div>
                      )}
                      <GrowthIndicator
                        growthPct={yt.monthlyGrowthPct}
                        monthlyGain={yt.monthlySubGain}
                        showSubGain={true}
                        size="sm"
                      />
                    </div>

                    {/* Round Subscriber Milestone Progress Bar */}
                    <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate text-[10px] text-slate-300">
                        Mål: <strong className="text-white font-semibold">{formatCompact(milestone.nextMilestone)}</strong> ({milestone.badge})
                      </span>
                      <div className="flex-1 max-w-[60px] h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                          style={{ width: `${Math.max(4, milestone.progressPercent)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          milestone.isClose ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {milestone.progressPercent}%
                      </span>
                      {milestone.isClose && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 shrink-0">
                          Tæt på
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action: Plus (+) button on the right side */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id={`btn-add-favorite-${yt.id}`}
                    onClick={(e) => onToggleFavorite(yt, e)}
                    title={isFav ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isFav
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-rose-500 shadow-sm active:scale-95'
                    }`}
                    aria-label={isFav ? `Fjern ${yt.channelName}` : `Tilføj ${yt.channelName}`}
                  >
                    {isFav ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block" />
                </div>
              </div>
            );
          })}

          {!isSearching && displayList.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/50 border border-slate-800">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">
                Ingen kanaler fundet på YouTube for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Prøv at søge efter fx kanalnavn, emne eller direkte kanal-handle (f.eks. @alexanderhusum).
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Alle');
                }}
                className="mt-3 px-3 py-1.5 bg-slate-800 text-xs font-medium text-slate-200 rounded-lg hover:bg-slate-700 cursor-pointer"
              >
                Nulstil søgning
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
