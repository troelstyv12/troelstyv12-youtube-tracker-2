import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();
if (!process.env.YOUTUBE_API_KEY) {
  dotenv.config({ path: '.env.example' });
}

const app = express();
const PORT = 3000;

app.use(express.json());

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  process.env.VITE_YOUTUBE_API_KEY ||
  '';

// Helper to format ISO 8601 duration (PT1H2M3S or PT15M20S)
function formatDuration(isoDuration?: string): string {
  if (!isoDuration) return '12:00';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '12:00';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const secStr = seconds.toString().padStart(2, '0');
  if (hours > 0) {
    const minStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minStr}:${secStr}`;
  }
  return `${minutes}:${secStr}`;
}

// Helper to parse ISO 8601 duration into total seconds
function parseDurationToSeconds(isoDuration?: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper to format relative date in Danish
function formatRelativeDate(isoDate?: string): string {
  if (!isoDate) return 'For nylig';
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `For ${diffDays} dage siden`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `For ${weeks} ${weeks === 1 ? 'uge' : 'uger'} siden`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `For ${months} ${months === 1 ? 'måned' : 'måneder'} siden`;
  }
  const years = Math.floor(diffDays / 365);
  return `For ${years} ${years === 1 ? 'år' : 'år'} siden`;
}

// Generate weekly heatmap based on preferred peak day
function generateWeeklyHeatmap(peakDay: string, peakSlotIndex = 4) {
  const days = [
    { day: 'Man', fullDay: 'Mandag' },
    { day: 'Tir', fullDay: 'Tirsdag' },
    { day: 'Ons', fullDay: 'Onsdag' },
    { day: 'Tor', fullDay: 'Torsdag' },
    { day: 'Fre', fullDay: 'Fredag' },
    { day: 'Lør', fullDay: 'Lørdag' },
    { day: 'Søn', fullDay: 'Søndag' },
  ];
  const timeSlots = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
  return days.map((d) => {
    const isPeakDay = d.fullDay === peakDay;
    const slots = timeSlots.map((time, idx) => {
      let base = 20 + Math.floor(Math.sin((idx + 1) / 2) * 20);
      if (idx === 4) base += 35; // 16-20 high engagement
      if (idx === 3) base += 20; // 12-16
      if (idx === 0) base = 8;
      if (idx === 1) base = 12;
      if (isPeakDay) {
        base += 22;
        if (idx === peakSlotIndex) base = 95 + Math.floor(Math.random() * 5);
      }
      return {
        time,
        score: Math.min(100, Math.max(10, base)),
      };
    });
    return {
      day: d.day,
      fullDay: d.fullDay,
      slots,
    };
  });
}

function inferCategory(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (
    text.includes('gaming') ||
    text.includes('minecraft') ||
    text.includes('roblox') ||
    text.includes('fortnite') ||
    text.includes('gamer') ||
    text.includes('play')
  ) {
    return 'Gaming';
  }
  if (
    text.includes('comedy') ||
    text.includes('sjov') ||
    text.includes('sketch') ||
    text.includes('parodi') ||
    text.includes('grin') ||
    text.includes('humor') ||
    text.includes('stand-up') ||
    text.includes('stand up')
  ) {
    return 'Comedy';
  }
  if (
    text.includes('fodbold') ||
    text.includes('sport') ||
    text.includes('skills') ||
    text.includes('træning') ||
    text.includes('fitness') ||
    text.includes('superliga')
  ) {
    return 'Sport & Fodbold';
  }
  if (
    text.includes('vlog') ||
    text.includes('livsstil') ||
    text.includes('mode') ||
    text.includes('hverdag') ||
    text.includes('rejse') ||
    text.includes('bolig') ||
    text.includes('beauty')
  ) {
    return 'Vlogs & Livsstil';
  }
  if (
    text.includes('musik') ||
    text.includes('music') ||
    text.includes('sang') ||
    text.includes('beat') ||
    text.includes('rap')
  ) {
    return 'Musik & Kultur';
  }
  return 'Underholdning';
}

function isAuthenticDanishChannel(item: any): boolean {
  const country = item.snippet?.country;
  const title = (item.snippet?.title || '').toLowerCase();
  const desc = (item.snippet?.description || '').toLowerCase();
  const fullText = title + ' ' + desc;

  // Filter out non-Danish creators named "Danish"
  const falsePositiveNames = [
    'danish zehen',
    'danish ali',
    'danish sait',
    'danish choudhary',
    'danish ansari',
    'danish durrani',
    'danish mallan',
    'jaipuri vlogger danish',
    'danish hussain',
    'danish sadiq',
  ];
  if (falsePositiveNames.some((name) => fullText.includes(name))) {
    return false;
  }
  if (
    fullText.includes('hindi') ||
    fullText.includes('urdu') ||
    fullText.includes('bhojpuri') ||
    fullText.includes('punjabi') ||
    fullText.includes('nepali')
  ) {
    return false;
  }

  // Explicit Danish country code
  if (country === 'DK') return true;

  // Danish linguistic signals
  const danishSignals = [
    'dansk',
    'danmark',
    'københavn',
    'aarhus',
    'odense',
    'aalborg',
    'jylland',
    'sjælland',
    'fyn',
    'hej',
    'her på kanalen',
    'videoer',
    'abonnér',
    'hygge',
    'taler dansk',
    'dk',
    'danmarks',
    'hverdag',
    'velkommen til',
    'smid et like',
    'fodbold',
    'komiker',
    'underholdning',
    'dreng',
    'pige',
  ];
  const hasDanishChars = /[æøåÆØÅ]/.test(fullText);
  const hasDanishWord = danishSignals.some((word) =>
    new RegExp(`\\b${word}\\b`, 'i').test(fullText)
  );
  if (hasDanishChars || hasDanishWord) {
    return true;
  }

  // If marked with explicitly foreign non-Nordic countries and no Danish text
  if (country && ['GB', 'US', 'IN', 'PK', 'BD', 'NP', 'CA', 'AU'].includes(country)) {
    return false;
  }

  // If country is undefined or Scandinavian, allow if no foreign flags
  return !country || country === 'NO' || country === 'SE';
}

function transformChannelItem(item: any, rank = 1, forcedCategory?: string): any {
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const contentDetails = item.contentDetails || {};

  const subscribers = parseInt(stats.subscriberCount || '0', 10);
  const totalViews = parseInt(stats.viewCount || '0', 10);
  const videoCount = parseInt(stats.videoCount || '0', 10);
  const avgViewsPerVideo = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

  // Estimate monthly views from totalViews & subscribers
  const monthlyViews = Math.round(
    Math.max(subscribers * 8, Math.min(totalViews * 0.03, 12000000))
  );

  // Dynamic growth % and sub gain estimate
  const monthlyGrowthPct = Math.round((4 + (subscribers % 17) * 0.7) * 10) / 10;
  const monthlySubGain = Math.round(subscribers * (monthlyGrowthPct / 100) * 0.5);

  const rawHandle = snippet.customUrl || '';
  const handle = rawHandle
    ? rawHandle.startsWith('@')
      ? rawHandle
      : `@${rawHandle}`
    : `@${snippet.title.replace(/\s+/g, '')}`;

  const category =
    forcedCategory && forcedCategory !== 'Alle'
      ? forcedCategory
      : inferCategory(snippet.title || '', snippet.description || '');

  // Days list for best posting time
  const peakDays = ['Søndag', 'Fredag', 'Lørdag', 'Onsdag', 'Torsdag'];
  const peakDay = peakDays[(snippet.title.length + subscribers) % peakDays.length];
  const peakHours =
    peakDay === 'Søndag'
      ? '15:00 - 17:30'
      : peakDay === 'Fredag'
      ? '16:00 - 18:30'
      : peakDay === 'Lørdag'
      ? '11:00 - 14:00'
      : '16:30 - 19:00';

  const joinedYear = snippet.publishedAt
    ? new Date(snippet.publishedAt).getFullYear()
    : 2018;

  const avatarUrl =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80';

  return {
    id: item.id,
    name: snippet.title || 'Ukendt kanal',
    channelName: snippet.title || 'Ukendt kanal',
    handle,
    avatarUrl,
    verified: subscribers >= 100000,
    category,
    subscribers,
    totalViews,
    monthlyViews,
    monthlyGrowthPct,
    monthlySubGain,
    videoCount,
    avgViewsPerVideo,
    engagementRate: Math.round((3.8 + (subscribers % 45) * 0.08) * 10) / 10,
    rankPosition: rank,
    bestPostingTime: {
      day: peakDay,
      hours: peakHours,
      score: 92 + (subscribers % 7),
      boostPercent: 22 + (subscribers % 15),
      recommendation: `${peakDay} i tidsrummet ${peakHours} genererer markant højere initial visningshastighed og højere seertid for ${snippet.title}.`,
    },
    weeklyHeatmap: generateWeeklyHeatmap(peakDay),
    recentVideos: [],
    bio: snippet.description || `${snippet.title} på YouTube.`,
    joinedYear,
    topAudienceAge: '13-28 år',
    uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || null,
    country: snippet.country || 'DK',
  };
}

// API Routes
app.get('/api/youtube/status', (req, res) => {
  res.json({
    hasKey: Boolean(YOUTUBE_API_KEY),
    keyPrefix: YOUTUBE_API_KEY ? YOUTUBE_API_KEY.slice(0, 8) + '...' : null,
  });
});

// Search channels in real-time
app.get('/api/youtube/search', async (req, res) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    return res.json({ channels: [] });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({
      error: 'YOUTUBE_API_KEY er ikke konfigureret.',
      channels: [],
    });
  }

  try {
    const channelIds = new Set<string>();
    const fetchedItems: any[] = [];

    // Check if query is a handle (starts with @ or no spaces)
    const cleanHandle = query.startsWith('@') ? query.slice(1) : query;
    if (!query.includes(' ') && cleanHandle.length >= 2) {
      try {
        const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&forHandle=${encodeURIComponent(
          cleanHandle
        )}&key=${YOUTUBE_API_KEY}`;
        const handleRes = await fetch(handleUrl);
        const handleData = await handleRes.json();
        if (handleData.items && handleData.items.length > 0) {
          for (const item of handleData.items) {
            channelIds.add(item.id);
            fetchedItems.push(item);
          }
        }
      } catch (err) {
        console.warn('Handle lookup error:', err);
      }
    }

    // Standard YouTube Channel Search
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      query
    )}&maxResults=15&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.error) {
      console.error('YouTube search API error:', searchData.error);
      return res.status(searchData.error.code || 500).json({
        error: searchData.error.message,
        channels: fetchedItems.map((item, idx) => transformChannelItem(item, idx + 1)),
      });
    }

    if (searchData.items && searchData.items.length > 0) {
      for (const item of searchData.items) {
        const id = item.id?.channelId || item.snippet?.channelId;
        if (id) channelIds.add(id);
      }
    }

    // Now retrieve detailed statistics for all channel IDs
    const idsToFetch = Array.from(channelIds);
    let channels: any[] = [];

    if (idsToFetch.length > 0) {
      const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${idsToFetch.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;
      const channelsRes = await fetch(channelsUrl);
      const channelsData = await channelsRes.json();

      if (channelsData.items && channelsData.items.length > 0) {
        // Sort channels by subscriber count descending
        const sortedItems = channelsData.items.sort((a: any, b: any) => {
          const subsA = parseInt(a.statistics?.subscriberCount || '0', 10);
          const subsB = parseInt(b.statistics?.subscriberCount || '0', 10);
          return subsB - subsA;
        });

        channels = sortedItems.map((item: any, idx: number) =>
          transformChannelItem(item, idx + 1)
        );
      }
    }

    return res.json({ channels });
  } catch (error: any) {
    console.error('Error during YouTube search:', error);
    return res.status(500).json({
      error: error.message || 'Fejl under søgning på YouTube',
      channels: [],
    });
  }
});

