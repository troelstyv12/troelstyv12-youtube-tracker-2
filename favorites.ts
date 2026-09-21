import { YouTuber } from '../types';

/**
 * Normalizes a channel ID or slug for flexible matching
 * handles hyphens vs underscores vs lowercase
 */
export function normalizeId(id: string): string {
  return (id || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/^@/, '');
}

/**
 * Checks if a YouTuber matches any ID in the favoriteIds list.
 * Matches by exact ID, normalized ID (hyphens/underscores),
 * handle (@name), channel name, or uploadsPlaylistId.
 */
export function isChannelInFavorites(channel: YouTuber, favoriteIds: string[]): boolean {
  if (!channel || !Array.isArray(favoriteIds) || favoriteIds.length === 0) {
    return false;
  }

  const channelIdNorm = normalizeId(channel.id);
  const handleNorm = channel.handle ? normalizeId(channel.handle) : '';
  const channelNameSlug = normalizeId(channel.channelName.replace(/\s+/g, '-'));

  return favoriteIds.some((fId) => {
    if (!fId) return false;
    const fIdNorm = normalizeId(fId);

    // 1. Exact or normalized ID match (e.g. alexander-husum === alexander_husum or UC...)
    if (fId === channel.id || fIdNorm === channelIdNorm) return true;

    // 2. Match with handle (e.g. @AlexanderHusum)
    if (handleNorm && (fIdNorm === handleNorm || fIdNorm === `@${handleNorm}`)) return true;

    // 3. Match with channel name slug (e.g. alexander-husum === Alexander Husum)
    if (channelNameSlug && fIdNorm === channelNameSlug) return true;

    // 4. Match with uploads playlist ID or channel ID if available
    if (channel.uploadsPlaylistId && fId === channel.uploadsPlaylistId) return true;

    return false;
  });
}

/**
 * Filters a list of YouTubers to only those that match favoriteIds
 */
export function getFavoriteYouTubers(youtubers: YouTuber[], favoriteIds: string[]): YouTuber[] {
  if (!Array.isArray(youtubers) || !Array.isArray(favoriteIds)) return [];
  return youtubers.filter((yt) => isChannelInFavorites(yt, favoriteIds));
}

/**
 * Toggles a channel in the favoriteIds list.
 * If already favorited, removes all matching IDs.
 * If not favorited, adds the channel.id (and canonical normalized ID).
 */
export function toggleFavoriteIdList(channel: YouTuber, currentFavoriteIds: string[]): string[] {
  const isFav = isChannelInFavorites(channel, currentFavoriteIds);

  if (isFav) {
    const channelIdNorm = normalizeId(channel.id);
    const handleNorm = channel.handle ? normalizeId(channel.handle) : '';
    const channelNameSlug = normalizeId(channel.channelName.replace(/\s+/g, '-'));

    // Remove any variant that matches this channel
    return currentFavoriteIds.filter((fId) => {
      const fIdNorm = normalizeId(fId);
      if (fId === channel.id || fIdNorm === channelIdNorm) return false;
      if (handleNorm && (fIdNorm === handleNorm || fIdNorm === `@${handleNorm}`)) return false;
      if (channelNameSlug && fIdNorm === channelNameSlug) return false;
      return true;
    });
  } else {
    // Add channel.id
    const newIds = [...currentFavoriteIds];
    if (!newIds.includes(channel.id)) {
      newIds.push(channel.id);
    }
    const normId = normalizeId(channel.id);
    if (normId !== channel.id && !newIds.includes(normId)) {
      newIds.push(normId);
    }
    return newIds;
  }
}
