import { YouTuber, WeeklyRankingResponse, TopRecentVideosResponse } from '../types';

export interface ApiStatus {
  hasKey: boolean;
  keyPrefix?: string | null;
}

export interface CategoryResponse {
  category: string;
  total: number;
  channels: YouTuber[];
  isLiveApi: boolean;
  fetchedAt: string;
}

const searchCache = new Map<string, { timestamp: number; data: YouTuber[] }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const categoryCacheClient = new Map<string, { timestamp: number; data: CategoryResponse }>();
const CATEGORY_CLIENT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function fetchBatchChannelStats(forceRefresh = false): Promise<YouTuber[]> {
  try {
    const res = await fetch(`/api/youtube/channels${forceRefresh ? '?refresh=true' : ''}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.channels || [];
  } catch (err) {
    console.warn('Fejl ved hentning af batch kanalstatistik:', err);
    return [];
  }
}

export async function fetchYouTubersByCategory(
  category: string,
  forceRefresh = false
): Promise<CategoryResponse> {
  const trimmed = category.trim() || 'Alle';
  const cacheKey = trimmed.toLowerCase();

  if (!forceRefresh) {
    const cached = categoryCacheClient.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CATEGORY_CLIENT_CACHE_TTL) {
      return cached.data;
    }
  }

  const params = new URLSearchParams();
  params.set('category', trimmed);
  if (forceRefresh) {
    params.set('refresh', 'true');
  }

  const res = await fetch(`/api/youtube/category?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data: CategoryResponse = await res.json();
  categoryCacheClient.set(cacheKey, {
    timestamp: Date.now(),
    data,
  });
  return data;
}

export async function fetchTopWeeklyYouTubers(
  extraChannelIds: string[] = [],
  forceRefresh = false
): Promise<WeeklyRankingResponse> {
  const params = new URLSearchParams();
  if (extraChannelIds.length > 0) {
    params.set('extraChannelIds', extraChannelIds.join(','));
  }
  if (forceRefresh) {
    params.set('refresh', 'true');
  }

  const url = `/api/youtube/top-weekly${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchTopRecentVideos(
  channelIds: string[] = [],
  scope: 'favorites' | 'all' = 'favorites',
  forceRefresh = false
): Promise<TopRecentVideosResponse> {
  const params = new URLSearchParams();
  if (channelIds.length > 0) {
    params.set('channelIds', channelIds.join(','));
  }
  params.set('scope', scope);
  if (forceRefresh) {
    params.set('refresh', 'true');
  }

  const url = `/api/youtube/top-recent-videos?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function searchYouTubeChannels(query: string): Promise<YouTuber[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const channels: YouTuber[] = data.channels || [];
    searchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: channels,
    });
    return channels;
  } catch (error) {
    console.error('Søgning i YouTube Data API fejlede:', error);
    throw error;
  }
}

export async function getYouTubeChannelDetails(channelId: string): Promise<YouTuber | null> {
  if (!channelId) return null;
  try {
    const res = await fetch(`/api/youtube/channel/${encodeURIComponent(channelId)}`);
    if (!res.ok) {
      return null;
    }
    const data: YouTuber = await res.json();
    return data;
  } catch (error) {
    console.error(`Fejl ved hentning af kanal ${channelId}:`, error);
    return null;
  }
}

export async function checkYouTubeApiStatus(): Promise<ApiStatus> {
  try {
    const res = await fetch('/api/youtube/status');
    if (!res.ok) return { hasKey: false };
    return await res.json();
  } catch {
    return { hasKey: false };
  }
}