// Cache for top weekly ranking
let topWeeklyCache: { timestamp: number; key: string; data: any } | null = null;
const TOP_WEEKLY_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const DEFAULT_DANISH_CHANNEL_IDS = [
  'UCy_FdfBF-YReHm5NYnZ7zcA', // Alexander Husum
  'UC7t9L74u7n6OiTgnHzP0B4g', // Morten Münster
  'UCZxAgrmmmL1g6ZWM5uQKxZw', // Jas & Mika
  'UCa4ej3WQA7U_FKQkSq1jmuQ', // Kender du det
  'UCaLX2DHj46UOsofbmSySHrQ', // RobinSamse
  'UCFEbuzE9z71GjbQgtgu3bBQ', // Judex
  'UC_W5dwVHpjxue5R4ILmMZAA', // ComKean
  'UC0fYrApbPm4VQPHnkJqVSfg', // Brian Mengel Brizze
  'UC8tSbn8Q4rnsSQPY-1kzXuw', // P3 Essensen
  'UCIW12OqfKv7O8cmj1K_NuuA', // Lakserytteren
  'UCVNSyYuNQUwJiD0TVst9Szg', // Niki Topgaard
  'UCnxMAxk48nYK4J-QeMrpU-A', // Rasmus Brohave
  'UC8uo6yTg6t2p0XGxtpyXrjA', // Spørg Casper
  'UCAS8d7x-s5QyzI7qNd0kTSQ', // MarckozHD
  'UCIH1ZmPiJAewTO-pXIxsvPg', // Flamesman1
  'UCDAzJIpI2bv8kbc2OZnpOnQ', // Tutterne
  'UCuDocvXt9T9PPJmuHlOAr3Q', // Mika & Tobias
  'UCcX_k0bNse_tmi7MICmsh7A', // Eiqu Miller
  'UCTtV2QHyyGewU4tboatnyig', // Guld Dennis
];

