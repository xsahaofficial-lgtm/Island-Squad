import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import { removePlayer, resetBoards } from '../core/leaderboard.ts';

type RemovePlayerValues = { username?: string };
type ResetValues = { confirm?: boolean };

export const forms = new Hono();

forms.post('/remove-player-submit', async (c) => {
  const { username } = await c.req.json<RemovePlayerValues>();
  const name = typeof username === 'string' ? username.trim() : '';
  if (!name) {
    return c.json<UiResponse>({ showToast: 'Please enter a username' }, 200);
  }
  const found = await removePlayer(redis, name, Date.now());
  return c.json<UiResponse>(
    {
      showToast: found
        ? { text: `Removed ${name} from the leaderboards`, appearance: 'success' }
        : `${name} was not found on any leaderboard`,
    },
    200
  );
});

forms.post('/reset-leaderboards-submit', async (c) => {
  const { confirm } = await c.req.json<ResetValues>();
  if (confirm !== true) {
    return c.json<UiResponse>(
      { showToast: 'Nothing was reset - the confirmation box was not ticked' },
      200
    );
  }
  await resetBoards(redis, Date.now());
  return c.json<UiResponse>(
    { showToast: { text: 'All leaderboards were reset', appearance: 'success' } },
    200
  );
});
