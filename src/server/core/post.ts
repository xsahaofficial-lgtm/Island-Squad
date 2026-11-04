import { reddit } from '@devvit/web/server';
import { GAME_NAME, POST_TITLE } from '../../shared/brand.ts';


export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: POST_TITLE,
    entry: 'default',
    textFallback: {
      text:
        `${GAME_NAME} is a naval tower-defense game. Open this post in ` +
        'the Reddit app or on new Reddit to play: build turrets, survive endless ' +
        'enemy waves and climb the community leaderboard.',
    },
  });
};