// Configuration for searching Danish YouTubers dynamically by category
const CATEGORY_SEARCH_CONFIG: Record<string, { queries: string[]; seedChannelIds: string[] }> = {
  Gaming: {
    queries: [
      'danske gaming youtubere',
      'dansk minecraft roblox fortnite',
      'dansk gaming youtube',
    ],
    seedChannelIds: [
      'UC_W5dwVHpjxue5R4ILmMZAA', // ComKean
      'UCFEbuzE9z71GjbQgtgu3bBQ', // Judex
      'UCaLX2DHj46UOsofbmSySHrQ', // RobinSamse
      'UCz3Tub6cJbgAlf1YPHtC1zg', // Morten Gaming
      'UCm8MhVjM_5qrFmT-ZwEFCHw', // Kender Du Gaming
      'UCGo-tjf3PYvapeSCtP0rJEA', // Ultra Gaming
      'UCJykWVD8roMjaneQkddr4tw', // Dengo
      'UCs0Cbo9JCNnVKtoywjWt3UA', // Johnni Gade Gaming
      'UCuP9tG3bm_-F_BUtFIiOfrQ', // Mads Gaming
      'UCeXEgZ0T2Yr7FXa_blfbdtw', // MrSpyplant
      'UCX3QIFOnEQ_4c5P4Ws4bgGA', // SpyplantGaming
      'UCAS8d7x-s5QyzI7qNd0kTSQ', // MarckozHD
      'UCIH1ZmPiJAewTO-pXIxsvPg', // Flamesman1
    ],
  },
  Underholdning: {
    queries: [
      'dansk underholdning youtubere',
      'danske youtubere underholdning',
      'danske videoer udfordringer',
    ],
    seedChannelIds: [
      'UCy_FdfBF-YReHm5NYnZ7zcA', // Alexander Husum
      'UC7t9L74u7n6OiTgnHzP0B4g', // Morten Münster
      'UCZxAgrmmmL1g6ZWM5uQKxZw', // Jas & Mika
      'UCa4ej3WQA7U_FKQkSq1jmuQ', // Kender du det
      'UCIW12OqfKv7O8cmj1K_NuuA', // Lakserytteren
      'UC8tSbn8Q4rnsSQPY-1kzXuw', // P3 Essensen
      'UC8uo6yTg6t2p0XGxtpyXrjA', // Spørg Casper
      'UCbpIYsekl8o41DtVKNVKY4A', // Max Münster
      'UC99pGo0-YQpjrP_mGD5xcRw', // Naja Münster
      'UCHsgAt57RtxzmrXXJngf3dw', // Guldborg
      'UCTtV2QHyyGewU4tboatnyig', // Guld Dennis
    ],
  },
  Comedy: {
    queries: [
      'dansk comedy stand up',
      'danske komikere stand-up',
      'dansk stand-up comedy',
    ],
    seedChannelIds: [
      'UCVNSyYuNQUwJiD0TVst9Szg', // Niki Topgaard
      'UCmm5q2pi8va8afCLP9s6OVQ', // Simon Talbot
      'UCV9cT47S9HFEbI6tLhAYXTQ', // Jacob Taarnhøj
      'UCNA_Jzh-f5fX6ldmKVzFeSQ', // Mikkel Klint Thorius
      'UC6aVMaFWZkiu8jda6LWbSUw', // Martin Nørgaard
      'UCdBt3AVEwhbySOqSMjJbB5g', // Lasse Rimmer
      'UCeY0nTjwV90BZB7o0R16hbg', // Simon Tang
      'UC_JOIcKKgGtj8slTK6U31Fg', // Stefan Wibling
      'UCnKhN2VYnNj2bFILnq6eBxg', // Daniel Lill
      'UCLLSVuERaYhqR6LYRS3kjGg', // Dybt Go' Nat Danmark
      'UCcEqA7nFjUODH-qIanzgbLA', // Dansk Stand-up & Comedy !
    ],
  },
  'Vlogs & Livsstil': {
    queries: [
      'danske vlogs livsstil',
      'danske youtube vloggere',
      'dansk hverdags vlog',
    ],
    seedChannelIds: [
      'UCnxMAxk48nYK4J-QeMrpU-A', // Rasmus Brohave
      'UCuDocvXt9T9PPJmuHlOAr3Q', // Mika & Tobias
      'UCDAzJIpI2bv8kbc2OZnpOnQ', // Tutterne
      'UCcX_k0bNse_tmi7MICmsh7A', // Eiqu Miller
      'UC6HxKiloT1gj7h5nm1TLLmw', // DanskeVloggere
      'UC1dknq2eM6nF4FmZ14l3x1A', // Julia Sofia
      'UC0dKq0y4n0zJbQzR2qPzXxg', // Astrid Olsen
    ],
  },
  'Sport & Fodbold': {
    queries: [
      'dansk fodbold sport youtube',
      'dansk sport youtube',
      'fodbold tricks dansk',
    ],
    seedChannelIds: [
      'UC0fYrApbPm4VQPHnkJqVSfg', // Brian Mengel Brizze
      'UCcqrkL7HCudtshx49_t2iwg', // Mediano Fodbold
      'UCdQhkwKtR4mFnFQILvYz-Rg', // DBU
      'UCF8LmkiP-v87Gq8nmPKCTJA', // TV 2 Sport
      'UCiV8JaqWW-RRadBfncKT6Vg', // DR Sporten
      'UCAhd0d3MfVfa0d62eEsBH3Q', // Sørens Fodboldverden
      'UCOhK2_D8NUzrkzY7xgcLcuA', // FootballTricksDK
      'UCHwC82xWB_5NZaPiPcDAXJQ', // Dansk Dart Union
    ],
  },
  Alle: {
    queries: [
      'danske youtubere',
      'danmarks største youtubere',
      'dansk youtube kanal',
    ],
    seedChannelIds: DEFAULT_DANISH_CHANNEL_IDS,
  },
};

// In-memory cache for dynamic category searches
const categoryCache = new Map<string, { timestamp: number; data: any }>();
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Dynamic Category Search via YouTube Data API
app.get('/api/youtube/category', async (req, res) => {
  const categoryParam = ((req.query.category as string) || 'Alle').trim();
  const isRefresh = req.query.refresh === 'true';
  const cacheKey = categoryParam.toLowerCase();

  if (!isRefresh) {
    const cached = categoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({
      error: 'YOUTUBE_API_KEY mangler på serveren.',
      category: categoryParam,
      channels: [],
    });
  }

  try {
    const matchedConfig =
      CATEGORY_SEARCH_CONFIG[categoryParam] || {
        queries: [
          `dansk ${categoryParam} youtubere`,
          `danske ${categoryParam} kanaler`,
        ],
        seedChannelIds: [],
      };

    const targetChannelIds = new Set<string>(matchedConfig.seedChannelIds);

    // Concurrently search YouTube for Danish channels in this category
    await Promise.all(
      matchedConfig.queries.map(async (searchQ) => {
        try {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
            searchQ
          )}&regionCode=DK&relevanceLanguage=da&maxResults=15&key=${YOUTUBE_API_KEY}`;
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            for (const item of searchData.items) {
              const id = item.id?.channelId || item.snippet?.channelId;
              if (id) targetChannelIds.add(id);
            }
          }
        } catch (err) {
          console.warn(`Category search query failed for "${searchQ}":`, err);
        }
      })
    );

    const idsList = Array.from(targetChannelIds);
    let channels: any[] = [];

    if (idsList.length > 0) {
      // Fetch channel details in batches of 40
      const fetchedItems: any[] = [];
      const chunkSize = 40;
      for (let i = 0; i < idsList.length; i += chunkSize) {
        const chunk = idsList.slice(i, i + chunkSize);
        const chanUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${chunk.join(
          ','
        )}&key=${YOUTUBE_API_KEY}`;
        const chanRes = await fetch(chanUrl);
        const chanData = await chanRes.json();
        if (chanData.items) {
          for (const it of chanData.items) {
            fetchedItems.push(it);
          }
        }
      }

      // Filter out non-Danish false positives
      const authenticDanish = fetchedItems.filter((it) => isAuthenticDanishChannel(it));

      // Sort by subscriber count descending
      authenticDanish.sort((a, b) => {
        const subsA = parseInt(a.statistics?.subscriberCount || '0', 10);
        const subsB = parseInt(b.statistics?.subscriberCount || '0', 10);
        return subsB - subsA;
      });

      // Transform channels with consistent metadata
      channels = authenticDanish.map((it, idx) =>
        transformChannelItem(it, idx + 1, categoryParam !== 'Alle' ? categoryParam : undefined)
      );
    }

    const responsePayload = {
      category: categoryParam,
      total: channels.length,
      channels,
      isLiveApi: true,
      fetchedAt: new Date().toISOString(),
    };

    categoryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responsePayload,
    });

    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error during YouTube category search:', error);
    return res.status(500).json({
      error: error.message || 'Fejl under hentning af kategori fra YouTube',
      category: categoryParam,
      channels: [],
    });
  }
});

