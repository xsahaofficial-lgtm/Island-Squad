import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post.ts';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/remove-player', (c) =>
  c.json<UiResponse>(
    {
      showForm: {
        name: 'removePlayerForm',
        form: {
          title: 'Remove player from leaderboards',
          description:
            'Removes this player from the all-time and daily leaderboards of this community. Use it for cheaters or inappropriate usernames.',
          acceptLabel: 'Remove',
          fields: [
            {
              type: 'string',
              name: 'username',
              label: 'Reddit username',
              helpText: 'With or without the u/ prefix',
              required: true,
            },
          ],
        },
      },
    },
    200
  )
);

menu.post('/reset-leaderboards', (c) =>
  c.json<UiResponse>(
    {
      showForm: {
        name: 'resetLeaderboardsForm',
        form: {
          title: 'Reset all leaderboards?',
          description:
            'This permanently deletes the all-time and daily leaderboards for this community. It cannot be undone.',
          acceptLabel: 'Reset',
          fields: [
            {
              type: 'boolean',
              name: 'confirm',
              label: 'Yes, delete every leaderboard score',
              defaultValue: false,
            },
          ],
        },
      },
    },
    200
  )
);
