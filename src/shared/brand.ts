export const GAME_NAME = "Island Squad";
export const POST_TAGLINE = 'defend your island, top the leaderboard';

export const titleLines = (name: string): string[] => {
  const words = name.trim().toUpperCase().split(/\s+/);
  if (words.length <= 2) return words;
  let best = 1;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

export const POST_TITLE = `${GAME_NAME} - ${POST_TAGLINE}`;