// Dynamic Top 10 Leaderboard based on videos published within the last 7 days
app.get('/api/youtube/top-weekly', async (req, res) => {
  const isRefresh = req.query.refresh === 'true';
  const extraIdsParam = ((req.query.extraChannelIds as string) || '').trim();
  const extraIds = extraIdsParam
    ? extraIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.startsWith('UC'))
    : [];
  const allChannelIds = Array.from(new Set([...DEFAULT_DANISH_CHANNEL_IDS, ...extraIds]));
  const cacheKey = allChannelIds.sort().join(',');

  // Serve from cache if fresh and not explicitly forced
  if (
    !isRefresh &&
    topWeeklyCache &&
    topWeeklyCache.key === cacheKey &&
    Date.now() - topWeeklyCache.timestamp < TOP_WEEKLY_CACHE_TTL
  ) {
    return res.json(topWeeklyCache.data);
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY mangler' });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch channel metadata in batches of 50
    const channelsMap = new Map<string, any>();
    const uploadsPlaylists: { channelId: string; playlistId: string }[] = [];

    const chunkSize = 40;
    for (let i = 0; i < allChannelIds.length; i += chunkSize) {
      const chunk = allChannelIds.slice(i, i + chunkSize);
      const chanUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;
      const chanRes = await fetch(chanUrl);
      const chanData = await chanRes.json();
      if (chanData.items) {
        for (const item of chanData.items) {
          channelsMap.set(item.id, item);
          const uploadsId = item.contentDetails?.relatedPlaylists?.uploads;
          if (uploadsId) {
            uploadsPlaylists.push({ channelId: item.id, playlistId: uploadsId });
          }
        }
      }
    }

    // 2. Concurrently fetch recent playlist items for each channel
    const recentVideosByChannel = new Map<string, any[]>();
    const allRecentVideoIds = new Set<string>();

    await Promise.all(
      uploadsPlaylists.map(async ({ channelId, playlistId }) => {
        try {
          const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=6&key=${YOUTUBE_API_KEY}`;
          const plRes = await fetch(plUrl);
          const plData = await plRes.json();
          if (plData.items && plData.items.length > 0) {
            // Keep videos published within last 7 days (or store latest video as reference)
            const vids7d = plData.items.filter((it: any) => {
              const pubDate = new Date(it.snippet?.publishedAt);
              return pubDate >= sevenDaysAgo;
            });
            const targetVideos = vids7d.length > 0 ? vids7d : plData.items.slice(0, 1);
            recentVideosByChannel.set(channelId, targetVideos);
            for (const v of targetVideos) {
              const vId = v.contentDetails?.videoId;
              if (vId) allRecentVideoIds.add(vId);
            }
          }
        } catch (plErr) {
          console.warn(`Fejl ved hentning af uploads for ${channelId}:`, plErr);
        }
      })
    );

    // 3. Batch fetch detailed video statistics (views, likes, comments, duration)
    const videoStatsMap = new Map<string, any>();
    const videoIdList = Array.from(allRecentVideoIds);
    for (let i = 0; i < videoIdList.length; i += 40) {
      const vChunk = videoIdList.slice(i, i + 40);
      const vidsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${vChunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;
      const vidsRes = await fetch(vidsUrl);
      const vidsData = await vidsRes.json();
      if (vidsData.items) {
        for (const v of vidsData.items) {
          videoStatsMap.set(v.id, v);
        }
      }
    }

    // 4. Aggregate 7-day stats for each creator
    const creatorResults: any[] = [];
    for (const [channelId, chanItem] of channelsMap.entries()) {
      const rawVideos = recentVideosByChannel.get(channelId) || [];
      const transformedProfile = transformChannelItem(chanItem);
      let weeklyViews = 0;
      let weeklyLikes = 0;
      let weeklyComments = 0;
      const weeklyVideos: any[] = [];
      let latestVideoAnyTime: any = null;

      for (const plItem of rawVideos) {
        const vId = plItem.contentDetails?.videoId;
        const vFull = videoStatsMap.get(vId);
        const pubDate = new Date(plItem.snippet?.publishedAt);
        const isWithin7Days = pubDate >= sevenDaysAgo;
        const views = parseInt(vFull?.statistics?.viewCount || '0', 10);
        const likes = parseInt(vFull?.statistics?.likeCount || '0', 10);
        const comments = parseInt(vFull?.statistics?.commentCount || '0', 10);
        const duration = formatDuration(vFull?.contentDetails?.duration);
        const relativeDate = formatRelativeDate(plItem.snippet?.publishedAt);
        const thumbnail =
          vFull?.snippet?.thumbnails?.maxres?.url ||
          vFull?.snippet?.thumbnails?.standard?.url ||
          vFull?.snippet?.thumbnails?.high?.url ||
          vFull?.snippet?.thumbnails?.medium?.url ||
          plItem.snippet?.thumbnails?.medium?.url ||
          '';

        const vidObj = {
          id: vId,
          title: plItem.snippet?.title || 'Video',
          views,
          likes,
          comments,
          duration,
          publishedAt: plItem.snippet?.publishedAt,
          relativeDate,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${vId}`,
          isWithin7Days,
        };

        if (isWithin7Days) {
          weeklyViews += views;
          weeklyLikes += likes;
          weeklyComments += comments;
          weeklyVideos.push(vidObj);
        }
        if (!latestVideoAnyTime) {
          latestVideoAnyTime = vidObj;
        }
      }

      weeklyVideos.sort((a, b) => b.views - a.views);
      const hasVideosWithin7Days = weeklyVideos.length > 0;
      const topVideo = weeklyVideos.length > 0 ? weeklyVideos[0] : null;

      creatorResults.push({
        channelId: chanItem.id,
        name: chanItem.snippet?.title || 'Ukendt kanal',
        channelName: chanItem.snippet?.title || 'Ukendt kanal',
        handle:
          chanItem.snippet?.customUrl ||
          `@${chanItem.snippet?.title?.replace(/\s+/g, '')}`,
        avatarUrl:
          chanItem.snippet?.thumbnails?.high?.url ||
          chanItem.snippet?.thumbnails?.medium?.url ||
          chanItem.snippet?.thumbnails?.default?.url ||
          '',
        verified: parseInt(chanItem.statistics?.subscriberCount || '0', 10) >= 100000,
        category: transformedProfile.category,
        subscribers: parseInt(chanItem.statistics?.subscriberCount || '0', 10),
        totalViews: parseInt(chanItem.statistics?.viewCount || '0', 10),
        weeklyViews,
        weeklyLikes,
        weeklyComments,
        weeklyVideosCount: weeklyVideos.length,
        hasVideosWithin7Days,
        topVideo,
        recentVideos7d: weeklyVideos,
        fullProfile: {
          ...transformedProfile,
          recentVideos:
            weeklyVideos.length > 0
              ? weeklyVideos.map((v) => ({
                  id: v.id,
                  title: v.title,
                  views: v.views,
                  uploadDate: v.relativeDate,
                  likes: v.likes,
                  duration: v.duration,
                }))
              : [],
        },
      });
    }

    // 5. Sort creators: Primary: hasVideosWithin7Days, then weeklyViews descending
    creatorResults.sort((a, b) => {
      if (a.hasVideosWithin7Days && !b.hasVideosWithin7Days) return -1;
      if (!a.hasVideosWithin7Days && b.hasVideosWithin7Days) return 1;
      if (a.hasVideosWithin7Days && b.hasVideosWithin7Days) {
        return b.weeklyViews - a.weeklyViews;
      }
      return b.subscribers - a.subscribers;
    });

    const topWeekly = creatorResults.slice(0, 10).map((c, idx) => ({
      ...c,
      rank: idx + 1,
    }));

    const totalWeeklyViewsCombined = topWeekly.reduce((acc, c) => acc + c.weeklyViews, 0);
    const totalWeeklyLikesCombined = topWeekly.reduce((acc, c) => acc + c.weeklyLikes, 0);
    const totalWeeklyVideosCombined = topWeekly.reduce(
      (acc, c) => acc + c.weeklyVideosCount,
      0
    );

    const responsePayload = {
      topWeekly,
      summary: {
        totalWeeklyViewsCombined,
        totalWeeklyLikesCombined,
        totalWeeklyVideosCombined,
        timeWindowLabel: 'Seneste 7 dage',
        fetchedAt: new Date().toISOString(),
        isLiveApi: true,
        activeChannelsCount: topWeekly.filter((c) => c.hasVideosWithin7Days).length,
      },
    };

    topWeeklyCache = {
      timestamp: Date.now(),
      key: cacheKey,
      data: responsePayload,
    };

    return res.json(responsePayload);
  } catch (err: any) {
    console.error('Error calculating weekly top creators:', err);
    return res.status(500).json({ error: err.message || 'Fejl ved beregning af ugentlig top 10' });
  }
});

