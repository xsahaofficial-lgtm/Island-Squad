import { defineConfig, type Plugin } from 'vite';
import { devvit } from '@devvit/start/vite';
import { GAME_NAME, titleLines } from './src/shared/brand.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const gameName = (): Plugin => ({
  name: 'game-name',
  transformIndexHtml: (html) =>
    html
      .replaceAll('{{GAME_NAME_UPPER}}', esc(GAME_NAME.toUpperCase()))
      .replaceAll('{{GAME_NAME}}', esc(GAME_NAME))
      .replaceAll('{{TITLE_HTML}}', titleLines(GAME_NAME).map(esc).join('<br />')),
});

export default defineConfig({
  plugins: [
    gameName(),
    devvit({
      client: {
        build: {
          chunkSizeWarningLimit: 2000,
          sourcemap: false,
        },
      },
    }),
  ],
});
