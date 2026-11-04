import Phaser from 'phaser';
import { Platform } from '../platform.ts';
import { SFX } from './sfx.js';
import { GAMECFG, COL, CSS, D2R, TURRET_TYPES, SHIP_TYPES, ABILITIES } from './config.js';
import { SpatialGrid, Base, Turret, Ship, Projectile, FX, WaveManager, UIManager, Mine, Friendly } from './entities.js';
import { openLeaderboard } from './leaderboardUi.js';
import { buildStartScreen } from './startScreen.js';
import { buildGameOver } from './gameOverScreen.js';
import { runCap } from '../../shared/products.ts';
import { sparkBurst } from './juice.js';
import { openPurchase } from './purchaseDialog.js';

export class GameScene extends Phaser.Scene {
  constructor(){ super('game'); }
  init(data){ this._skipIntro=!!(data&&data.skipIntro); this._started=false; }
  preload(){
    const KEYS=['ship_gunboat','ship_scout','ship_destroyer','ship_cruiser','ship_battleship','ship_carrier','ship_friendly','base_castle','island','island2','island3','island4','sea','turret_cannon','turret_missile','turret_laser','turret_aa','turret_tesla','mine','plane','icon_cannon','icon_missile','icon_laser','icon_aa','icon_tesla','icon_mine','icon_shield','icon_repair','icon_airstrike','icon_navy','icon_gold','icon_rocket','icon_heart','trophy','badge','tgt_first','tgt_strong','tgt_close'];
    this._loadErrors=[]; this.load.on('loaderror',(f)=>{ if(f&&f.key) this._loadErrors.push(f.key); });
    this._assetKeys=KEYS; this.load.setPath('../assets'); KEYS.forEach(k=>this.load.image(k,k+'.webp')); 

    { const _tot=KEYS.length; let _dn=0; const _lu=()=>{ try{ const el=document.getElementById('loading'); if(el){ const sb=el.querySelector('.ld-sub'); if(sb) sb.textContent='LOADING ASSETS '+_dn+' / '+_tot; } }catch(e){} }; this.load.on('filecomplete',()=>{ _dn++; _lu(); }); this.load.on('loaderror',()=>{ _dn++; _lu(); }); _lu(); }
    this.load.on('complete',()=>{ const _r=this.renderer,_gl=_r&&_r.gl; KEYS.forEach(k=>{ if(!this.textures.exists(k)) return; try{ const tex=this.textures.get(k); tex.setFilter(Phaser.Textures.FilterMode.LINEAR); if(_gl){ const src=tex.source[0]; const wrap=src&&src.glTexture; const raw=wrap&&(wrap.webGLTexture||wrap); if(raw){ _gl.activeTexture(_gl.TEXTURE0); _gl.bindTexture(_gl.TEXTURE_2D,raw); const _sw=(src&&src.width)||0,_sh=(src&&src.height)||0; const _pot=(n)=>n>0&&((n&(n-1))===0); const _isGL2=(typeof WebGL2RenderingContext!=='undefined')&&(_gl instanceof WebGL2RenderingContext); if(_isGL2||(_pot(_sw)&&_pot(_sh))){ _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_MIN_FILTER,_gl.LINEAR_MIPMAP_LINEAR); _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_MAG_FILTER,_gl.LINEAR); try{ _gl.generateMipmap(_gl.TEXTURE_2D); const _af=_gl.getExtension('EXT_texture_filter_anisotropic')||_gl.getExtension('MOZ_EXT_texture_filter_anisotropic')||_gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'); if(_af){ _gl.texParameterf(_gl.TEXTURE_2D,_af.TEXTURE_MAX_ANISOTROPY_EXT,_gl.getParameter(_af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)); } }catch(e){ _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_MIN_FILTER,_gl.LINEAR); } } else { _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_MIN_FILTER,_gl.LINEAR); _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_MAG_FILTER,_gl.LINEAR); _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_WRAP_S,_gl.CLAMP_TO_EDGE); _gl.texParameteri(_gl.TEXTURE_2D,_gl.TEXTURE_WRAP_T,_gl.CLAMP_TO_EDGE); } } } }catch(e){} }); });
  }
  _applyOrientation(){ try{ const sw=this.scale, cam=this.cameras&&this.cameras.main; if(!sw||!cam) return; const Wd=1024, Hd=576; const W=(typeof window!=='undefined'&&window.innerWidth)||1024, H=(typeof window!=='undefined'&&window.innerHeight)||576; const touch=(typeof window!=='undefined')&&(('ontouchstart'in window)||(window.navigator&&navigator.maxTouchPoints>0)); const rotate=H>W; const ss=Math.max(1,Math.min(2.5,(typeof window!=='undefined'&&window.devicePixelRatio)||1)); const cw=Math.max(1,Math.round(W*ss)), ch=Math.max(1,Math.round(H*ss)); if(typeof sw.resize==='function'&&(sw.width!==cw||sw.height!==ch)) sw.resize(cw,ch); try{ const cv=this.game&&this.game.canvas; if(cv&&cv.style){ cv.style.width='100vw'; cv.style.height='100vh'; cv.style.display='block'; cv.style.margin='0'; } }catch(e){} if(typeof cam.setSize==='function') cam.setSize(cw,ch); const screenLong=rotate?ch:cw, screenShort=rotate?cw:ch; const NEAR_SQUARE=1.5, PLAY_MIN_W=Hd*NEAR_SQUARE; const nearSquare=(screenLong/screenShort)<NEAR_SQUARE; const zoom=nearSquare?screenLong/PLAY_MIN_W:Math.max(screenLong/Wd, screenShort/Hd); if(typeof cam.setRotation==='function') cam.setRotation(rotate?Math.PI/2:0); if(typeof cam.setZoom==='function') cam.setZoom(zoom); try{ if(typeof cam.setBackgroundColor==='function') cam.setBackgroundColor(COL.oceanDeep); }catch(e){} if(typeof cam.centerOn==='function') cam.centerOn(Wd/2,Hd/2); const visW=screenLong/zoom, visH=screenShort/zoom; const nIX=Math.max(0,(Wd-visW)/2), nIY=(nearSquare?(Hd-visH)/2:Math.max(0,(Hd-visH)/2))+2; this.uiInsetX=nIX; this.uiInsetY=nIY; if(this._startRelayout) this._startRelayout(); if(this._gameOverRelayout) this._gameOverRelayout(); if(this._purchaseRelayout) this._purchaseRelayout(); if(this.ui&&this.ui.relayout&&(Math.abs((this._uiIX==null?-99:this._uiIX)-nIX)>1.5||Math.abs((this._uiIY==null?-99:this._uiIY)-nIY)>1.5)){ this._uiIX=nIX; this._uiIY=nIY; this.ui.relayout(); }

    try{ if(typeof sw.refresh==='function') sw.refresh(); }catch(e){}
    try{ const _raf=(typeof window!=='undefined')&&window.requestAnimationFrame; if(_raf){ window.requestAnimationFrame(()=>{ try{ if(this.scale&&typeof this.scale.refresh==='function') this.scale.refresh(); }catch(e){} }); } else if(this.time){ this.time.delayedCall(40,()=>{ try{ if(this.scale&&typeof this.scale.refresh==='function') this.scale.refresh(); }catch(e){} }); } }catch(e){}
  }catch(e){} }
  create(){
    const el=document.getElementById('loading'); if(el) el.style.display='none';
    this.worldW=1024; this.worldH=576; this._applyOrientation(); { const _oh=()=>this._applyOrientation(); if(!this._orientBound&&typeof window!=='undefined'&&window.addEventListener){ this._orientBound=true; window.addEventListener('resize',_oh); window.addEventListener('orientationchange',()=>setTimeout(_oh,120)); } } try{ if(this.scale&&this.scale.on){ this.scale.on('enterfullscreen',()=>{ if(this.time){ this.time.delayedCall(60,()=>this._applyOrientation()); this.time.delayedCall(380,()=>this._applyOrientation()); } }); this.scale.on('leavefullscreen',()=>{ if(this.time){ this.time.delayedCall(60,()=>this._applyOrientation()); this.time.delayedCall(380,()=>this._applyOrientation()); } }); } }catch(e){}
    const _missing=(this._assetKeys||[]).filter(k=>!this.textures.exists(k) && k!=='sea');
    if(false){ this._assetsMissing=true; this.cameras.main.setBackgroundColor('#06121f'); this.add.text(this.worldW/2,this.worldH/2-28,'\u26a0  Image assets not found',{fontFamily:'Arial',fontSize:'30px',fontStyle:'bold',color:'#ff8a7a'}).setOrigin(0.5); this.add.text(this.worldW/2,this.worldH/2+26,'Put all PNGs in /assets/ and run over a local server.\n('+_missing.length+' file(s) missing or failed to load)',{fontFamily:'Arial',fontSize:'16px',color:'#cfe2f5',align:'center'}).setOrigin(0.5); return; }

    SFX.phaserSound = this.sound;

    this.isTouch=this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
    this.gold=GAMECFG.economy.startGold; this.gems=0; this.gameSpeed=1; this.paused=false; this._prevPaused=false;
    this.score=0; this.kills=0; this.highScore=Platform.bestScore; this._purchaseOpen=false; this.aimActive=false; this.puBought={shield:0,repair:0,airstrike:0,navy:0,doubler:0,revive:0}; this.packsBought=0; this.doublerFreeUsed=false; this.reviveUsed=false; this._gameOverRelayout=null; this._purchaseRelayout=null; this._doublerOfferWave=-1; this._doublerWhy=null;
    this.targetMode='closest'; this.buildType=null; this.buildRot=0; this.selectedTurret=null; this.rotateMode=false; this.armedUpgrade=null; this.mineReadyAt=0;
    this.enemies=[]; this.turrets=[]; this.mines=[]; this.friendlies=[]; this.gameIsOver=false; this._lastShootSnd=0; this._ptr=null;
    this.fx=new FX(this);
    this._buildOcean(); this._generateWorld();
    this.base=new Base(this,this.worldW/2,this.worldH/2);
    this.obstacles=this.islands.concat(this.rocks);
    this.shipGrid=new SpatialGrid(this.worldW,this.worldH,80);
    this.shipPool=[]; this.projPool=[]; this.activeProj=[];
    for(let i=0;i<240;i++) this.shipPool.push(new Ship(this));
    for(let i=0;i<360;i++) this.projPool.push(new Projectile(this));
    this.wave=new WaveManager(this); this.ui=new UIManager(this);
    this.preview=this.add.graphics().setDepth(50).setVisible(false);
    this._setupInput(); this.paused=true; if(this._skipIntro) this._beginPlay(); else this._startScreen();
  }
  _startScreen(){ buildStartScreen(this); }
  _beginPlay(){ if(this._started) return; this._started=true; SFX.ui();
    if(this._startBubbleT){ this._startBubbleT.remove(); this._startBubbleT=null; }
    if(this._startC){ const sc=this._startC; this.tweens.add({targets:sc,alpha:0,duration:340,ease:'Sine.easeIn',onComplete:()=>{ if(sc&&sc.destroy) sc.destroy(); }}); this._startC=null; }
    Platform.claimCoins().then(n=>{ if(n>0&&this.sys&&this.sys.isActive()){ this.addGold(n,true); this.ui.announce('+'+n+' coins from your purchase',COL.gold); } }); this.paused=false; this.wave.start(); Platform.runStarted(); SFX.playBg();
    this._tryFullscreen();
    [120,420,820].forEach(d=>{ if(this.time) this.time.delayedCall(d,()=>{ try{ this._applyOrientation(); }catch(e){} }); });
  }
  _isTouchDevice(){ return (typeof window!=='undefined') && (('ontouchstart' in window) || (window.navigator && navigator.maxTouchPoints>0)); }
  _tryFullscreen(){ }
  _buildOcean(){ const W=this.worldW,H=this.worldH; if(this.textures.exists('sea')){ const _ss=this.textures.get('sea').getSourceImage(); const _glm=(this.renderer&&this.renderer.gl); const _max=_glm?this.renderer.gl.getParameter(this.renderer.gl.MAX_TEXTURE_SIZE):4096; if(_ss && _ss.width>0 && _ss.height>0 && _ss.width<=_max && _ss.height<=_max){ const M=this.oceanM=360; const sea=this.add.image(W/2,H/2,'sea').setDepth(0); sea.setDisplaySize(W+2*M,H+2*M); this.waterFx=this.add.graphics().setDepth(1); this.ripples=[]; for(let i=0;i<90;i++) this.ripples.push({x:Math.random()*(W+2*M)-M,y:Math.random()*(H+2*M)-M,p:Math.random(),s:0.3+Math.random()*0.5}); this.swell=[]; for(let i=0;i<15;i++) this.swell.push({y:Math.random()*(H+2*M)-M,o:Math.random()*Math.PI*2,sp:0.2+Math.random()*0.3,amp:6+Math.random()*9}); this._swT=0; return; } } const g=this.add.graphics().setDepth(0); const A=Phaser.Display.Color.IntegerToColor(COL.oceanDeep),B=Phaser.Display.Color.IntegerToColor(COL.ocean); g.fillStyle(COL.oceanDeep,1); g.fillRect(0,0,W,H); const bands=12; for(let i=0;i<bands;i++){ const ci=Phaser.Display.Color.Interpolate.ColorWithColor(A,B,bands,i); g.fillStyle(Phaser.Display.Color.GetColor(ci.r,ci.g,ci.b),0.45); g.fillRect(0,Math.floor(H*i/bands),W,Math.ceil(H/bands)+1); } for(let i=0;i<26;i++){ g.fillStyle(COL.oceanLite,0.05); g.fillCircle(Math.random()*W,Math.random()*H,60+Math.random()*150); } for(let i=0;i<220;i++){ g.fillStyle(COL.oceanLite,0.10); g.fillCircle(Math.random()*W,Math.random()*H,Math.random()*1.8+0.6); } g.fillStyle(COL.shadow,0.16); g.fillRect(0,0,W,16); g.fillRect(0,H-16,W,16); g.fillRect(0,0,16,H); g.fillRect(W-16,0,16,H); this.waterFx=this.add.graphics().setDepth(1); this.ripples=[]; for(let i=0;i<54;i++) this.ripples.push({x:Math.random()*W,y:Math.random()*H,p:Math.random(),s:0.3+Math.random()*0.5}); this.swell=[]; for(let i=0;i<7;i++) this.swell.push({y:Math.random()*H,o:Math.random()*Math.PI*2,sp:0.2+Math.random()*0.3,amp:6+Math.random()*9}); this._swT=0; }
  _updateWater(dt){ const g=this.waterFx; g.clear(); const W=this.worldW,H=this.worldH; const M=this.oceanM||0; const sp=this.paused?0:this.gameSpeed; const isl=this.islands||[]; const onLand=(x,y,pad)=>{ for(let k=0;k<isl.length;k++){ const o=isl[k]; const rr=o.r*1.26+(pad||0); const dx=x-o.x,dy=y-o.y; if(dx*dx+dy*dy<rr*rr) return true; } return false; }; for(let i=0;i<this.ripples.length;i++){ const r=this.ripples[i]; r.p+=dt*0.0002*r.s*(this.paused?1:this.gameSpeed); if(r.p>1){ r.p=0; r.x=Math.random()*(W+2*M)-M; r.y=Math.random()*(H+2*M)-M; } if(onLand(r.x,r.y,2)) continue; g.lineStyle(1.2,COL.oceanLite,0.16*(1-r.p)); g.strokeCircle(r.x,r.y,4+r.p*16); } this._swT=(this._swT||0)+dt*0.001*(0.4+sp*0.6); for(let i=0;i<this.swell.length;i++){ const s=this.swell[i]; g.lineStyle(2,COL.oceanLite,0.07); g.beginPath(); let pen=false; const crests=[]; for(let x=-M;x<=W+M;x+=18){ const ph=x*0.018+this._swT*s.sp*4+s.o; const yy=s.y+Math.sin(ph)*s.amp; if(onLand(x,yy,4)){ pen=false; continue; } if(!pen){ g.moveTo(x,yy); pen=true; } else g.lineTo(x,yy); if(Math.sin(ph)>0.9) crests.push([x,yy]); } g.strokePath(); g.fillStyle(COL.white,0.12); for(let c=0;c<crests.length;c++) g.fillCircle(crests[c][0],crests[c][1],1.5); } for(let k=0;k<isl.length;k++){ const o=isl[k]; const base=o.r*1.34; const ph=((this._swT*0.5)+k*0.33)%1; g.lineStyle(2.2,COL.white,0.13*(1-ph)); g.strokeCircle(o.x,o.y,base+ph*9); g.lineStyle(1.4,COL.oceanLite,0.16*(1-ph)); g.strokeCircle(o.x,o.y,base+4+ph*9); } }
  _generateWorld(){ this.islands=[]; this.rocks=[]; const W=this.worldW,H=this.worldH;
    const _layouts=[
      [{fx:0.16,fy:0.22,r:42},{fx:0.84,fy:0.20,r:38},{fx:0.15,fy:0.78,r:40},{fx:0.85,fy:0.80,r:44},{fx:0.50,fy:0.13,r:36}],
      [{fx:0.12,fy:0.30,r:44},{fx:0.88,fy:0.32,r:40},{fx:0.30,fy:0.86,r:38},{fx:0.70,fy:0.86,r:42},{fx:0.50,fy:0.10,r:34}],
      [{fx:0.20,fy:0.14,r:38},{fx:0.80,fy:0.14,r:38},{fx:0.10,fy:0.58,r:42},{fx:0.90,fy:0.60,r:42},{fx:0.50,fy:0.88,r:46}],
      [{fx:0.14,fy:0.48,r:46},{fx:0.86,fy:0.52,r:46},{fx:0.40,fy:0.14,r:34},{fx:0.62,fy:0.86,r:40},{fx:0.28,fy:0.82,r:32}],
      [{fx:0.18,fy:0.20,r:40},{fx:0.82,fy:0.80,r:44},{fx:0.20,fy:0.82,r:38},{fx:0.80,fy:0.22,r:38},{fx:0.50,fy:0.86,r:34}]
    ];
    const _layout=_layouts[Math.floor(Math.random()*_layouts.length)];
    this.islands=_layout.map(L=>({x:Math.round(W*(0.5+(L.fx-0.5)*0.78)),y:Math.round(H*(0.5+(L.fy-0.5)*0.78)),r:Math.round(L.r*1.5*0.75)}));
    const g=this.add.graphics().setDepth(2);
    const _ivars=['island','island2','island3','island4'].slice(0,Math.max(1,Math.min(4,GAMECFG.world.islandVariations))).filter(k=>this.textures.exists(k));
    const _shuffledIvars=[..._ivars];
    for(let i=_shuffledIvars.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const temp=_shuffledIvars[i]; _shuffledIvars[i]=_shuffledIvars[j]; _shuffledIvars[j]=temp; }
    this.islands.forEach((o,idx)=>{ if(_shuffledIvars.length){ const key=_shuffledIvars[idx%_shuffledIvars.length]; const im=this.add.image(o.x,o.y,key).setDepth(2); const _s=this.textures.get(key).getSourceImage(); im.setScale((o.r*2.5)/Math.max(1,Math.max(_s.width,_s.height))); } else { this._drawIsland(g,o); } });
  }
  _drawIsland(g,o){
    if(!o.shape){ const n=24; let raw=[]; for(let i=0;i<n;i++) raw.push(0.8+Math.random()*0.4); o.shape=[]; for(let i=0;i<n;i++){ o.shape.push((raw[(i-1+n)%n]+raw[i]*2+raw[(i+1)%n])/4); } o.rot=Math.random()*Math.PI*2; o.bumps=[]; const bc=2+Math.floor(Math.random()*2); for(let b=0;b<bc;b++) o.bumps.push({a:Math.random()*Math.PI*2,d:0.18+Math.random()*0.3,r:0.16+Math.random()*0.14}); }
    const n=o.shape.length;
    const rot=o.rot||0; const poly=(scale,ox,oy)=>{ const pts=[]; for(let i=0;i<n;i++){ const a=rot+(i/n)*Math.PI*2; const rr=o.r*o.shape[i]*scale; pts.push({x:o.x+(ox||0)+Math.cos(a)*rr,y:o.y+(oy||0)+Math.sin(a)*rr}); } return pts; };
    g.fillStyle(COL.shadow,0.22); g.fillPoints(poly(1.10,4,8),true);
    g.fillStyle(COL.cyan,0.10); g.fillPoints(poly(1.15,0,0),true);
    g.fillStyle(COL.oceanLite,0.55); g.fillPoints(poly(1.07,0,0),true);
    g.fillStyle(COL.white,0.22); g.fillPoints(poly(1.02,0,0),true);
    g.fillStyle(COL.sand,1); g.fillPoints(poly(0.98,0,0),true);
    g.fillStyle(COL.sandDk,1); g.fillPoints(poly(0.88,0,0),true);
    g.fillStyle(COL.islandDk,1); g.fillPoints(poly(0.78,0,0),true);
    g.fillStyle(COL.island,1); g.fillPoints(poly(0.64,0,0),true);
    g.fillStyle(COL.islandDk2,0.55); g.fillPoints(poly(0.5,o.r*0.12,o.r*0.14),true);
    if(o.bumps){ g.fillStyle(COL.islandDk2,0.5); o.bumps.forEach(b=>g.fillCircle(o.x+Math.cos(b.a)*o.r*b.d,o.y+Math.sin(b.a)*o.r*b.d,o.r*b.r)); } g.fillStyle(COL.island,0.85); g.fillCircle(o.x-o.r*0.16,o.y-o.r*0.18,o.r*0.2);
    const pc=2+Math.floor(Math.random()*3);
    for(let i=0;i<pc;i++){ const a=Math.random()*Math.PI*2,d=Math.random()*(o.r*0.5); const px=o.x+Math.cos(a)*d,py=o.y+Math.sin(a)*d; g.fillStyle(COL.trunk,1); g.fillRect(px-1.3,py-3,2.6,10); g.fillStyle(COL.palm,1); for(let k=0;k<6;k++){ const fa=(k/6)*Math.PI*2; const bx=px,by=py-4; const tx=bx+Math.cos(fa)*7,ty=by+Math.sin(fa)*5; const pa=fa+Math.PI/2; g.fillTriangle(bx+Math.cos(pa)*2,by+Math.sin(pa)*2,bx-Math.cos(pa)*2,by-Math.sin(pa)*2,tx,ty); } g.fillStyle(COL.islandDk2,1); g.fillCircle(px,py-4,2); }
  }
  spawnShip(type,x,y,hpMul,dmgMul,order){ let s=null; for(let i=0;i<this.shipPool.length;i++){ if(!this.shipPool[i].alive){ s=this.shipPool[i]; break; } } if(!s){ s=new Ship(this); this.shipPool.push(s); } s.spawn(type,x,y,hpMul,dmgMul,order); if(s.container){ if(s._fadeTw) s._fadeTw.stop(); s.container.setAlpha(0); s._fadeTw=this.tweens.add({targets:s.container,alpha:1,duration:900,ease:'Sine.easeOut'}); } this.enemies.push(s); }
  onShipKilled(s){ const i=this.enemies.indexOf(s); if(i>=0) this.enemies.splice(i,1); this.wave.onKilled(); }
  spawnProjectile(kind,x,y,target,dmg,speed,splash,fromPlayer){ let p=null; for(let i=0;i<this.projPool.length;i++){ if(!this.projPool[i].alive){ p=this.projPool[i]; break; } } if(!p){ p=new Projectile(this); this.projPool.push(p); } p.fire(kind,x,y,target,dmg,speed,splash,fromPlayer); this.activeProj.push(p); return p; }
  freeProjectile(p){ const i=this.activeProj.indexOf(p); if(i>=0) this.activeProj.splice(i,1); }
  playShoot(kind){ const t=this.time.now; if(t-this._lastShootSnd>55){ this._lastShootSnd=t; SFX.shoot(kind); } }
  addGold(n, raw = false){
    const baseMul = GAMECFG.economy.coinMul || 1.0;
    const doublerMul = this.coinDoublerActive ? 2.0 : 1.0;
    const mul = raw ? 1.0 : (baseMul * doublerMul);
    const finalAmt = Math.round(n * mul);
    this.gold += finalAmt;
    this.ui.updateResources();
    this.ui.refreshBuild();
    return finalAmt;
  }
  shouldOfferDoubler(){
    const w=this.wave?this.wave.wave:0;
    if(w<1) return null;
    if(this._doublerOfferWave===w) return this._doublerWhy;
    let why=GAMECFG.economy.doubler.waves.includes(w)?'bonus':null;
    if(why&&this.doublerFreeUsed&&Platform.extraCount('doubler')<=0&&(!GAMECFG.shop.enabled||(this.puBought.doubler||0)>=runCap('doubler'))) why=null;
    this._doublerOfferWave=w; this._doublerWhy=why;
    return why;
  }
  activateCoinDoubler(durationMs){
    this.coinDoublerActive = true;
    this.coinDoublerUntil = this.time.now + durationMs;
    this.ui.announce('2X GOLD GAIN ACTIVE!');
    SFX.upgrade();
    if(this.coinDoublerTween) this.coinDoublerTween.remove();
    this.coinDoublerTween = this.tweens.add({
      targets: this.ui.goldText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  addScore(n,x,y){ if(!n) return; this.score+=n; this.kills++; if(this.score>this.highScore){ this.highScore=this.score; } if(this.ui&&this.ui.updateScore) this.ui.updateScore(); if(x!=null&&this.fx) this.fx.scorePop(x,y,n); }
  addGems(n){ this.gems+=n; this.ui.updateResources(); }
  spendGold(n){ if(this.gold>=n){ this.gold-=n; this.ui.updateResources(); this.ui.refreshBuild(); return true; } return false; }
  selectBuild(key){ SFX.ui(); const cfg=TURRET_TYPES[key]; if(this.wave.wave<cfg.unlock&&cfg.unlock!==0){ this.ui.announce('Unlocks Wave '+cfg.unlock); return; } if(key==='mine'&&this.time.now<this.mineReadyAt){ this.ui.announce('Mine on cooldown'); return; } this.buildType=this.buildType===key?null:key; this.buildRot=0; this.selectTurret(null); this.ui.refreshBuild(); }
  _validPlacement(x,y){ const cfg=TURRET_TYPES[this.buildType]||{}; const mine=!!cfg.isMine; if(x<30||y<60||x>this.worldW-30||y>this.worldH-160) return false; const db=Phaser.Math.Distance.Between(x,y,this.base.x,this.base.y); if(db<this.base.radius+30) return false; if(!mine&&db>this.base.attackRadius+70) return false; for(const o of this.obstacles){ if(Phaser.Math.Distance.Between(x,y,o.x,o.y)<o.r+(mine?13:22)) return false; } for(const t of this.turrets){ if(Phaser.Math.Distance.Between(x,y,t.x,t.y)<(mine?22:34)) return false; } if(mine){ for(const m of this.mines){ if(Phaser.Math.Distance.Between(x,y,m.x,m.y)<20) return false; } } return true; }
  _buildFacing(x,y){ return Math.atan2(y-this.base.y,x-this.base.x)+this.buildRot; }
  cancelBuild(){ if(!this.buildType&&!this._placing) return; this.buildType=null; this._placing=false; this.buildRot=0; if(this.preview) this.preview.setVisible(false); if(this.ui){ this.ui.refreshBuild(); if(this.ui.refreshAim) this.ui.refreshAim(); } }
  _resolvePlacement(x,y){
    if(this._validPlacement(x,y)) return {x,y,snapped:false};
    const cfg=TURRET_TYPES[this.buildType]||{}; const R=cfg.isMine?70:120;
    for(let r=6;r<=R;r+=6){ const n=Math.max(12,Math.round(r/3)); let best=null,bd=Infinity;
      for(let k=0;k<n;k++){ const a=k/n*Math.PI*2, px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
        if(this._validPlacement(px,py)){ const d=Phaser.Math.Distance.Between(px,py,this.base.x,this.base.y); if(d<bd){ bd=d; best={x:px,y:py,snapped:true}; } } }
      if(best) return best; }
    return null;
  }
  _aim(p){ let x=p.worldX,y=p.worldY; if(this.isTouch){ const th=this.cameras.main.rotation||0, L=48; x+=-Math.sin(th)*L; y+=-Math.cos(th)*L; } return {x,y}; }
  _buzz(){ try{ if(this.isTouch&&navigator.vibrate) navigator.vibrate(12); }catch(e){} }
  tryPlace(x,y){ const cfg=TURRET_TYPES[this.buildType]; if(cfg.isMine&&this.time.now<this.mineReadyAt){ this.ui.announce('Mine on cooldown'); return; } const spot=this._resolvePlacement(x,y); if(!spot){ this.ui.announce('No room here - try open water',COL.red); return; } x=spot.x; y=spot.y; if(this.gold<cfg.cost){ this.ui.announce('Not enough gold'); return; } if(cfg.isMine){ this.spendGold(cfg.cost); this.mines.push(new Mine(this,x,y)); this.fx.ring(x,y,22,cfg.accent); SFX.place(); this._buzz(); this.mineReadyAt=this.time.now+GAMECFG.economy.mineCooldownMs; if(this.isTouch) this.buildType=null; this.ui.refreshBuild(); return; } this.spendGold(cfg.cost); const t=new Turret(this,this.buildType,x,y,this._buildFacing(x,y)); this.turrets.push(t); this.fx.ring(x,y,30,cfg.accent); SFX.place(); this._buzz(); if(this.isTouch) this.buildType=null; this.ui.refreshBuild(); }
  selectTurret(t){ this.aimActive=false; if(this.armedUpgrade) this.ui.hideUpgradePreview(); if(this.selectedTurret) this.selectedTurret.select(false); this.selectedTurret=t; if(t){ t.select(true); if(this.rotateMode) this._rotStartFacing=t.facing; this.ui.showSelection(t); } else { this.rotateMode=false; this._rotStartFacing=null; this.ui.hideSelection(); } }
  startAim(){ const t=this.selectedTurret; if(!t||this.aimActive) return; const cost=GAMECFG.economy.aimCost; if(this.gold<cost){ this.ui.announce('Aim costs '+cost+' coins'); return; } this.spendGold(cost); this.aimActive=true; if(this.fx) this.fx.floatText(t.x,t.y-t._radius()-18,'-'+cost,CSS(COL.gold)); SFX.ui(); this.ui.refreshAim(); }
  endAim(){ this.aimActive=false; if(this.ui) this.ui.refreshAim(); }
  rotateSelected(d,hint){ const t=this.selectedTurret; if(!t) return; if(!this.aimActive){ if(hint) this.ui.announce('Tap AIM first ('+GAMECFG.economy.aimCost+' coins)'); return; } t.rotateBy(d); SFX.rotate(); this.ui.showSelection(t); }
  upgradeSelected(){ const t=this.selectedTurret; if(!t||!t.canUpgrade()) return; const cost=t.upgradeCost(); if(!this.spendGold(cost)){ this.ui.announce('Not enough gold'); return; } t.upgrade(); SFX.upgrade(); this.cancelBuild(); this.ui.showSelection(t); }
  upgradeTurret(t){ if(!t||!t.alive||!t.canUpgrade()) return; if(this.wave.state!=='prep'){ this.ui.announce('Upgrade between waves'); return; } const cost=t.upgradeCost(); if(!this.spendGold(cost)){ this.ui.announce('Not enough gold'); return; } t.upgrade(); SFX.upgrade(); this.cancelBuild(); if(this.fx) this.fx.floatText(t.x,t.y-t._radius()-18,'Lv'+t.level,CSS(COL.green)); if(this.selectedTurret===t) this.ui.showSelection(t); }
  onUpgradeBadge(t){ if(!t||!t.alive||!t.canUpgrade()) return; if(this.wave.wave<1){ this.ui.announce('Upgrade after Wave 1'); return; } if(this.wave.state!=='prep'){ this.ui.announce('Upgrade between waves'); return; } this.cancelBuild(); if(this.selectedTurret){ this.selectedTurret.select(false); this.selectedTurret=null; this.ui.hideSelection(); } this.armedUpgrade=t; SFX.ui(); this.ui.showUpgradePreview(t); }
  confirmUpgrade(){ const t=this.armedUpgrade; if(!t||!t.alive||!t.canUpgrade()){ this.ui.hideUpgradePreview(); return; } const cost=t.upgradeCost(); if(!this.spendGold(cost)){ this.ui.announce('Not enough gold'); return; } t.upgrade(); SFX.upgrade(); this.cancelBuild(); if(this.wave) this.wave.prepActivityAt=this.time.now; if(this.fx) this.fx.floatText(t.x,t.y-t._radius()-18,'Lv'+t.level,CSS(COL.green)); if(t.canUpgrade()&&this.gold>=t.upgradeCost()){ this.ui.showUpgradePreview(t); } else { this.ui.hideUpgradePreview(); } }
  cancelUpgrade(){ SFX.ui(); this.ui.hideUpgradePreview(); }
  submitRotate(){ const t=this.selectedTurret; if(t&&this._rotStartFacing!=null&&t.facing!==this._rotStartFacing){ if(!this.spendGold(20)){ t.facing=this._rotStartFacing; t._drawDir(); if(t.arcG&&t.arcG.visible) t._drawArc(); this.ui.announce('Need 20 gold'); this.ui.showSelection(t); return; } SFX.upgrade(); if(this.fx) this.fx.floatGold(t.x,t.y-t._radius()-18,'-20',CSS(COL.gold)); } else { SFX.ui(); } this.rotateMode=false; this._rotStartFacing=null; if(this.selectedTurret){ this.selectedTurret.select(false); this.selectedTurret=null; } this.ui.hideSelection(); this.ui.refreshControls(); this.ui.announce('Rotation set'); }
  sellSelected(){ const t=this.selectedTurret; if(!t) return; const refund=Math.round(t.cfg.cost*0.5*t.level); this.addGold(refund, true); SFX.sell(); const i=this.turrets.indexOf(t); if(i>=0) this.turrets.splice(i,1); if(t.removeUpBadge) t.removeUpBadge(); t.destroy(); this.selectTurret(null); }
  useAbility(key){
    const o=this.ui.abilityButtons.find(b=>b.key===key); if(!o) return;
    if((key==='airstrike'||key==='shield')&&(!this.wave||this.wave.state!=='spawning')){ this.ui.announce('Use during the wave'); return; }
    if(key==='airstrike'&&!(this.enemies&&this.enemies.some(e=>e.alive))){ this.ui.announce('No enemies'); return; }
    if(this.time.now<o.readyAt) return;
    const cost=o.ab.gold||0, short=Math.max(0,cost-this.gold), hasUse=o.charges>0||Platform.extraCount(key)>0;
    if(!hasUse||short>0){ if(!GAMECFG.shop.enabled){ this.ui.announce(short>0?'Not enough coins':'No uses left'); return; } SFX.ui(); openPurchase(this,{kind:'ability',key,hasUse,shortCoins:short,free:o.charges>0}); return; }
    if(o.charges>0) o.charges--; else Platform.useExtra(key);
    if(cost) this.spendGold(cost);
    o.readyAt=this.time.now+o.ab.cd; SFX.ability(); if(key==='shield'){ this.base.activateShield(12000); this.fx.ring(this.base.x,this.base.y,this.base.shieldR,COL.cyan); this.ui.announce('SHIELD UP'); } else if(key==='repair'){ this.base.repair(250); this.fx.ring(this.base.x,this.base.y,this.base.radius*2,COL.green); this.ui.announce('+250 HP'); } else if(key==='airstrike'){ this._airstrike(); } else if(key==='navy'){ this.spawnFriendly(); } this.ui.refreshAbilities(); }
  _drawPlane(g,dir){ g.clear(); const f=dir>0?1:-1; g.fillStyle(COL.shadow,0.22); g.fillEllipse(0,12,60,12); g.fillStyle(0x46668a,1); g.fillTriangle(0,-3,0,3,-16*f,-15); g.fillTriangle(0,-3,0,3,-16*f,15); g.fillStyle(0x35506b,1); g.fillTriangle(-12*f,-2,-12*f,2,-22*f,-7); g.fillTriangle(-12*f,-2,-12*f,2,-22*f,7); g.fillStyle(0x5b7fa6,1); g.fillRoundedRect(-16,-4.5,32,9,4); g.fillStyle(0x2c3e52,1); g.fillTriangle(16*f,-4.5,16*f,4.5,28*f,0); g.fillStyle(COL.cyan,0.95); g.fillCircle(6*f,0,3); }
  _airstrike(){ this.ui.announce('AIRSTRIKE!'); let tx=this.base.x,ty=this.base.y,best=-1; this.enemies.forEach(e=>{ if(!e.alive) return; const near=this.shipGrid.query(e.x,e.y,120).filter(s=>s.alive); let pw=0; for(let i=0;i<near.length;i++){ const s=near[i]; pw+=s.hp+(s.size||10)*14; } if(pw>best){best=pw;tx=e.x;ty=e.y;} }); const dir=(tx<this.worldW/2)?1:-1; const startX=dir>0?-90:this.worldW+90; const endX=dir>0?this.worldW+90:-90; const flyY=Math.max(40,ty-46); const plane=this.add.container(startX,flyY).setDepth(60); if(this.textures.exists('plane')){ const im=this.add.image(0,0,'plane').setOrigin(0.5); const ps=this.textures.get('plane').getSourceImage(); im.setScale(72/Math.max(1,Math.max(ps.width,ps.height))); im.setRotation(dir>0?Math.PI/2:-Math.PI/2); plane.add(im); } else { const pg=this.add.graphics(); this._drawPlane(pg,dir); plane.add(pg); } this.tweens.add({targets:plane,x:endX,duration:3200,ease:'Linear',onComplete:()=>{ if(plane) plane.destroy(); }}); let i=0; const strike=()=>{ if(i++>=4) return; const ox=tx+(Math.random()-0.5)*120,oy=ty+(Math.random()-0.5)*120; this.fx.explode(ox,oy,30); SFX.explode(); this.fx.shake(0.004,90); const near=this.shipGrid.query(ox,oy,56); near.forEach(s=>{ if(s.alive&&Phaser.Math.Distance.Between(ox,oy,s.x,s.y)<56) s.damage(58,null); }); this.time.delayedCall(220,strike); }; this.time.delayedCall(1300,strike); }
  spawnFriendly(){ const f=new Friendly(this,this.friendlies.length); this.friendlies.push(f); this.fx.ring(f.x,f.y,30,COL.cyan); this.ui.announce('FRIGATE DEPLOYED'); }
  togglePause(){ this.paused=!this.paused; this._prevPaused=this.paused; this.ui.refreshControls(); if(this.paused) this.ui.announce('PAUSED'); }
  _setupInput(){
    this.input.on('pointerdown',()=>{ this._tryFullscreen(); });
    this.input.on('pointerdown',(p,currentlyOver)=>{ SFX.ensure(); if(this.ui.menu.visible||this.gameIsOver) return; if(currentlyOver&&currentlyOver.length>0) return; const x=p.worldX,y=p.worldY; this._ptr=this._aim(p); if(this.buildType){ let _tap=null,_td=26; for(const t of this.turrets){ if(!t.alive) continue; const d=Phaser.Math.Distance.Between(x,y,t.x,t.y); if(d<_td){_td=d;_tap=t;} } if(_tap){ this.cancelBuild(); this.selectTurret(_tap); return; } if(this.isTouch){ this._placing=true; this._drawPreview(); } else { this.tryPlace(x,y); } return; } let hit=null,hd=30; for(const t of this.turrets){ const d=Phaser.Math.Distance.Between(x,y,t.x,t.y); if(d<hd){hd=d;hit=t;} } this.selectTurret(hit); });
    this.input.on('pointermove',(p)=>{ this._ptr=this._aim(p); if(this._placing) this._drawPreview(); });
    this.input.on('pointerup',(p)=>{ if(this._placing&&this.buildType){ this._placing=false; const a=this._aim(p); this.tryPlace(a.x,a.y); } this._placing=false; });
    this.input.on('wheel',(p,go,dx,dy)=>{ if(!this.buildType&&this.selectedTurret) this.rotateSelected((dy>0?1:-1)*10*D2R); });
    const kb=this.input.keyboard; if(kb){ kb.on('keydown',()=>SFX.ensure());
      kb.on('keydown-ONE',()=>this.selectBuild('cannon')); kb.on('keydown-TWO',()=>this.selectBuild('missile')); kb.on('keydown-THREE',()=>this.selectBuild('laser')); kb.on('keydown-FOUR',()=>this.selectBuild('aa')); kb.on('keydown-FIVE',()=>this.selectBuild('tesla')); kb.on('keydown-SIX',()=>this.selectBuild('mine'));
      kb.on('keydown-SPACE',()=>this.togglePause()); kb.on('keydown-ESC',()=>{ this.buildType=null; this.selectTurret(null); this.ui.refreshBuild(); });
      kb.on('keydown-Q',()=>{ if(!this.buildType) this.rotateSelected(-12*D2R,true); }); kb.on('keydown-E',()=>{ if(!this.buildType) this.rotateSelected(12*D2R,true); });
    }
  }
  _drawPreview(){ this.preview.clear(); if(!this.buildType||!this._ptr){ this.preview.setVisible(false); return; } this.preview.setVisible(true); const cfg=TURRET_TYPES[this.buildType]; if(this.isTouch&&!this._placing){ this.preview.setVisible(false); return; } const raw=this._ptr; const spot=this._resolvePlacement(raw.x,raw.y); const x=spot?spot.x:raw.x,y=spot?spot.y:raw.y; const ok=!!spot&&this.gold>=cfg.cost; const col=ok?COL.green:COL.red; if(spot&&spot.snapped){ this.preview.lineStyle(2,COL.white,0.5); this.preview.lineBetween(raw.x,raw.y,x,y); this.preview.strokeCircle(raw.x,raw.y,6); } if(cfg.isMine){ this.preview.fillStyle(col,0.12); this.preview.fillCircle(x,y,cfg.blast||96); this.preview.lineStyle(2,col,0.85); this.preview.strokeCircle(x,y,cfg.blast||96); this.preview.fillStyle(col,0.6); this.preview.fillCircle(x,y,9); return; } const facing=this._buildFacing(x,y); const half=cfg.arc*0.5*D2R;
    this.preview.fillStyle(col,0.14); this.preview.slice(x,y,cfg.range,facing-half,facing+half,false); this.preview.fillPath();
    this.preview.lineStyle(2,col,0.8); this.preview.beginPath(); this.preview.arc(x,y,cfg.range,facing-half,facing+half,false); this.preview.strokePath();
    this.preview.lineStyle(1.5,col,0.7); this.preview.lineBetween(x,y,x+Math.cos(facing-half)*cfg.range,y+Math.sin(facing-half)*cfg.range); this.preview.lineBetween(x,y,x+Math.cos(facing+half)*cfg.range,y+Math.sin(facing+half)*cfg.range);
    this.preview.fillStyle(col,0.55); this.preview.fillCircle(x,y,18);
    this.preview.fillStyle(col,0.95); const ax=x+Math.cos(facing)*30,ay=y+Math.sin(facing)*30,pa=facing+Math.PI/2; this.preview.fillTriangle(ax+Math.cos(facing)*8,ay+Math.sin(facing)*8,ax+Math.cos(pa)*6,ay+Math.sin(pa)*6,ax-Math.cos(pa)*6,ay-Math.sin(pa)*6);
  }
  gameOver(){ if(this.gameIsOver) return; this.gameIsOver=true; this.paused=true; if(!GAMECFG.shop.enabled||this.reviveUsed||!Platform.loggedIn){ this.finishGame(); return; } Platform.runKnown().then(ok=>{ if(!this.sys||!this.sys.isActive()||!this.gameIsOver) return; if(ok) openPurchase(this,{kind:'revive'}); else this.finishGame(); }); }
  finishGame(){ Platform.noteScore(this.score); SFX.gameover(); buildGameOver(this); }
  revive(){ if(this.reviveUsed) return; this.reviveUsed=true; this.gameIsOver=false; this.paused=false; const b=this.base; b.hp=Math.round(b.maxHp*0.5); b.activateShield(10000); this.ui.updateBaseHp();
    this.fx.ring(b.x,b.y,b.shieldR||b.radius*2,COL.green); this.fx.shake(0.012,260); sparkBurst(this,b.x,b.y,{count:34,speed:170,life:800,size:3.4,color:0x7df0a8,gravity:20});
    this.enemies.forEach(e=>{ if(e.alive&&Phaser.Math.Distance.Between(e.x,e.y,b.x,b.y)<260) e.damage(99999,'revive'); });
    SFX.upgrade(); this.ui.announce('CONTINUE!',COL.green); }
  afterPurchase(key){ if(key==='doubler') this.ui.onDoublerClick(); else if(key==='revive') this.revive(); else this.useAbility(key); }
  showLeaderboard(){ openLeaderboard(this); }
  restart(){ this.scene.restart({skipIntro:true}); }
  update(time,delta){ const dt=Math.min(delta,50); this._updateWater(dt); if(this.ui&&this.ui.refreshAim) this.ui.refreshAim();
    if(this.paused||this.gameIsOver){ this._drawPreview(); this.ui.updateMinimap(); return; }
    this.shipGrid.clear(); for(let i=0;i<this.enemies.length;i++){ if(this.enemies[i].alive) this.shipGrid.insert(this.enemies[i]); }
    this.wave.update(time,dt); this.base.update(time);
    for(let i=0;i<this.enemies.length;i++) this.enemies[i].update(time,dt);
    for(let i=0;i<this.turrets.length;i++){ this.turrets[i].update(time,dt); this.turrets[i].updateUpBadge(); }
    if(this.armedUpgrade) this.ui.updateUpgradePreview(time);
    for(let i=this.mines.length-1;i>=0;i--) this.mines[i].update(time,dt);
    for(let i=0;i<this.friendlies.length;i++) this.friendlies[i].update(time,dt);
    for(let i=this.activeProj.length-1;i>=0;i--) this.activeProj[i].update(dt);
    this._drawPreview(); this.ui.updateMinimap(); if((time%200)<dt){ this.ui.refreshAbilities(); this.ui.refreshBuild(); }
  }
}