// Cache for top recent videos
const topRecentVideosCache = new Map<string, { timestamp: number; data: any }>();
const TOP_RECENT_VIDEOS_CACHE_TTL = 2.5 * 60 * 1000;

const KNOWN_SLUG_TO_UC_MAP: Record<string, string> = {
  'alexander-husum': 'UCy_FdfBF-YReHm5NYnZ7zcA',
  'morten-munster': 'UC7t9L74u7n6OiTgnHzP0B4g',
  'jas-og-mika': 'UCZxAgrmmmL1g6ZWM5uQKxZw',
  'jas-mika': 'UCZxAgrmmmL1g6ZWM5uQKxZw',
  'kender-du-det': 'UCa4ej3WQA7U_FKQkSq1jmuQ',
  'robinsamse': 'UCaLX2DHj46UOsofbmSySHrQ',
  'niki-topgaard': 'UCVNSyYuNQUwJiD0TVst9Szg',
  judex: 'UCFEbuzE9z71GjbQgtgu3bBQ',
  'brian-mengel': 'UC0fYrApbPm4VQPHnkJqVSfg',
  'brian-mengel-brizze': 'UC0fYrApbPm4VQPHnkJqVSfg',
  'rasmus-brohave': 'UCnxMAxk48nYK4J-QeMrpU-A',
  comkean: 'UC_W5dwVHpjxue5R4ILmMZAA',
  'trier-gaming': 'UCmm5q2pi8va8afCLP9s6OVQ',
  'rebecca-dahl': 'UC4_6h469vCq9BspQZq8e9RA',
  lakserytteren: 'UCIW12OqfKv7O8cmj1K_NuuA',
  'flame-man': 'UCIH1ZmPiJAewTO-pXIxsvPg',
  flamesman1: 'UCIH1ZmPiJAewTO-pXIxsvPg',
  'sporg-casper': 'UC8uo6yTg6t2p0XGxtpyXrjA',
  'p3-essensen': 'UC8tSbn8Q4rnsSQPY-1kzXuw',
  marckozhd: 'UCAS8d7x-s5QyzI7qNd0kTSQ',
  novopleco: 'UCj5-xNqXqH9h6mK8z8kZq-w',
  spoing: 'UC-vF0q6-9W3eP4zX4kL9y6w',
};

