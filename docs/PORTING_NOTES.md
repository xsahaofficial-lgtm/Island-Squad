# What changed from the original game

The original was one HTML file with Phaser 3 loaded from a CDN and CrazyGames hooks. This version is a Vite project in the layout Reddit's template uses. The game rules, art and balance are the same except where this list says otherwise. The game code lives in `src/client/game/`, split into a few plain JavaScript modules.

## Platform

- CrazyGames calls are gone. The high score is saved on the server, not in localStorage.
- Phaser is pinned to 3.90 from npm. The code reads WebGL texture internals that Phaser 4 changed.
- The free "1.5X score" button on the game over screen is gone. There are no ads on Reddit, and it let anyone inflate a score.
- Fonts are bundled, images are WebP (about 1 MB instead of 7 MB), and the fullscreen request is removed.
- Scores go through a one-time token and a server check (time spent, most kills and points the waves allow, score against kills). That stops forged requests and replays, but a modified client playing a real game could still post a believable inflated score. The remove-player tool is there for that.
- The sound effects were already generated in code. The missing background music is now generated in code as well (a short A minor loop). It isn't a recording and isn't taken from any song.

## Screens

- The title screen shows the live game behind it, with a short how to play card. It switches between side by side and stacked layouts and scales to fit.
- Game over is a new card with the score counting up, stat chips and rank pills.
- The game always plays in landscape. A portrait window rotates the game. On near-square windows the play area keeps at least an 864 by 576 view and the extra height is sea, with the buttons moved to the real screen edges.
- Overlays for pause, game over and the shop cover the whole window.

## Gameplay

- Mines refill in 6 seconds (was 12). Kills give 1.1x coins. You get 20 seconds between waves before the next one starts by itself (was 10). The Frigate costs 260 (was 320). You start with 240 coins.
- Turrets can sit 34 px apart (was 46). If you tap a spot that doesn't work, the turret goes on the nearest one that does. On touch the preview floats above your finger.
- A weapon you're placing is dropped when a wave ends and whenever you open or confirm an upgrade, and tapping a built turret while placing selects it instead.
- The upgrade popup has a corner X instead of a Cancel button.
- Turning a placed turret costs 20 coins for a session (AIM, rotate, DONE). There's no aim control while placing a new one, and Q, E and the wheel only work during a session.
- The Target panel has three buttons now (First, Strong, Close) and shows the active mode.
- Power-ups no longer refill. Shield has 2 uses per game and the others 1. 2X Gold is offered only after waves 4, 10, 15 and 20 and the first use is free.
- When the castle falls the player can continue once per game. Logged-out players skip the offer.
- The pause menu text and the wave timer no longer use odd characters, and the help text matches the real controls.

## Shop

See `docs/PAYMENTS.md`.
