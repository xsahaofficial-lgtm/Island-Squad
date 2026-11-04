import '@fontsource/space-grotesk/latin-700.css';
import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse, LeaderboardResponse } from '../shared/api.ts';

const play = document.getElementById('play') as HTMLButtonElement;
const who = document.getElementById('who') as HTMLParagraphElement;
const top = document.getElementById('top') as HTMLOListElement;

play.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

const getJson = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

const render = (init: InitResponse | null, board: LeaderboardResponse | null): void => {
  if (init?.loggedIn) {
    who.textContent = init.best > 0
      ? `u/${init.username} \u00b7 Best ${init.best.toLocaleString()}`
      : `Welcome, u/${init.username}`;
  } else if (init) {
    who.textContent = 'Log in to save your scores';
  }
  top.replaceChildren();
  for (const entry of board?.entries ?? []) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `${entry.rank}. ${entry.username}`;
    const score = document.createElement('b');
    score.textContent = entry.score.toLocaleString();
    li.append(name, score);
    top.append(li);
  }
};

const start = async (): Promise<void> => {
  const [init, board] = await Promise.all([
    getJson<InitResponse>('/api/init'),
    getJson<LeaderboardResponse>('/api/leaderboard?period=daily&limit=3'),
  ]);
  render(init, board);
};

void start();
