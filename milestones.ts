import { SubscriberMilestone } from '../types';
import { formatCompact, formatNumberDK } from './formatters';

const ROUND_MILESTONES = [
  10000,
  25000,
  50000,
  100000, // Sølv Play Button
  150000,
  200000,
  250000, // Kvart million
  300000,
  400000,
  500000, // Halv million
  600000,
  750000,
  1000000, // Guld Play Button
  1500000,
  2000000,
  2500000,
  5000000,
  10000000, // Diamond Play Button
];

export function getMilestoneInfo(milestone: number): {
  badge: string;
  title: string;
  iconType: 'silver' | 'gold' | 'diamond' | 'special';
} {
  if (milestone === 100000) {
    return {
      badge: 'Sølv Play Button',
      title: '100.000 abonnenter (Officiel Sølv Play Button)',
      iconType: 'silver',
    };
  }
  if (milestone === 250000) {
    return {
      badge: 'Kvart-Million',
      title: '250.000 abonnenter (250K milepæl)',
      iconType: 'special',
    };
  }
  if (milestone === 500000) {
    return {
      badge: 'Halv-Million',
      title: '500.000 abonnenter (500K milepæl)',
      iconType: 'special',
    };
  }
  if (milestone === 1000000) {
    return {
      badge: 'Guld Play Button',
      title: '1.000.000 abonnenter (Officiel Guld Play Button)',
      iconType: 'gold',
    };
  }
  if (milestone >= 10000000) {
    return {
      badge: 'Diamond Play Button',
      title: `${formatCompact(milestone)} abonnenter (Diamond Creator Award)`,
      iconType: 'diamond',
    };
  }
  return {
    badge: `${formatCompact(milestone)} Subs`,
    title: `${formatNumberDK(milestone)} abonnenter`,
    iconType: 'special',
  };
}

/**
 * Calculates detailed milestone progression and arrival ETA for any subscriber count.
 */
export function calculateSubscriberMilestone(
  subscribers: number,
  monthlySubGain?: number,
  growthPct?: number
): SubscriberMilestone {
  const currentSubs = Math.max(0, subscribers);

  // Find next milestone
  let nextMilestone = ROUND_MILESTONES.find((m) => m > currentSubs);
  if (!nextMilestone) {
    const step = 1000000;
    nextMilestone = (Math.floor(currentSubs / step) + 1) * step;
  }

  // Find previous milestone
  const prevCandidates = ROUND_MILESTONES.filter((m) => m <= currentSubs);
  const prevMilestone = prevCandidates.length > 0 ? prevCandidates[prevCandidates.length - 1] : 0;

  const remainingSubs = Math.max(0, nextMilestone - currentSubs);

  // Bracket progress % (from prevMilestone to nextMilestone)
  const bracketSpan = nextMilestone - prevMilestone;
  const bracketProgress =
    bracketSpan > 0 ? ((currentSubs - prevMilestone) / bracketSpan) * 100 : 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(bracketProgress * 10) / 10));

  // Overall progress towards target %
  const totalProgressPercent = Math.min(
    100,
    Math.round((currentSubs / nextMilestone) * 1000) / 10
  );

  // Effective monthly gain estimation
  let gain = monthlySubGain;
  if (gain === undefined || gain === 0) {
    if (growthPct && growthPct > 0) {
      gain = Math.round(currentSubs * (growthPct / 100));
    } else {
      gain = Math.round(Math.max(50, currentSubs * 0.015));
    }
  }

  let estimatedDays: number | null = null;
  let estimatedTimeText = 'Vedligeholder niveau';

  if (gain > 0 && remainingSubs > 0) {
    const monthsNeeded = remainingSubs / gain;
    const daysNeeded = Math.round(monthsNeeded * 30.4);
    estimatedDays = daysNeeded;

    if (daysNeeded <= 35) {
      estimatedTimeText = `~${daysNeeded} dage ved nuværende vækst`;
    } else if (monthsNeeded < 12) {
      const roundedMdr = (Math.round(monthsNeeded * 10) / 10).toFixed(1).replace('.', ',');
      estimatedTimeText = `~${roundedMdr} måneder ved nuværende vækst`;
    } else {
      const yearsNeeded = (Math.round((monthsNeeded / 12) * 10) / 10).toFixed(1).replace('.', ',');
      estimatedTimeText = `~${yearsNeeded} år ved nuværende vækst`;
    }
  } else if (remainingSubs === 0) {
    estimatedTimeText = 'Milepælen er nået!';
  }

  const info = getMilestoneInfo(nextMilestone);

  return {
    currentSubs,
    nextMilestone,
    prevMilestone,
    remainingSubs,
    progressPercent,
    totalProgressPercent,
    title: info.title,
    badge: info.badge,
    iconType: info.iconType,
    estimatedDays,
    estimatedTimeText,
    isClose: progressPercent >= 80,
  };
}
