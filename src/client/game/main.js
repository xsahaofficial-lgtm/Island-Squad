import Phaser from 'phaser';
import { GameScene } from './GameScene.js';

export function startGame(parent) {
  const _DPR = window.devicePixelRatio || 1;
  const _need = Math.max((window.innerWidth * _DPR) / 1024, (window.innerHeight * _DPR) / 576);
  const _touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const _SS = Math.max(1, Math.min(_touch ? 2 : 3, _need || 1));
  const _GW = Math.round(1024 * _SS), _GH = Math.round(_GW * 9 / 16);
  return new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#06121f',
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, width: _GW, height: _GH },
    render: { antialias: true, antialiasGL: true, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60, min: 30 },
    scene: [GameScene],
  });
}
