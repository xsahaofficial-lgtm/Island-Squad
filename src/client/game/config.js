import { SHIP_SCORE } from '../../shared/rules.ts';

export const GAMECFG = {
  shop: { enabled: true },
  world: {
    islandVariations: 4,      
  },
  weapons: {
    
    
    cannon:  { arc: 135, range: 185 },
    missile: { arc: 150, range: 235 },
    laser:   { arc: 80,  range: 205 },
    aa:      { arc: 300, range: 215 },
    tesla:   { arc: 360, range: 170 },
    mine:    { arc: 360, range: 60  },
  },
  waves: {
    firstWaveDelayMs: 5000,   
    readyUrgentMs: 10000,      
    readyForceStartMs: 20000, 
    enemyHpMul: 1.0,          
    enemyDmgMul: 1.0,         
    enemySpeedMul: 1.0,       
    enemyCountMul: 1.0,       
    waveBonusBase: 40,        
    waveBonusPerWave: 12,     
  },
  allies: {
    turretHpMul: 1.0,         
    turretDmgMul: 1.0,        
    turretFireRateMul: 1.0,   
    baseHpMul: 1.0,           
    navyHpMul: 1.0,           
    navyDmgMul: 1.0,          
    minEnemyDistance: 86,     
  },
  economy: {
    startGold: 240,           
    startRockets: 24,         
    coinMul: 1.1,
    mineCooldownMs: 6000,
    aimCost: 20,
    coinDoublerDurationMs: 60000, 
    doubler: { waves: [4, 10, 15, 20] },
  },
};

export const COL = {
  oceanDeep:0x2B82C9, ocean:0x5AD8D4, oceanLite:0xC6EFEF,
  sand:0xe8d9a8, sandDk:0xd8c489, island:0x46b873, islandDk:0x2f8453, islandDk2:0x256b43, palm:0x2c7a48, trunk:0x8a5a3c,
  rock:0x6a7886, rockDk:0x49555f,
  stone:0xc9cfd6, stoneDk:0x8f99a3, stoneSh:0x6c757e, keep:0xb0b8c0, roof:0x2f6f8f, roofLite:0x34d6e8,
  ship:0x9aa7b3, shipDk:0x6c7884, deck:0x7c8794,
  enemy:0xe2574c, enemyDk:0xb23a32, enemyLite:0xf0ded9, enemyDeck:0x9c4640,
  base:0xcfd8e0, white:0xffffff, cyan:0x34d6e8, cyanDk:0x1f9fb0,
  gold:0xf4c542, gem:0x7be0ff, rocket:0xffa84d, rocketDk:0xd97b1f, marine:0x3a4a5a, marineHat:0x2f6f8f,
  panel:0x12304d, panelLite:0x1d456e, panelEdge:0x09203a,
  text:0xeef6ff, textDim:0x9fbdd8, green:0x49c96d, goodArc:0x34d6e8, blindArc:0xe2574c,
  red:0xe2574c, shadow:0x05111d
};
export const CSS = (h)=>'#'+h.toString(16).padStart(6,'0');
export const D2R = Math.PI/180;

