
export type Period = 'daily' | 'all';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  subreddit: string;
  username: string | null;
  loggedIn: boolean;
  userId: string | null;
  extras: Record<string, number>;
  bankedCoins: number;
  best: number;
  gamesPlayed: number;
  rank: number | null;
  day: string;
};

export type RunStartResponse = {
  type: 'run-start';
  runId: string | null;
  reason?: 'logged-out' | 'rate-limited';
};

export type SubmitRequest = {
  runId: string;
  score: number;
  wave: number;
  kills: number;
};

export type SubmitRejection =
  | 'logged-out'
  | 'invalid-run'
  | 'expired-run'
  | 'rate-limited'
  | 'implausible';

export type SubmitResponse = {
  type: 'run-submit';
  saved: boolean;
  reason?: SubmitRejection;
  isNewBest: boolean;
  best: number;
  rank: number | null;
  dailyRank: number | null;
  dailyBest: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  period: Period;
  day: string;
  entries: LeaderboardEntry[];
  total: number;
  me: { username: string | null; rank: number | null; score: number | null };
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type InventoryResponse = {
  type: 'inventory';
  extras: Record<string, number>;
  bankedCoins: number;
};

export type UseExtraResponse = {
  type: 'use-extra';
  ok: boolean;
  remaining: number;
};

export type ClaimCoinsResponse = {
  type: 'claim-coins';
  coins: number;
};
