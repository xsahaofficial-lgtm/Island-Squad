import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import { Platform } from './platform.ts';
import { startGame } from './game/main.js';

const loadFonts = async (): Promise<void> => {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('500 16px "Space Grotesk"'),
        document.fonts.load('700 16px "Space Grotesk"'),
      ]),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (error) {
    console.warn('Fonts did not load, using the fallback font', error);
  }
};

const showFatal = (message: string): void => {
  const el = document.getElementById('loading');
  if (el) {
    el.style.display = 'flex';
    el.textContent = message;
  }
};

const boot = async (): Promise<void> => {
  try {
    await Promise.all([Platform.load(), loadFonts()]);
    startGame('game');
  } catch (error) {
    console.error('Game failed to start', error);
    showFatal('The game could not start. Please reload the post.');
  }
};

void boot();