export const TURRET_TYPES = {
  cannon:  { key:'cannon',  name:'Cannon',  cost:60,  unlock:0, accent:0xffd23f, arc:GAMECFG.weapons.cannon.arc, hp:150, damage:14, range:GAMECFG.weapons.cannon.range, fireRate:520, projSpeed:540, splash:0,  proj:'shell',  desc:'Fast, wide arc' },
  missile: { key:'missile', name:'Missile', cost:120, unlock:0, accent:0x2ebd59, arc:GAMECFG.weapons.missile.arc, hp:120, damage:48, range:GAMECFG.weapons.missile.range, fireRate:1500,projSpeed:300, splash:48, proj:'missile', desc:'Tracking homing missile' },
  laser:   { key:'laser',   name:'Laser',   cost:150, unlock:3, accent:0x33a8ff, arc:GAMECFG.weapons.laser.arc,  hp:100, damage:16, range:GAMECFG.weapons.laser.range, fireRate:120, projSpeed:0,   splash:0,  proj:'beam',   desc:'Beam, narrow arc' },
  aa:      { key:'aa',      name:'AA Turret',cost:150, unlock:5, accent:0xc6912f,arc:GAMECFG.weapons.aa.arc, hp:120, damage:20, range:GAMECFG.weapons.aa.range, fireRate:300, projSpeed:660, splash:0,  proj:'flak',   desc:'Air first, wide' },
  tesla:   { key:'tesla',   name:'Tesla',   cost:200, unlock:4, accent:0x8f6bff, arc:GAMECFG.weapons.tesla.arc, hp:220, damage:24, range:GAMECFG.weapons.tesla.range, fireRate:650, projSpeed:0, splash:0, proj:'arc', multi:3, desc:'Zaps several foes at once' },
  mine:    { key:'mine',    name:'Mine',    cost:40,  unlock:0, accent:COL.red, isMine:true, arc:GAMECFG.weapons.mine.arc, range:GAMECFG.weapons.mine.range, damage:150, splash:96, blast:96, proj:'mine', desc:'Hidden blast trap' }
};
export const TURRET_ORDER = ['cannon','missile','laser','aa','tesla','mine'];

export const SHIP_TYPES = {
  gunboat:   { key:'gunboat',   name:'Gunboat',        hp:22,  speed:84, dmg:4,  fireRate:700,  range:100, gold:10,  size:9,  len:2.4, col:0xf2918a, colDk:0xc7564d, deck:0xd06a61, score:SHIP_SCORE.gunboat },
  scout:     { key:'scout',     name:'Scout',          hp:36,  speed:66, dmg:6,  fireRate:900,  range:120, gold:10,  size:11, len:2.6, col:0xe2574c, colDk:0xb23a32, deck:0x9c4640, score:SHIP_SCORE.scout },
  destroyer: { key:'destroyer', name:'Destroyer',      hp:100, speed:44, dmg:14, fireRate:1150, range:150, gold:30, size:16, len:3.0, col:0xe0704c, colDk:0xab4326, deck:0x9c5340, score:SHIP_SCORE.destroyer },
  cruiser:   { key:'cruiser',   name:'Missile Cruiser',hp:140, speed:34, dmg:22, fireRate:2000, range:265, gold:50, size:19, len:3.2, col:0xd86a86, colDk:0xa83f5c, deck:0x9c5360, score:SHIP_SCORE.cruiser },
  battleship:{ key:'battleship',name:'Battleship',     hp:300, speed:22, dmg:38, fireRate:1650, range:175, gold:80, size:20, len:3.4, col:0xc94e44, colDk:0x8f2f28, deck:0x7e3a34, score:SHIP_SCORE.battleship },
  carrier:   { key:'carrier',   name:'Carrier',        hp:440, speed:16, dmg:18, fireRate:2200, range:150, gold:110, size:23, len:3.3, col:0xb5635a, colDk:0x84413a, deck:0x6f4e48, score:SHIP_SCORE.carrier }
};

export const ABILITIES = {
  shield:   { key:'shield',   name:'Shield',   cd:18000, charges:2, icon:'shield', desc:'Shields the castle for a while.' },
  repair:   { key:'repair',   name:'Repair',   cd:22000, charges:1, icon:'repair', desc:'Repairs your castle.' },
  airstrike:{ key:'airstrike',name:'Airstrike',cd:30000, charges:1, icon:'airstrike', desc:'Call bombers down on the enemy fleet.' },
  navy:     { key:'navy',     name:'Frigate',  cd:4000,  charges:1, icon:'navy', gold:260, desc:'Deploy an allied frigate that fights for you.' }
};

export const DOUBLER = { key: 'doubler', name: '2X Gold', icon: 'gold', desc: 'Doubles the coins you earn during the next wave.' };
export const REVIVE = { key: 'revive', name: 'Continue', icon: 'heart', desc: 'Rebuild your castle to half health with a shield, and fight on.' };