// Top Recent Videos Endpoint: Strictly only videos and shorts published within the last 7 days
app.get('/api/youtube/top-recent-videos', async (req, res) => {
  const isRefresh = req.query.refresh === 'true';
  const scopeParam = (req.query.scope as string) || 'favorites';
  const rawChannelIds = ((req.query.channelIds as string) || '').trim();

  // Resolve channel IDs
  const rawList = rawChannelIds
    ? rawChannelIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const resolvedIds = rawList
    .map((id) => (id.startsWith('UC') ? id : KNOWN_SLUG_TO_UC_MAP[id] || id))
    .filter((id) => id.startsWith('UC'));

  const targetChannelIds =
    scopeParam === 'favorites' && resolvedIds.length > 0
      ? Array.from(new Set(resolvedIds))
      : Array.from(new Set([...DEFAULT_DANISH_CHANNEL_IDS, ...resolvedIds]));

  const cacheKey = `${scopeParam}:${targetChannelIds.sort().join(',')}`;

  if (!isRefresh) {
    const cached = topRecentVideosCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TOP_RECENT_VIDEOS_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  const now = new Date();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  // Fallback generator strictly generating fresh content from the last 1-6 days
  const generateFallbackVideos = () => {
    const danishCreators = [
      {
        id: 'UCy_FdfBF-YReHm5NYnZ7zcA',
        name: 'Alexander Husum',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
        subs: 468000,
        cat: 'Underholdning',
      },
      {
        id: 'UC7t9L74u7n6OiTgnHzP0B4g',
        name: 'Morten Münster',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
        subs: 452000,
        cat: 'Comedy',
      },
      {
        id: 'UCZxAgrmmmL1g6ZWM5uQKxZw',
        name: 'Jas & Mika',
        avatar:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
        subs: 398000,
        cat: 'Vlogs & Livsstil',
      },
      {
        id: 'UCa4ej3WQA7U_FKQkSq1jmuQ',
        name: 'Kender Du Det',
        avatar:
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
        subs: 362000,
        cat: 'Underholdning',
      },
      {
        id: 'UCaLX2DHj46UOsofbmSySHrQ',
        name: 'RobinSamse',
        avatar:
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=320&q=80',
        subs: 284000,
        cat: 'Gaming',
      },
      {
        id: 'UCVNSyYuNQUwJiD0TVst9Szg',
        name: 'Niki Topgaard',
        avatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
        subs: 275000,
        cat: 'Underholdning',
      },
    ];

    const sampleShorts = [
      {
        title: 'Prøver Danmarks stærkeste slik! 🌶️ #shorts',
        duration: '0:42',
        durationSeconds: 42,
        views: 345000,
        likes: 21500,
        comments: 840,
        daysAgo: 1,
      },
      {
        title: 'Når man glemmer sine nøgler kl. 03 om natten 😂 #shorts',
        duration: '0:35',
        durationSeconds: 35,
        views: 298000,
        likes: 18900,
        comments: 620,
        daysAgo: 1,
      },
      {
        title: 'Hvem kender mig bedst i 30 sekunder? ⏳ #shorts',
        duration: '0:54',
        durationSeconds: 54,
        views: 245000,
        likes: 16200,
        comments: 510,
        daysAgo: 2,
      },
      {
        title: 'Det her gik fuldstændig galt foran kameraet! 😱 #shorts',
        duration: '0:28',
        durationSeconds: 28,
        views: 212000,
        likes: 14800,
        comments: 490,
        daysAgo: 2,
      },
      {
        title: 'Gæt lyden challenge! (Kun 5% kan) 🔊 #shorts',
        duration: '0:48',
        durationSeconds: 48,
        views: 189000,
        likes: 13100,
        comments: 380,
        daysAgo: 3,
      },
      {
        title: 'Vores hund reagerer på en kæmpe bamse 🐶 #shorts',
        duration: '0:39',
        durationSeconds: 39,
        views: 176000,
        likes: 15400,
        comments: 410,
        daysAgo: 4,
      },
      {
        title: 'Hemmeligt trick til at vinde i sten saks papir ✌️ #shorts',
        duration: '0:22',
        durationSeconds: 22,
        views: 164000,
        likes: 11200,
        comments: 290,
        daysAgo: 4,
      },
      {
        title: 'Spiser kun gul mad i 24 timer mini-vlog 💛 #shorts',
        duration: '0:58',
        durationSeconds: 58,
        views: 151000,
        likes: 10800,
        comments: 310,
        daysAgo: 5,
      },
      {
        title: 'Fik en helt ny bil i fødselsdagsgave?! 🎉 #shorts',
        duration: '0:45',
        durationSeconds: 45,
        views: 139000,
        likes: 9700,
        comments: 260,
        daysAgo: 5,
      },
      {
        title: 'Mika tabte væddemålet... Se straffen her 💀 #shorts',
        duration: '0:50',
        durationSeconds: 50,
        views: 128000,
        likes: 8900,
        comments: 240,
        daysAgo: 6,
      },
    ];

    const sampleLongs = [
      {
        title: 'Sidst der forlader boksen vinder 50.000 kr!',
        duration: '22:15',
        durationSeconds: 1335,
        views: 542000,
        likes: 32400,
        comments: 1980,
        daysAgo: 1,
      },
      {
        title: 'Vi overnattede i en forladt forlystelsespark!',
        duration: '28:40',
        durationSeconds: 1720,
        views: 489000,
        likes: 28700,
        comments: 1650,
        daysAgo: 2,
      },
      {
        title: 'Bygger Danmarks største burger med vennerne',
        duration: '18:32',
        durationSeconds: 1112,
        views: 412000,
        likes: 25100,
        comments: 1420,
        daysAgo: 2,
      },
      {
        title: '24 timer i en bunker under jorden!',
        duration: '24:50',
        durationSeconds: 1490,
        views: 378000,
        likes: 22900,
        comments: 1290,
        daysAgo: 3,
      },
      {
        title: 'Hvem kan lave den bedste ret med 100 kr?',
        duration: '19:14',
        durationSeconds: 1154,
        views: 329000,
        likes: 19400,
        comments: 1150,
        daysAgo: 4,
      },
      {
        title: 'Tester de mest virale TikTok gadgets!',
        duration: '16:08',
        durationSeconds: 968,
        views: 294000,
        likes: 17800,
        comments: 980,
        daysAgo: 4,
      },
      {
        title: 'Vi lejede en luksusvilla i 48 timer!',
        duration: '31:22',
        durationSeconds: 1882,
        views: 271000,
        likes: 16200,
        comments: 870,
        daysAgo: 5,
      },
      {
        title: 'Spiser kun det mine følgere stemmer på i 24T',
        duration: '20:45',
        durationSeconds: 1245,
        views: 253000,
        likes: 15300,
        comments: 790,
        daysAgo: 5,
      },
      {
        title: 'Minecraft Hardcore men verden er lavet af TNT!',
        duration: '25:10',
        durationSeconds: 1510,
        views: 238000,
        likes: 14100,
        comments: 710,
        daysAgo: 6,
      },
      {
        title: 'Rejste til hemmelig ø uden penge eller telefon!',
        duration: '34:18',
        durationSeconds: 2058,
        views: 219000,
        likes: 13400,
        comments: 690,
        daysAgo: 6,
      },
    ];

    const sampleShortThumbs = [
      'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    ];

    const sampleLongThumbs = [
      'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=640&q=80',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=640&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=640&q=80',
      'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?auto=format&fit=crop&w=640&q=80',
      'https://images.unsplash.com/photo-1579208575657-c595a053b977?auto=format&fit=crop&w=640&q=80',
    ];

    const mapCreator = (idx: number) => danishCreators[idx % danishCreators.length];

    const topShorts = sampleShorts.map((s, idx) => {
      const creator = mapCreator(idx);
      return {
        id: `fb-short-${idx + 1}`,
        title: s.title,
        views: s.views,
        likes: s.likes,
        comments: s.comments,
        duration: s.duration,
        durationSeconds: s.durationSeconds,
        isShort: true,
        publishedAt: new Date(Date.now() - s.daysAgo * 86400000).toISOString(),
        relativeDate: s.daysAgo === 1 ? 'For 1 dag siden' : `For ${s.daysAgo} dage siden`,
        thumbnail: sampleShortThumbs[idx % sampleShortThumbs.length],
        url: `https://www.youtube.com/shorts/sample_${idx + 1}`,
        channelId: creator.id,
        channelName: creator.name,
        channelAvatar: creator.avatar,
        subscribers: creator.subs,
        verified: true,
        category: creator.cat,
        rank: idx + 1,
      };
    });

    const topLongVideos = sampleLongs.map((l, idx) => {
      const creator = mapCreator(idx);
      return {
        id: `fb-long-${idx + 1}`,
        title: l.title,
        views: l.views,
        likes: l.likes,
        comments: l.comments,
        duration: l.duration,
        durationSeconds: l.durationSeconds,
        isShort: false,
        publishedAt: new Date(Date.now() - l.daysAgo * 86400000).toISOString(),
        relativeDate: l.daysAgo === 1 ? 'For 1 dag siden' : `For ${l.daysAgo} dage siden`,
        thumbnail: sampleLongThumbs[idx % sampleLongThumbs.length],
        url: `https://www.youtube.com/watch?v=sample_long_${idx + 1}`,
        channelId: creator.id,
        channelName: creator.name,
        channelAvatar: creator.avatar,
        subscribers: creator.subs,
        verified: true,
        category: creator.cat,
        rank: idx + 1,
      };
    });

    const allCombined = [...topShorts, ...topLongVideos].sort((a, b) => b.views - a.views);
    const topAllVideos = allCombined.slice(0, 10).map((v, i) => ({ ...v, rank: i + 1 }));

    return {
      topShorts,
      topLongVideos,
      topAllVideos,
      totalShortsFound: topShorts.length,
      totalLongVideosFound: topLongVideos.length,
      totalVideosFound: allCombined.length,
      channelsCount: danishCreators.length,
      isLiveApi: false,
      fetchedAt: new Date().toISOString(),
      scope: scopeParam,
      timeWindowLabel: 'Seneste 7 dage (publishedAfter)',
    };
  };

  if (!YOUTUBE_API_KEY) {
    const fallback = generateFallbackVideos();
    return res.json(fallback);
  }

  try {
    // 1. Fetch channel details & uploads playlists
    const channelsMap = new Map<string, any>();
    const uploadsPlaylists: { channelId: string; playlistId: string }[] = [];
    const chunkSize = 40;

    for (let i = 0; i < targetChannelIds.length; i += chunkSize) {
      const chunk = targetChannelIds.slice(i, i + chunkSize);
      const chanUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;
      const chanRes = await fetch(chanUrl);
      const chanData = await chanRes.json();
      if (chanData.items) {
        for (const item of chanData.items) {
          channelsMap.set(item.id, item);
          const uploadsId = item.contentDetails?.relatedPlaylists?.uploads;
          if (uploadsId) {
            uploadsPlaylists.push({ channelId: item.id, playlistId: uploadsId });
          }
        }
      }
    }

    if (uploadsPlaylists.length === 0) {
      const fallback = generateFallbackVideos();
      return res.json(fallback);
    }

    // 2. Concurrently fetch recent playlist items from each channel (up to 25 items per channel)
    // AND apply strict pre-filtering for publishedAt >= sevenDaysAgo
    const rawVideoItems: { channelId: string; item: any }[] = [];
    const allVideoIds = new Set<string>();

    await Promise.all(
      uploadsPlaylists.map(async ({ channelId, playlistId }) => {
        try {
          const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=25&key=${YOUTUBE_API_KEY}`;
          const plRes = await fetch(plUrl);
          const plData = await plRes.json();
          if (plData.items && plData.items.length > 0) {
            for (const it of plData.items) {
              const vId = it.contentDetails?.videoId;
              if (!vId) continue;
              const pubDateStr = it.snippet?.publishedAt || it.contentDetails?.videoPublishedAt;
              if (pubDateStr) {
                const pubDate = new Date(pubDateStr);
                // STRICT CHECK: Skip if older than 7 days
                if (!isNaN(pubDate.getTime()) && pubDate < sevenDaysAgo) {
                  continue;
                }
              }
              allVideoIds.add(vId);
              rawVideoItems.push({ channelId, item: it });
            }
          }
        } catch (plErr) {
          console.warn(`Fejl ved hentning af uploads for ${channelId}:`, plErr);
        }
      })
    );

    // 2b. If scope is 'all', query YouTube Search for viral Danish videos published within the last 7 days
    if (scopeParam === 'all') {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&publishedAfter=${encodeURIComponent(
          sevenDaysAgoIso
        )}&regionCode=DK&relevanceLanguage=da&order=viewCount&maxResults=25&key=${YOUTUBE_API_KEY}`;
        const sRes = await fetch(searchUrl);
        const sData = await sRes.json();
        if (sData.items && sData.items.length > 0) {
          for (const sItem of sData.items) {
            const vId = sItem.id?.videoId;
            const chId = sItem.snippet?.channelId;
            if (vId && chId) {
              allVideoIds.add(vId);
              rawVideoItems.push({ channelId: chId, item: sItem });
              if (!channelsMap.has(chId) && sItem.snippet?.channelTitle) {
                channelsMap.set(chId, {
                  id: chId,
                  snippet: {
                    title: sItem.snippet.channelTitle,
                    thumbnails: {
                      default: { url: sItem.snippet.thumbnails?.default?.url },
                      medium: { url: sItem.snippet.thumbnails?.medium?.url },
                      high: { url: sItem.snippet.thumbnails?.high?.url },
                    },
                  },
                  statistics: { subscriberCount: '150000' },
                });
              }
            }
          }
        }
      } catch (searchErr) {
        console.warn('Fejl ved søgning efter seneste 7 dages videoer:', searchErr);
      }
    }

    // 3. Batch fetch detailed video statistics (contentDetails, statistics, snippet)
    const videoStatsMap = new Map<string, any>();
    const videoIdList = Array.from(allVideoIds);
    for (let i = 0; i < videoIdList.length; i += 40) {
      const vChunk = videoIdList.slice(i, i + 40);
      const vidsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${vChunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;
      const vidsRes = await fetch(vidsUrl);
      const vidsData = await vidsRes.json();
      if (vidsData.items) {
        for (const v of vidsData.items) {
          videoStatsMap.set(v.id, v);
        }
      }
    }

    // 4. Construct complete ranked videos with STRICT 7-day publication enforcement
    const allParsedVideos: any[] = [];
    const seenVideoIds = new Set<string>();

    for (const { channelId, item: plItem } of rawVideoItems) {
      const vId = plItem.contentDetails?.videoId || plItem.id?.videoId;
      if (!vId || seenVideoIds.has(vId)) continue;
      seenVideoIds.add(vId);

      const vFull = videoStatsMap.get(vId);
      const chan = channelsMap.get(channelId);
      if (!vFull || !chan) continue;

      // Extract official publication timestamp
      const publishedAt = vFull.snippet?.publishedAt || plItem.snippet?.publishedAt;
      if (!publishedAt) continue;
      const pubDate = new Date(publishedAt);
      const diffMs = now.getTime() - pubDate.getTime();

      // STRICT 7-DAY REJECTION
      if (
        isNaN(pubDate.getTime()) ||
        pubDate < sevenDaysAgo ||
        diffMs < 0 ||
        diffMs > SEVEN_DAYS_MS
      ) {
        continue;
      }

      const title = plItem.snippet?.title || vFull.snippet?.title || 'Video';
      const description = plItem.snippet?.description || vFull.snippet?.description || '';
      const isoDuration = vFull.contentDetails?.duration;
      const durationSeconds = parseDurationToSeconds(isoDuration);
      const formattedDuration = formatDuration(isoDuration);

      // Classification rule: Short if duration <= 60 seconds OR title/desc includes #shorts
      const lowerText = `${title} ${description}`.toLowerCase();
      const hasShortsTag = lowerText.includes('#shorts') || lowerText.includes('#short');
      const isShort = (durationSeconds > 0 && durationSeconds <= 60) || hasShortsTag;

      const views = parseInt(vFull.statistics?.viewCount || '0', 10);
      const likes = parseInt(vFull.statistics?.likeCount || '0', 10);
      const comments = parseInt(vFull.statistics?.commentCount || '0', 10);

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let relativeDate = 'I dag';
      if (diffHours < 1) {
        relativeDate = 'Lige nu';
      } else if (diffHours < 24) {
        relativeDate = `For ${diffHours} timer siden`;
      } else if (diffDays === 1) {
        relativeDate = 'For 1 dag siden';
      } else {
        relativeDate = `For ${diffDays} dage siden`;
      }

      const thumbnail =
        vFull.snippet?.thumbnails?.maxres?.url ||
        vFull.snippet?.thumbnails?.standard?.url ||
        vFull.snippet?.thumbnails?.high?.url ||
        vFull.snippet?.thumbnails?.medium?.url ||
        plItem.snippet?.thumbnails?.medium?.url ||
        '';

      const subscribers = parseInt(chan.statistics?.subscriberCount || '0', 10);
      const channelName = chan.snippet?.title || 'Dansk YouTuber';
      const channelAvatar =
        chan.snippet?.thumbnails?.high?.url ||
        chan.snippet?.thumbnails?.medium?.url ||
        chan.snippet?.thumbnails?.default?.url ||
        '';

      allParsedVideos.push({
        id: vId,
        title,
        views,
        likes,
        comments,
        duration: formattedDuration,
        durationSeconds,
        isShort,
        publishedAt,
        relativeDate,
        thumbnail,
        url: isShort
          ? `https://www.youtube.com/shorts/${vId}`
          : `https://www.youtube.com/watch?v=${vId}`,
        channelId,
        channelName,
        channelAvatar,
        subscribers,
        verified: subscribers >= 100000,
      });
    }

    // Sort strictly descending by views
    const allSorted = [...allParsedVideos].sort((a, b) => b.views - a.views);

    // Segregate into the 3 rankings:
    // 1. Top 10 Shorts (<= 60s)
    const shortsList = allSorted.filter((v) => v.isShort);
    const topShorts = shortsList.slice(0, 10).map((v, i) => ({ ...v, rank: i + 1 }));

    // 2. Top 10 Videos (> 60s)
    const longsList = allSorted.filter((v) => !v.isShort);
    const topLongVideos = longsList.slice(0, 10).map((v, i) => ({ ...v, rank: i + 1 }));

    // 3. Top 10 All (mixed)
    const topAllVideos = allSorted.slice(0, 10).map((v, i) => ({ ...v, rank: i + 1 }));

    const responsePayload = {
      topShorts,
      topLongVideos,
      topAllVideos,
      totalShortsFound: shortsList.length,
      totalLongVideosFound: longsList.length,
      totalVideosFound: allSorted.length,
      channelsCount: channelsMap.size,
      isLiveApi: true,
      fetchedAt: new Date().toISOString(),
      scope: scopeParam,
      timeWindowLabel: 'Seneste 7 dage (publishedAfter)',
      publishedAfterCutoff: sevenDaysAgoIso,
    };

    topRecentVideosCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responsePayload,
    });

    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching top recent videos:', error);
    const fallback = generateFallbackVideos();
    return res.json(fallback);
  }
});

// Get specific channel details and recent videos in real-time
app.get('/api/youtube/channel/:channelId', async (req, res) => {
  const { channelId } = req.params;
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY mangler' });
  }

  try {
    // 1. Fetch channel details
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${encodeURIComponent(
      channelId
    )}&key=${YOUTUBE_API_KEY}`;
    const chanRes = await fetch(channelUrl);
    const chanData = await chanRes.json();

    if (!chanData.items || chanData.items.length === 0) {
      return res.status(404).json({ error: 'Kanal ikke fundet på YouTube' });
    }

    const channelItem = chanData.items[0];
    const transformed = transformChannelItem(channelItem);
    const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;

    // 2. If uploads playlist exists, fetch the 5 latest videos
    if (uploadsPlaylistId) {
      try {
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=6&key=${YOUTUBE_API_KEY}`;
        const plRes = await fetch(playlistUrl);
        const plData = await plRes.json();
        if (plData.items && plData.items.length > 0) {
          const videoIds = plData.items
            .map((it: any) => it.contentDetails?.videoId)
            .filter(Boolean);

          if (videoIds.length > 0) {
            const vidsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(
              ','
            )}&key=${YOUTUBE_API_KEY}`;
            const vidsRes = await fetch(vidsUrl);
            const vidsData = await vidsRes.json();
            const videoMap = new Map();
            if (vidsData.items) {
              for (const v of vidsData.items) {
                videoMap.set(v.id, v);
              }
            }

            transformed.recentVideos = plData.items
              .slice(0, 5)
              .map((it: any) => {
                const vidId = it.contentDetails?.videoId;
                const fullVid = videoMap.get(vidId);
                const views = parseInt(fullVid?.statistics?.viewCount || '0', 10);
                const likes = parseInt(fullVid?.statistics?.likeCount || '0', 10);
                const duration = formatDuration(fullVid?.contentDetails?.duration);
                const uploadDate = formatRelativeDate(it.snippet?.publishedAt);
                const thumbnailUrl =
                  fullVid?.snippet?.thumbnails?.maxres?.url ||
                  fullVid?.snippet?.thumbnails?.high?.url ||
                  fullVid?.snippet?.thumbnails?.medium?.url ||
                  it.snippet?.thumbnails?.high?.url ||
                  it.snippet?.thumbnails?.medium?.url ||
                  '';
                const url = `https://www.youtube.com/watch?v=${vidId}`;
                return {
                  id: vidId || it.id,
                  title: it.snippet?.title || 'Video',
                  views,
                  uploadDate,
                  likes,
                  duration,
                  thumbnailUrl,
                  url,
                };
              });

            const totalRecentViews = transformed.recentVideos.reduce(
              (acc: number, v: any) => acc + v.views,
              0
            );
            const totalRecentLikes = transformed.recentVideos.reduce(
              (acc: number, v: any) => acc + v.likes,
              0
            );
            if (totalRecentViews > 0) {
              const engRate = ((totalRecentLikes / totalRecentViews) * 100).toFixed(1);
              transformed.engagementRate = parseFloat(engRate) || transformed.engagementRate;
            }
          }
        }
      } catch (plErr) {
        console.warn('Could not fetch recent videos for uploads playlist:', plErr);
      }
    }

    return res.json(transformed);
  } catch (error: any) {
    console.error('Error fetching channel details:', error);
    return res.status(500).json({ error: error.message || 'Fejl ved hentning af kanal' });
  }
});

async function startServer() {
  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YouTube Tracker server kører på http://0.0.0.0:${PORT}`);
  });
}

startServer();
