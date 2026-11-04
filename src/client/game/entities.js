import Phaser from 'phaser';
import { waveShipCount, waveSpawnGapMs } from '../../shared/rules.ts';
import { SFX } from './sfx.js';
import { Platform } from '../platform.ts';
import { GAME_NAME } from '../../shared/brand.ts';
import { COIN_PACK_RUN_CAP, POWERUP_PRICE, runCap } from '../../shared/products.ts';
import { openPurchase } from './purchaseDialog.js';
import { sparkBurst, waveBanner } from './juice.js';
import { GAMECFG, COL, CSS, D2R, TURRET_TYPES, TURRET_ORDER, SHIP_TYPES, ABILITIES } from './config.js';

export class SpatialGrid {
  constructor(w,h,cell){ this.cell=cell; this.cols=Math.ceil(w/cell); this.rows=Math.ceil(h/cell); this.map=new Map(); }
  _idx(x,y){ const cx=Math.max(0,Math.min(this.cols-1,(x/this.cell)|0)); const cy=Math.max(0,Math.min(this.rows-1,(y/this.cell)|0)); return cy*this.cols+cx; }
  clear(){ this.map.clear(); }
  insert(o){ const i=this._idx(o.x,o.y); let b=this.map.get(i); if(!b){ b=[]; this.map.set(i,b);} b.push(o); }
  query(x,y,r){ const out=[]; const a=Math.max(0,((x-r)/this.cell)|0),b=Math.min(this.cols-1,((x+r)/this.cell)|0); const c=Math.max(0,((y-r)/this.cell)|0),d=Math.min(this.rows-1,((y+r)/this.cell)|0); for(let cy=c;cy<=d;cy++)for(let cx=a;cx<=b;cx++){ const bk=this.map.get(cy*this.cols+cx); if(bk)for(let k=0;k<bk.length;k++) out.push(bk[k]); } return out; }
}

export class Base {
  constructor(scene,x,y){
    this.scene=scene; this.x=x; this.y=y;
    this.maxHp=Math.round(750*GAMECFG.allies.baseHpMul); this.hp=this.maxHp; this.radius=54; this.attackRadius=255; this.shieldUntil=0; this.shieldR=this.radius+140; this.shieldHitT=0; this.shieldHp=0; this.shieldMaxHp=720;
    this.ring=scene.add.graphics().setDepth(4);
    this._drawIslandAndCastle();
    this.marines=[]; const o=34;
    [[-o,-o],[o,-o],[-o,o],[o,o]].forEach(p=>this.marines.push({ox:p[0],oy:p[1],x:x+p[0],y:y+p[1],last:0,recoil:0}));
    this.marineGfx=scene.add.graphics().setDepth(43);
    this.flag=scene.add.star(x,y-this.radius-6,5,3,8,COL.cyan).setDepth(44);
    this._drawRing();
  }
  _drawIslandAndCastle(){
    if(this.scene.textures.exists('base_castle')){
      const _r=this.radius; this.castleImg=this.scene.add.image(this.x,this.y,'base_castle').setDepth(6);
      const _s=this.scene.textures.get('base_castle').getSourceImage();
      this.castleImg.setScale((_r*2.5)/Math.max(1,Math.max(_s.width,_s.height)));
      return;
    }
    const g=this.scene.add.graphics().setDepth(6); const r=this.radius;
    g.x=this.x; g.y=this.y;
    g.fillStyle(COL.shadow,0.35); g.fillCircle(3,6,r+14);
    g.fillStyle(COL.sand,1); g.fillCircle(0,0,r+14);
    g.fillStyle(COL.islandDk,1); g.fillCircle(0,0,r+6);
    g.fillStyle(COL.island,1); g.fillCircle(0,0,r+1);
    g.fillStyle(COL.stoneSh,1); g.fillCircle(0,2,r);
    g.fillStyle(COL.stoneDk,1); g.fillCircle(0,0,r-2);
    g.fillStyle(COL.stone,1); g.fillCircle(0,0,r-8);
    g.fillStyle(COL.stoneDk,1); g.fillRoundedRect(-r+14,-r+14,(r-14)*2,(r-14)*2,8);
    g.fillStyle(COL.stoneSh,1); g.fillRoundedRect(-18,-16,36,36,5);
    g.fillStyle(COL.keep,1); g.fillRoundedRect(-15,-15,30,30,4);
    g.fillStyle(COL.stoneDk,1); for(let i=-15;i<15;i+=10){ g.fillRect(i,-19,6,5); }
    g.fillStyle(COL.stoneSh,1); g.fillRoundedRect(-6,8,12,10,2);
    g.fillStyle(COL.cyanDk,1); g.fillRoundedRect(-9,-9,18,18,3);
    g.fillStyle(COL.roofLite,1); g.fillRoundedRect(-5,-5,10,10,2);
    const o=34;
    [[-o,-o],[o,-o],[-o,o],[o,o]].forEach(p=>{
      g.fillStyle(COL.stoneDk,1); g.fillCircle(p[0],p[1]+1,11);
      g.fillStyle(COL.stone,1); g.fillCircle(p[0],p[1],9);
      g.fillStyle(COL.stoneSh,1); for(let a=0;a<360;a+=60){ g.fillCircle(p[0]+Math.cos(a*D2R)*8,p[1]+Math.sin(a*D2R)*8,2); }
      g.fillStyle(COL.roof,1); g.fillCircle(p[0],p[1],5);
      g.fillStyle(COL.roofLite,1); g.fillCircle(p[0],p[1],2.4);
    });
  }
  _drawRing(){
    const g=this.ring; g.clear();
    const now=this.scene.time.now; const sh=now<this.shieldUntil;
    g.lineStyle(2,sh?COL.cyan:COL.cyanDk,sh?0.5:0.22);
    g.strokeCircle(this.x,this.y,this.attackRadius);
    if(!sh) return;
    const t=now*0.001; const fade=Phaser.Math.Clamp((this.shieldUntil-now)/600,0,1);
    const pulse=0.5+0.5*Math.sin(t*4); const R=this.shieldR+pulse*3;
    const hitK=now<this.shieldHitT?(this.shieldHitT-now)/220:0;
    g.fillStyle(COL.cyan,(0.06+0.05*pulse+hitK*0.28)*fade); g.fillCircle(this.x,this.y,R+8);
    g.fillStyle(COL.cyan,(0.05+0.04*pulse)*fade); g.fillCircle(this.x,this.y,R);
    const seg=20; g.lineStyle(2,COL.white,(0.5+0.4*pulse+hitK*0.5)*fade);
    g.beginPath(); for(let i=0;i<=seg;i++){ const a=(i/seg)*Math.PI*2+t*0.6; const rr=R+Math.sin(a*3+t*5)*2.2; const px=this.x+Math.cos(a)*rr, py=this.y+Math.sin(a)*rr; if(i===0) g.moveTo(px,py); else g.lineTo(px,py); } g.strokePath();
    g.lineStyle(4,COL.cyan,(0.35+hitK*0.5)*fade); g.strokeCircle(this.x,this.y,R-4);
    const hpf=Phaser.Math.Clamp(this.shieldMaxHp>0?this.shieldHp/this.shieldMaxHp:0,0,1); g.lineStyle(3,COL.shadow,0.28*fade); g.strokeCircle(this.x,this.y,R+11); g.lineStyle(3,(hpf>0.5?COL.cyan:(hpf>0.25?COL.gold:COL.red)),0.9*fade); g.beginPath(); g.arc(this.x,this.y,R+11,-Math.PI/2,-Math.PI/2+hpf*Math.PI*2,false); g.strokePath();
    g.lineStyle(1,COL.cyan,0.16*fade); for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2+t*0.8; g.lineBetween(this.x+Math.cos(a)*(this.radius+4),this.y+Math.sin(a)*(this.radius+4),this.x+Math.cos(a)*R,this.y+Math.sin(a)*R); }
  }
  damage(a){ a=a*1.25;
    if(this.scene.time.now<this.shieldUntil){ this.shieldHitT=this.scene.time.now+220; this.shieldHp-=a; this.scene.fx.flashCircle(this.x,this.y,this.shieldR,COL.cyan); SFX.hit(); if(this.shieldHp<=0){ this.shieldUntil=0; this.shieldHp=0; this.scene.fx.flashCircle(this.x,this.y,this.shieldR,COL.white); this.scene.fx.shake(0.006,140); if(this.scene.ui) this.scene.ui.announce('SHIELD DOWN'); } return; }
    this.hp=Math.max(0,this.hp-a);
    this.scene.fx.shake(0.0016,55); this.scene.fx.flashCircle(this.x,this.y,this.radius,COL.red);
    SFX.hit(); this.scene.ui.updateBaseHp();
    if(this.hp<=0) this.scene.gameOver();
  }
  repair(a){ this.hp=Math.min(this.maxHp,this.hp+a); this.scene.ui.updateBaseHp(); }
  activateShield(ms){ this.shieldUntil=this.scene.time.now+ms; this.shieldHp=this.shieldMaxHp; const en=this.scene.enemies; for(let i=0;i<en.length;i++){ const e=en[i]; if(!e||!e.alive) continue; e.insideShield=(Phaser.Math.Distance.Between(e.x,e.y,this.x,this.y) < this.shieldR + e.size*0.5); } }
  update(time){
    this._drawRing(); this.flag.rotation+=0.02;
    const g=this.marineGfx; g.clear();
    for(let m of this.marines){
      m.recoil=Math.max(0,m.recoil-0.08);
      g.fillStyle(COL.marine,1); g.fillCircle(m.x,m.y,3.4);
      g.fillStyle(COL.marineHat,1); g.fillCircle(m.x,m.y-0.5,2.2);
      let tgt=null,bd=118;
      const near=this.scene.shipGrid.query(m.x,m.y,118);
      for(let e of near){ if(!e.alive) continue; const d=Phaser.Math.Distance.Between(m.x,m.y,e.x,e.y); if(d<bd){bd=d;tgt=e;} }
      if(tgt){
        const a=Math.atan2(tgt.y-m.y,tgt.x-m.x);
        const rl=5-m.recoil*2;
        g.lineStyle(2,COL.shipDk,1); g.lineBetween(m.x,m.y,m.x+Math.cos(a)*rl,m.y+Math.sin(a)*rl);
        if(time-m.last>520){ m.last=time; m.recoil=1;
          this.scene.fx.tracer(m.x+Math.cos(a)*5,m.y+Math.sin(a)*5,tgt.x,tgt.y,COL.white);
          tgt.damage(2.5,null); if(Math.random()<0.4) SFX.marine();
        }
      }
    }
  }
}

export class Turret {
  constructor(scene,type,x,y,facing){
    this.scene=scene; this.cfg=TURRET_TYPES[type]; this.type=type; this.x=x; this.y=y;
    this.level=1; this.facing=facing; this.halfArc=this.cfg.arc*0.5*D2R;
    this.barrelAngle=facing; this.lastFire=0; this.target=null; this.alive=true;
    this.range=this.cfg.range; this.atk=Math.round(this.cfg.damage*GAMECFG.allies.turretDmgMul); this.fireRate=Math.round(this.cfg.fireRate*GAMECFG.allies.turretFireRateMul);
    this.maxHp=Math.round(this.cfg.hp*2*GAMECFG.allies.turretHpMul); this.hp=this.maxHp; this.upBadge=null;
    this.container=scene.add.container(x,y).setDepth(35);
    this.base=scene.add.graphics(); this.dir=scene.add.graphics(); this.barrel=scene.add.graphics();
    this.container.add([this.base,this.dir,this.barrel]);
    this.tkey='turret_'+type; this.useTSprite=scene.textures.exists(this.tkey); if(this.useTSprite){ this.tsprite=scene.add.image(0,0,this.tkey); const _ts=scene.textures.get(this.tkey).getSourceImage(); this.tsprite.setScale((this._radius()*2.295)/Math.max(1,Math.max(_ts.width,_ts.height))); this.container.add(this.tsprite); this.base.setVisible(false); this.dir.setVisible(false); this.barrel.setVisible(false); }
    this.beam=scene.add.graphics().setDepth(34);
    this.arcG=scene.add.graphics().setDepth(33).setVisible(false);
    this.hpBar=scene.add.graphics().setDepth(36);
    this.lvlBadgeG=scene.add.graphics(); this.lvlText=scene.add.text(0,0,'1',{fontFamily:'Space Grotesk',fontSize:'9px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); this.container.add([this.lvlBadgeG,this.lvlText]);
    this._drawBase(); this._drawBarrel(); this._drawDir(); this._drawLevel();
    this.container.setScale(0); scene.tweens.add({targets:this.container,scale:1,duration:240,ease:'Back.easeOut'});
  }
  upgradeCost(){ return Math.round(this.cfg.cost*0.85*Math.pow(1.5,this.level-1)); }
  canUpgrade(){ return this.level<5; }
  upgrade(){
    if(!this.canUpgrade()) return;
    this.level++;
    this.atk=Math.round(this.cfg.damage*Math.pow(1.25,this.level-1)*GAMECFG.allies.turretDmgMul);
    this.range=Math.round(this.cfg.range*(1+0.08*(this.level-1)));
    this.fireRate=Math.round(this.cfg.fireRate*Math.pow(0.93,this.level-1)*GAMECFG.allies.turretFireRateMul);
    const oldMax=this.maxHp; this.maxHp=Math.round(this.cfg.hp*2*Math.pow(1.25,this.level-1)*GAMECFG.allies.turretHpMul); this.hp+=(this.maxHp-oldMax);
    this._drawBase(); this._drawBarrel(); this._drawDir(); this._drawHpBar(); if(this.useTSprite&&this.tsprite){ const _ts=this.scene.textures.get(this.tkey).getSourceImage(); this.tsprite.setScale((this._radius()*2.295)/Math.max(1,Math.max(_ts.width,_ts.height))); } this._drawLevel();
    this.scene.tweens.add({targets:this.container,scale:{from:1.28,to:1},duration:260,ease:'Back.easeOut'});
    this.scene.fx.ring(this.x,this.y,28,this.cfg.accent);
  }
  rotateBy(d){ this.facing+=d; this._drawDir(); if(this.arcG.visible) this._drawArc(); }
  _ensureUpBadge(){ if(this.upBadge) return; const s=this.scene; const c=s.add.container(this.x,this.y).setDepth(60).setVisible(false); const g=s.add.graphics(); const t=s.add.text(-1,0,'',{fontFamily:'Space Grotesk',fontSize:'11px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); let coin=null; if(s.textures.exists('icon_gold')){ coin=s.add.image(0,0,'icon_gold'); const cs=s.textures.get('icon_gold').getSourceImage(); coin.setScale(14/Math.max(1,Math.max(cs.width,cs.height))); } c.add(coin?[g,t,coin]:[g,t]); const z=s.add.zone(0,0,58,30).setOrigin(0.5).setInteractive({useHandCursor:true}); c.add(z); z.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); this.scene.onUpgradeBadge(this); }); this.upBadge={c,g,t,z,coin}; }
  updateUpBadge(){ const s=this.scene; const can=this.alive&&s.wave&&s.wave.wave>=1&&s.wave.state==='prep'&&this.canUpgrade(); const cost=can?this.upgradeCost():0; const show=can&&s.gold>=cost; if(!show){ if(this.upBadge) this.upBadge.c.setVisible(false); return; } this._ensureUpBadge(); const b=this.upBadge; const bob=Math.sin(s.time.now*0.006)*2; b.c.setPosition(this.x,this.y-this._radius()-22+bob).setVisible(true); const g=b.g; g.clear(); const w=58,h=28; g.fillStyle(COL.shadow,0.4); g.fillRoundedRect(-w/2+1,-h/2+2,w,h,9); g.fillStyle(COL.green,1); g.fillRoundedRect(-w/2,-h/2,w,h,9); g.lineStyle(1.5,0x2bd06a,1); g.strokeRoundedRect(-w/2,-h/2,w,h,9); g.fillStyle(COL.white,1); g.fillTriangle(-18,-2,-25,6,-11,6); g.fillRect(-21,6,6,4); b.t.setText(''+cost); const cxp=20; if(b.coin){ b.coin.setVisible(true).setPosition(cxp,0); } else { g.fillStyle(COL.gold,1); g.fillCircle(cxp,0,6); g.lineStyle(1.4,0x8a6d1f,1); g.strokeCircle(cxp,0,6); g.fillStyle(0xfff3c4,0.95); g.fillCircle(cxp-1.6,-1.6,2); } if(s.armedUpgrade===this){ g.lineStyle(2,COL.gold,0.95); g.strokeRoundedRect(-w/2-2,-h/2-2,w+4,h+4,11); } }
  removeUpBadge(){ if(this.upBadge){ this.upBadge.c.destroy(); this.upBadge=null; } }
  _aim(a){ this.barrel.setRotation(a+Math.PI/2); if(this.useTSprite&&this.tsprite) this.tsprite.setRotation(a+Math.PI/2); }
  _radius(){ return 16+this.level; }
  _drawLevel(){ if(!this.lvlBadgeG) return; const g=this.lvlBadgeG; g.clear(); const r=this._radius(); const cx=r*0.84,cy=r*0.84; g.fillStyle(COL.shadow,0.4); g.fillCircle(cx,cy,5.4); g.lineStyle(1,COL.white,0.22); g.strokeCircle(cx,cy,5.4); this.lvlText.setPosition(cx,cy).setText(''+this.level).setFontSize(8).setAlpha(0.55); }
  damage(a){ a=a*1.25;
    if(!this.alive) return; this.hp-=a; this.scene.fx.hit(this.x,this.y,COL.red); this._drawHpBar();
    if(this.hp<=0) this.destroyedByEnemy();
  }
  _drawHpBar(){
    const g=this.hpBar; g.clear(); if(!this.alive||this.hp>=this.maxHp) return;
    const w=this._radius()*2.3,h=4,yo=this.y-this._radius()-9,x=this.x-w/2;
    const f=Phaser.Math.Clamp(this.hp/this.maxHp,0,1); const col=f>0.5?COL.green:(f>0.25?COL.gold:COL.red);
    g.fillStyle(col,1); g.fillRoundedRect(x,yo,Math.max(2,w*f),h,2);
  }
  destroyedByEnemy(){
    if(!this.alive) return; this.alive=false;
    this.scene.fx.explode(this.x,this.y,this._radius()); SFX.explode(); this.scene.fx.shake(0.004,80);
    const i=this.scene.turrets.indexOf(this); if(i>=0) this.scene.turrets.splice(i,1);
    if(this.scene.selectedTurret===this) this.scene.selectTurret(null); if(this.scene.armedUpgrade===this&&this.scene.ui) this.scene.ui.hideUpgradePreview();
    this.container.destroy(); this.beam.destroy(); this.arcG.destroy(); this.hpBar.destroy(); this.removeUpBadge();
  }
  _drawBase(){
    if(this.useTSprite) return;
    const g=this.base; g.clear(); const r=this._radius();
    g.fillStyle(COL.shadow,0.4); g.fillCircle(2,3,r);
    g.fillStyle(COL.shipDk,1); g.fillCircle(0,0,r);
    g.fillStyle(COL.ship,1); g.fillCircle(0,0,r-4);
    g.fillStyle(this.cfg.accent,1);
    for(let i=0;i<this.level;i++){ const a=-Math.PI/2+i*(Math.PI*2/5); g.fillCircle(Math.cos(a)*(r-2),Math.sin(a)*(r-2),2.3); }
  }
  _drawDir(){
    if(this.useTSprite) return;
    const g=this.dir; g.clear(); const r=this._radius();
    const a=this.facing, px=Math.cos(a)*(r+4), py=Math.sin(a)*(r+4);
    const pa=a+Math.PI/2;
    g.fillStyle(this.cfg.accent,0.95);
    g.fillTriangle(px+Math.cos(a)*5,py+Math.sin(a)*5, px+Math.cos(pa)*4,py+Math.sin(pa)*4, px-Math.cos(pa)*4,py-Math.sin(pa)*4);
  }
  _drawBarrel(){
    if(this.useTSprite) return;
    const g=this.barrel; g.clear(); const len=18+this.level*2.2;
    g.fillStyle(COL.shipDk,1); g.fillCircle(0,0,8);
    g.fillStyle(this.cfg.accent,1);
    if(this.type==='missile'){ g.fillRoundedRect(-5,-len,4,len,2); g.fillRoundedRect(1,-len,4,len,2); }
    else if(this.type==='laser'){ g.fillRoundedRect(-3,-len,6,len,3); g.fillStyle(COL.white,1); g.fillCircle(0,-len,3); }
    else if(this.type==='aa'){ g.fillRoundedRect(-4,-len,3,len,2); g.fillRoundedRect(1,-len,3,len,2); }
    else if(this.type==='tesla'){ g.fillRoundedRect(-3,-len*0.7,6,len*0.7,3); g.lineStyle(2,this.cfg.accent,1); g.strokeCircle(0,-len*0.7,6); g.strokeCircle(0,-len*0.7,3); }
    else { g.fillRoundedRect(-4,-len,8,len,3); }
  }
  _drawArc(){
    const g=this.arcG; g.clear();
    g.fillStyle(this.cfg.accent,0.14);
    g.slice(this.x,this.y,this.range,this.facing-this.halfArc,this.facing+this.halfArc,false); g.fillPath();
    g.lineStyle(2,this.cfg.accent,0.85); g.beginPath();
    g.arc(this.x,this.y,this.range,this.facing-this.halfArc,this.facing+this.halfArc,false); g.strokePath();
    g.lineStyle(1.5,this.cfg.accent,0.7);
    g.lineBetween(this.x,this.y,this.x+Math.cos(this.facing-this.halfArc)*this.range,this.y+Math.sin(this.facing-this.halfArc)*this.range);
    g.lineBetween(this.x,this.y,this.x+Math.cos(this.facing+this.halfArc)*this.range,this.y+Math.sin(this.facing+this.halfArc)*this.range);
    if(this.halfArc<Math.PI){ g.fillStyle(COL.blindArc,0.07);
      g.slice(this.x,this.y,this.range*0.85,this.facing+this.halfArc,this.facing-this.halfArc+Math.PI*2,false); g.fillPath(); }
  }
  select(on){ if(on){ this._drawArc(); this.arcG.setVisible(true); } else this.arcG.setVisible(false); }
  inArc(ex,ey){ const a=Math.atan2(ey-this.y,ex-this.x); return Math.abs(Phaser.Math.Angle.Wrap(a-this.facing))<=this.halfArc; }
  _acquire(){
    const en=this.scene.enemies; let best=null,bv=Infinity; const mode=this.scene.targetMode;
    for(let i=0;i<en.length;i++){ const e=en[i]; if(!e.alive) continue;
      const d=Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y); if(d>this.range) continue;
      if(!this.inArc(e.x,e.y)) continue;
      let v; if(this.type==='aa'){ const pri=(e.type==='scout'||e.type==='gunboat')?0:1; v=pri*1e5+d; }
      else if(mode==='strongest') v=-e.hp; else if(mode==='closest') v=d; else v=e.spawnOrder;
      if(v<bv){ bv=v; best=e; }
    }
    this.target=best;
  }
  _acquireMulti(n){ const en=this.scene.enemies; const list=[]; for(let i=0;i<en.length;i++){ const e=en[i]; if(!e.alive) continue; const d=Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y); if(d>this.range) continue; if(!this.inArc(e.x,e.y)) continue; list.push({e,d}); } list.sort((a,b)=>a.d-b.d); return list.slice(0,n).map(o=>o.e); }
  _bolt(x1,y1,x2,y2){ const g=this.beam; const seg=6; g.lineStyle(3.2,this.cfg.accent,0.55); g.beginPath(); g.moveTo(x1,y1); for(let i=1;i<seg;i++){ const t=i/seg; g.lineTo(x1+(x2-x1)*t+(Math.random()-0.5)*12, y1+(y2-y1)*t+(Math.random()-0.5)*12); } g.lineTo(x2,y2); g.strokePath(); g.lineStyle(1.4,COL.white,0.9); g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.strokePath(); }
  _updateMulti(time,dt){ const targets=this._acquireMulti(this.cfg.multi||3); this.beam.clear(); if(!targets.length){ this.barrelAngle=Phaser.Math.Angle.RotateTo(this.barrelAngle,this.facing,0.12); this._aim(this.barrelAngle); return; } const t0=targets[0]; const desired=Math.atan2(t0.y-this.y,t0.x-this.x); this.barrelAngle=Phaser.Math.Angle.RotateTo(this.barrelAngle,desired,0.25); this._aim(this.barrelAngle); const len=18+this.level*2.2; const mx=this.x+Math.cos(this.barrelAngle)*len, my=this.y+Math.sin(this.barrelAngle)*len; const fire=time-this.lastFire>=this.fireRate; if(fire) this.lastFire=time; targets.forEach(tg=>{ this._bolt(mx,my,tg.x,tg.y); if(fire){ tg.damage(this.atk,this); this.scene.fx.hit(tg.x,tg.y,this.cfg.accent); } }); if(fire){ this.scene.fx.muzzle(mx,my,this.cfg.accent); this.scene.playShoot('laser'); this.container.setScale(1.06); this.scene.tweens.add({targets:this.container,scale:1,duration:90}); } }
  update(time,dt){
    if(this.cfg.multi){ this._updateMulti(time,dt); return; }
    if((time%120)<dt) this._acquire();
    else if(this.target&&(!this.target.alive||Phaser.Math.Distance.Between(this.x,this.y,this.target.x,this.target.y)>this.range||!this.inArc(this.target.x,this.target.y))) this._acquire();
    this.beam.clear();
    const rest=this.facing;
    if(!this.target){ this.barrelAngle=Phaser.Math.Angle.RotateTo(this.barrelAngle,rest,0.12); this._aim(this.barrelAngle); return; }
    const desired=Math.atan2(this.target.y-this.y,this.target.x-this.x);
    this.barrelAngle=Phaser.Math.Angle.RotateTo(this.barrelAngle,desired,0.20);
    this._aim(this.barrelAngle);
    const len=18+this.level*2.2;
    const mx=this.x+Math.cos(this.barrelAngle)*len, my=this.y+Math.sin(this.barrelAngle)*len;
    if(this.type==='laser'){
      this.beam.lineStyle(3,this.cfg.accent,0.85); this.beam.lineBetween(mx,my,this.target.x,this.target.y);
      this.beam.lineStyle(1.4,COL.white,0.9); this.beam.lineBetween(mx,my,this.target.x,this.target.y);
      if(time-this.lastFire>=this.fireRate){ this.lastFire=time; this.target.damage(this.atk,this); this.scene.fx.hit(this.target.x,this.target.y,this.cfg.accent); this.scene.playShoot('laser'); }
      return;
    }
    if(time-this.lastFire>=this.fireRate){
      this.lastFire=time;
      this.scene.spawnProjectile(this.cfg.proj,mx,my,this.target,this.atk,this.cfg.projSpeed,this.cfg.splash,true);
      this.scene.fx.muzzle(mx,my,this.cfg.accent); this.scene.playShoot(this.type);
      this.container.setScale(1.08); this.scene.tweens.add({targets:this.container,scale:1,duration:90});
    }
  }
  destroy(){ this.container.destroy(); this.beam.destroy(); this.arcG.destroy(); this.hpBar.destroy(); this.alive=false; }
}

export class Ship {
  constructor(scene){
    this.scene=scene; this.alive=false;
    this.container=scene.add.container(0,0).setDepth(30).setVisible(false);
    this.gfx=scene.add.graphics(); this.container.add(this.gfx);
    this.sprite=scene.add.image(0,0,'__DEFAULT').setVisible(false); this.container.add(this.sprite); this.useSprite=false;
    this.hpBg=scene.add.graphics(); this.hpBar=scene.add.graphics(); this.container.add([this.hpBg,this.hpBar]);
    this.wake=scene.add.graphics().setDepth(29);
    this.angle=0; this.lastFire=0; this.flashUntil=0;
  }
  spawn(type,x,y,hpMul,dmgMul,order){
    const c=SHIP_TYPES[type]; this.cfg=c; this.type=type; this.x=x; this.y=y;
    this.maxHp=Math.round(c.hp*hpMul); this.hp=this.maxHp; this.dmg=Math.round(c.dmg*dmgMul);
    this.speed=c.speed*GAMECFG.waves.enemySpeedMul; this.size=c.size; this.alive=true; this.spawnOrder=order; this.lastFire=0;
    this.stuckTime=0; this.prevProg=Infinity; this.insideShield=false; this.turnSign=(order%2?1:-1); this.laneOff=(((order*53)%9)-4); this.haltUntil=0;
    this.angle=Math.atan2(this.scene.base.y-y,this.scene.base.x-x);
    this.container.setVisible(true).setScale(0);
    this.scene.tweens.add({targets:this.container,scale:1,duration:200,ease:'Back.easeOut'});
    this._draw();
  }
  _draw(){
    const _k='ship_'+this.type;
    if(this.scene.textures.exists(_k)){
      this.useSprite=true; this.gfx.clear();
      this.sprite.setTexture(_k).setVisible(true).setOrigin(0.5);
      const _src=this.scene.textures.get(_k).getSourceImage();
      this.sprite.setScale((this.size*this.cfg.len*1.75)/Math.max(1,_src.height));
      return;
    }
    this.useSprite=false; this.sprite.setVisible(false);
    const g=this.gfx; g.clear(); const c=this.cfg; const s=this.size, L=s*c.len, W=s*1.15;
    const hull=c.colDk||COL.enemyDk, deck=c.deck||COL.enemyDeck, lite=c.col||COL.enemy;
    g.fillStyle(COL.shadow,0.32); g.fillEllipse(3,4,L*1.05,W*1.05);
    g.fillStyle(hull,1);
    g.beginPath(); g.moveTo(L*0.62,0);
    g.lineTo(L*0.30,-W*0.5); g.lineTo(-L*0.55,-W*0.48); g.lineTo(-L*0.62,-W*0.30);
    g.lineTo(-L*0.62,W*0.30); g.lineTo(-L*0.55,W*0.48); g.lineTo(L*0.30,W*0.5); g.closePath(); g.fillPath();
    g.fillStyle(deck,1);
    g.beginPath(); g.moveTo(L*0.52,0);
    g.lineTo(L*0.24,-W*0.36); g.lineTo(-L*0.5,-W*0.34); g.lineTo(-L*0.52,0); g.lineTo(-L*0.5,W*0.34); g.lineTo(L*0.24,W*0.36); g.closePath(); g.fillPath();
    if(this.type==='gunboat'){
      g.fillStyle(lite,1); g.fillRoundedRect(-L*0.05,-W*0.16,L*0.22,W*0.32,2);
      g.fillStyle(hull,1); g.fillCircle(L*0.32,0,2.4);
    } else if(this.type==='scout'){
      g.fillStyle(lite,1); g.fillRoundedRect(-L*0.12,-W*0.18,L*0.3,W*0.36,2);
      g.fillStyle(hull,1); g.fillCircle(L*0.4,0,2.2);
    } else if(this.type==='destroyer'){
      g.fillStyle(lite,1); g.fillCircle(L*0.34,0,3); g.fillCircle(-L*0.28,0,3);
      g.fillStyle(deck,1); g.fillRoundedRect(-L*0.1,-W*0.2,L*0.26,W*0.4,2);
      g.fillStyle(hull,1); g.fillRect(L*0.04,-2.5,4,5);
    } else if(this.type==='cruiser'){
      g.fillStyle(deck,1); g.fillRoundedRect(-L*0.05,-W*0.22,L*0.24,W*0.44,2);
      g.fillStyle(COL.gold,1); for(let i=0;i<3;i++){ g.fillRect(L*0.22+i*5,-W*0.2,4,W*0.4); }
      g.fillStyle(hull,1); g.fillCircle(-L*0.32,0,3);
      g.lineStyle(1.4,lite,1); g.lineBetween(0,-W*0.2,0,-W*0.5);
    } else if(this.type==='battleship'){
      g.fillStyle(lite,1); g.fillCircle(L*0.36,0,4); g.fillCircle(L*0.16,0,4); g.fillCircle(-L*0.34,0,4);
      g.fillStyle(deck,1); g.fillRoundedRect(-L*0.06,-W*0.24,L*0.2,W*0.48,3);
      g.fillStyle(hull,1); g.fillRect(-L*0.14,-3,5,6); g.fillRect(-L*0.02,-3,5,6);
      g.fillStyle(lite,1); g.fillRect(L*0.02,-1.5,L*0.12,3);
    } else { 
      g.fillStyle(deck,1); g.fillRoundedRect(-L*0.5,-W*0.42,L*1.0,W*0.84,4);
      g.fillStyle(COL.white,0.5); g.fillRect(-L*0.42,-1,L*0.84,2);
      g.fillStyle(COL.white,0.32); for(let i=0;i<4;i++){ g.fillRect(-L*0.36+i*L*0.22,-1,L*0.08,1.2); }
      g.fillStyle(hull,1); g.fillRoundedRect(L*0.12,W*0.16,L*0.16,W*0.22,2);
      g.fillStyle(lite,1); g.fillRect(L*0.18,-W*0.34,2,W*0.14);
      g.fillStyle(COL.white,0.5); g.fillTriangle(-L*0.22,-W*0.16,-L*0.1,-W*0.2,-L*0.1,-W*0.12); g.fillTriangle(L*0.0,-W*0.02,L*0.12,-W*0.06,L*0.12,W*0.02);
    }
  }
  _drawHp(){
    const w=this.size*2.2,h=3.6,yo=-this.size*this.cfg.len*0.5-7;
    this.hpBg.clear(); this.hpBar.clear(); if(this.hp>=this.maxHp) return;
    const f=Phaser.Math.Clamp(this.hp/this.maxHp,0,1); const col=f>0.5?COL.green:(f>0.25?COL.gold:COL.red);
    this.hpBar.fillStyle(col,1); this.hpBar.fillRoundedRect(-w/2,yo,Math.max(2,w*f),h,1.5);
  }
  damage(a,src){ if(!this.alive) return; a=a*0.85; this.hp-=a; this.flashUntil=this.scene.time.now+70; this.scene.fx.damageNumber(this.x,this.y-this.size,Math.round(a)); if(this.hp<=0) this.die(); }
  die(){ if(!this.alive) return; this.alive=false; this.scene.fx.explode(this.x,this.y,this.size); SFX.explode(); const gained=this.scene.addGold(this.cfg.gold); this.scene.fx.floatGold(this.x,this.y-this.size,'+'+gained,CSS(COL.gold)); this.scene.addScore(this.cfg.score||0,this.x,this.y); this.scene.fx.shake(Math.min(0.013,0.003+this.size*0.00025),70); this.scene.fx.flashCircle(this.x,this.y,this.size*1.7,0xffd98a); this.container.setVisible(false); this.wake.clear(); this.scene.onShipKilled(this); }
  update(time,dt){
    if(!this.alive) return; const scene=this.scene; const baseObj=scene.base;
    
    
    const baseShield=(scene.time.now<baseObj.shieldUntil);
    let fireTarget=baseObj, ftRad=(baseShield?baseObj.shieldR:baseObj.radius); let best=this.cfg.range+24, chosen=null;
    const ts=scene.turrets;
    for(let i=0;i<ts.length;i++){ const t=ts[i]; if(!t.alive) continue; const d=Phaser.Math.Distance.Between(this.x,this.y,t.x,t.y)-t._radius(); if(d<best){ best=d; chosen=t; } }
    if(chosen){ fireTarget=chosen; ftRad=chosen._radius(); }
    this.target=fireTarget;
    
    
    if(this.insideShield&&!baseShield) this.insideShield=false; const trapped=this.insideShield&&baseShield; const _trapR=baseObj.radius+Math.max(46,(baseObj.shieldR-baseObj.radius)*0.55); const standoff=trapped?_trapR:(baseShield?(baseObj.shieldR+this.size+6):(baseObj.radius+(GAMECFG.allies.minEnemyDistance||86)));
    const dtb=Phaser.Math.Distance.Between(this.x,this.y,baseObj.x,baseObj.y);
    let dx=baseObj.x-this.x,dy=baseObj.y-this.y; const dl=Math.hypot(dx,dy)||1; dx/=dl; dy/=dl;
    const inRange=dtb<(standoff+4);
    if(inRange){ dx=0; dy=0; }
    const fdist=Phaser.Math.Distance.Between(this.x,this.y,fireTarget.x,fireTarget.y);
    const canFire=fdist<(this.cfg.range+ftRad);
    
    const goalDist=Phaser.Math.Distance.Between(this.x,this.y,baseObj.x,baseObj.y);
    if(!inRange){ if(goalDist<this.prevProg-0.4){ this.prevProg=goalDist; this.stuckTime=0; } else { this.stuckTime+=dt; } }
    else { this.stuckTime=0; this.prevProg=goalDist; }
    const stuckK=Phaser.Math.Clamp(this.stuckTime/1400,0,3); const ts0=this.turnSign||1;
    
    let ax=0,ay=0,tnx=0,tny=0; const obs=scene.obstacles;
    for(let i=0;i<obs.length;i++){ const o=obs[i]; const orr=o.r*1.12; const odx=this.x-o.x,ody=this.y-o.y; const od=Math.hypot(odx,ody)||0.01; const safe=orr+this.size*(this.cfg.len*0.42+0.58)+46; if(od<safe){ const f=(safe-od)/safe; const nx=odx/od,ny=ody/od; ax+=nx*f*3.8; ay+=ny*f*3.8; let cross=nx*dy-ny*dx; let sgn=cross>0?1:-1; if(Math.abs(cross)<0.2) sgn=ts0; tnx+=(-ny)*sgn*f*1.3; tny+=(nx)*sgn*f*1.3; } }
    const trs=scene.turrets;
    for(let i=0;i<trs.length;i++){ const o=trs[i]; if(!o.alive) continue; const orr=o._radius(); const odx=this.x-o.x,ody=this.y-o.y; const od=Math.hypot(odx,ody)||0.01; const safe=orr+this.size*(this.cfg.len*0.42+0.58)+24; if(od<safe){ const f=(safe-od)/safe; const nx=odx/od,ny=ody/od; ax+=nx*f*4.2; ay+=ny*f*4.2; let cross=nx*dy-ny*dx; let sgn=cross>0?1:-1; if(Math.abs(cross)<0.2) sgn=ts0; tnx+=(-ny)*sgn*f*1.4; tny+=(nx)*sgn*f*1.4; } }
    
    const near=scene.shipGrid.query(this.x,this.y,80); let lead=0, blocked=false;
    for(let i=0;i<near.length;i++){
      const s=near[i]; if(s===this||!s.alive) continue;
      const sdx=this.x-s.x,sdy=this.y-s.y;
      const sd=Math.hypot(sdx,sdy);
      const myLen=this.size*(this.cfg.len*0.45+0.55);
      const otherLen=s.size*(s.cfg.len*0.45+0.55);
      const minSep=myLen+otherLen+12;
      if(sd<minSep&&sd>0.01){
        const f=(minSep-sd)/minSep;
        const _pushStr=6.0;
        ax+=(sdx/sd)*f*_pushStr; ay+=(sdy/sd)*f*_pushStr;
        const hardDist=this.size*(this.cfg.len*0.35+0.45)+s.size*(s.cfg.len*0.35+0.45);
        if(sd<hardDist){
          const _hard=(hardDist-sd)/2;
          this.x+=sdx/sd*_hard; this.y+=sdy/sd*_hard;
          s.x-=sdx/sd*_hard; s.y-=sdy/sd*_hard;
        }
      }
      const ahead=((s.x-this.x)*dx+(s.y-this.y)*dy)/(sd||1);
      const trailGap=this.size*(this.cfg.len*0.5)+s.size*(s.cfg.len*0.5)+38;
      if(sd>0.01&&sd<trailGap&&ahead>0.55&&Phaser.Math.Distance.Between(s.x,s.y,baseObj.x,baseObj.y)<dtb){
        lead=Math.max(lead,Phaser.Math.Clamp(1-(sd-(this.size+s.size))/(trailGap-(this.size+s.size)),0,1));
        if(sd<this.size*(this.cfg.len*0.5)+s.size*(s.cfg.len*0.5)+18) blocked=true;
      }
    }
    
    const laneK=(this.laneOff||0)*Phaser.Math.Clamp((dtb-standoff)/240,0,1)*0.055;
    const lpx=-dy*laneK, lpy=dx*laneK;
    const repW=1/(1+stuckK*0.5), tanW=1.15+stuckK*1.6;
    let mvx=dx+lpx+ax*repW+tnx*tanW, mvy=dy+lpy+ay*repW+tny*tanW;
    const ml=Math.hypot(mvx,mvy)||1; mvx/=ml; mvy/=ml;
    
    if(blocked) this.haltUntil=Math.max(this.haltUntil||0,time+140);
    if(lead>0.4) this.stuckTime=Math.min(this.stuckTime,300);
    const halted=blocked||(time<(this.haltUntil||0));
    const throttle=inRange?0.10:(halted?0:Phaser.Math.Clamp((1-lead*0.9)*(1+stuckK*0.18),0.04,1.4));
    const sp=this.speed*throttle*scene.gameSpeed*(dt/1000);
    if(throttle>0&&(!inRange||ax||ay)){ this.x+=mvx*sp; this.y+=mvy*sp; }
    for(let oi=0;oi<obs.length;oi++){ const oo=obs[oi]; const kdx=this.x-oo.x,kdy=this.y-oo.y; const kd=Math.hypot(kdx,kdy)||0.01; const mind=oo.r*1.12+this.size*0.6; if(kd<mind){ this.x=oo.x+(kdx/kd)*mind; this.y=oo.y+(kdy/kd)*mind; } }
    for(let oi=0;oi<trs.length;oi++){ const oo=trs[oi]; if(!oo.alive) continue; const kdx=this.x-oo.x,kdy=this.y-oo.y; const kd=Math.hypot(kdx,kdy)||0.01; const mind=oo._radius()+this.size*(this.cfg.len*0.42+0.58); if(kd<mind){ this.x=oo.x+(kdx/kd)*mind; this.y=oo.y+(kdy/kd)*mind; } }
    { const bdx=this.x-baseObj.x,bdy=this.y-baseObj.y; const bd=Math.hypot(bdx,bdy)||0.01; if(bd<standoff){ this.x=baseObj.x+(bdx/bd)*standoff; this.y=baseObj.y+(bdy/bd)*standoff; } else if(trapped){ const maxR=baseObj.shieldR-this.size*0.5; if(bd>maxR){ this.x=baseObj.x+(bdx/bd)*maxR; this.y=baseObj.y+(bdy/bd)*maxR; } } }
    
    if(this.stuckTime>7000){ this.die(); return; }
    const _gx=baseObj.x-this.x,_gy=baseObj.y-this.y; const _fang=(Math.abs(_gx)+Math.abs(_gy)>0.001)?Math.atan2(_gy,_gx):this.angle; this.angle=Phaser.Math.Angle.RotateTo(this.angle,_fang,0.05);
    this.container.setPosition(this.x,this.y); if(this.useSprite){ this.sprite.setRotation(this.angle+Math.PI/2); } else { this.gfx.setRotation(this.angle); }
    if(canFire&&time-this.lastFire>=this.cfg.fireRate){ this.lastFire=time; const heavy=(this.type==='cruiser'||this.type==='carrier'); const proj=heavy?'emissile':'eshell'; let _st=this.target; if(chosen){ const _br=Phaser.Math.Distance.Between(this.x,this.y,baseObj.x,baseObj.y)<(this.cfg.range+(baseShield?baseObj.shieldR:baseObj.radius)); _st=(_br&&Math.random()<0.10)?baseObj:chosen; } { let _fb=null,_fd=this.cfg.range+20; for(let fi=0;fi<scene.friendlies.length;fi++){ const _fr=scene.friendlies[fi]; if(!_fr.alive) continue; const _dd=Phaser.Math.Distance.Between(this.x,this.y,_fr.x,_fr.y); if(_dd<_fd){ _fd=_dd; _fb=_fr; } } if(_fb&&Math.random()<0.5) _st=_fb; } const _pr=scene.spawnProjectile(proj,this.x,this.y,_st,this.dmg,heavy?260:360,0,false); if(_pr&&this.insideShield) _pr.bypassShield=true; }
    { const _fa=scene.time.now<this.flashUntil?0.45:1; if(this.useSprite) this.sprite.setAlpha(_fa); else this.gfx.setAlpha(_fa); }
    this._drawHp();
    this.wake.clear();
    if(!inRange){ const L=this.size*this.cfg.len; const wx=this.x-Math.cos(this.angle)*L*0.5,wy=this.y-Math.sin(this.angle)*L*0.5; this.wake.fillStyle(COL.white,0.10); this.wake.fillCircle(wx,wy,this.size*0.6); this.wake.fillStyle(COL.white,0.05); this.wake.fillCircle(wx-Math.cos(this.angle)*8,wy-Math.sin(this.angle)*8,this.size*0.45); }
  }
}

export class Projectile {
  constructor(scene){ this.scene=scene; this.alive=false; this.gfx=scene.add.graphics().setDepth(45).setVisible(false); }
  fire(kind,x,y,target,dmg,speed,splash,fromPlayer){
    this.kind=kind; this.x=x; this.y=y; this.target=target; this.dmg=dmg; this.speed=speed; this.splash=splash; this.fromPlayer=fromPlayer; this.alive=true; this.life=4000;
    const a=Math.atan2(target.y-y,target.x-x); this.vx=Math.cos(a)*speed; this.vy=Math.sin(a)*speed; this.angle=a;
    this.tracking=(kind==='missile'||kind==='emissile'); this.bypassShield=false; this.gfx.setVisible(true);
  }
  _draw(){ const g=this.gfx; g.clear();
    if(this.kind==='missile'||this.kind==='emissile'){ const c=this.fromPlayer?0xff3b30:COL.enemy; g.fillStyle(c,1); g.fillRoundedRect(-5,-2,10,4,2); g.fillStyle(0xffd98a,1); g.fillCircle(5,0,2); g.fillStyle(0xff9a3c,0.8); g.fillCircle(-6,0,2.4); this.gfx.setRotation(this.angle); }
    else if(this.kind==='flak'){ g.fillStyle(0xc6912f,1); g.fillCircle(0,0,2.6); g.fillStyle(0xf0c46a,0.7); g.fillCircle(0,0,1.2); }
    else if(this.kind==='eshell'){ g.fillStyle(COL.enemy,1); g.fillCircle(0,0,2.6); g.fillStyle(0xffd0cc,0.6); g.fillCircle(0,0,1.2); }
    else if(this.kind==='shell'){ g.fillStyle(0xffd23f,1); g.fillCircle(0,0,2.8); g.fillStyle(0xfff0a8,0.85); g.fillCircle(0,0,1.3); }
    else { g.fillStyle(COL.white,1); g.fillCircle(0,0,2.8); g.fillStyle(COL.cyan,0.5); g.fillCircle(0,0,1.4); }
  }
  update(dt){
    if(!this.alive) return; const f=(dt/1000)*this.scene.gameSpeed; this.life-=dt*this.scene.gameSpeed;
    if(this.tracking&&this.target&&this.target.alive!==false&&(this.target.hp===undefined||this.target.hp>0)){ const a=Math.atan2(this.target.y-this.y,this.target.x-this.x); this.angle=Phaser.Math.Angle.RotateTo(this.angle,a,0.12); this.vx=Math.cos(this.angle)*this.speed; this.vy=Math.sin(this.angle)*this.speed; }
    this.x+=this.vx*f; this.y+=this.vy*f; this.gfx.setPosition(this.x,this.y); this._draw();
    if(this.life<=0||this.x<-40||this.y<-40||this.x>this.scene.worldW+40||this.y>this.scene.worldH+40){ this.kill(); return; }
    if(this.fromPlayer){ const t=this.target;
      if(t&&t.alive){ if(Phaser.Math.Distance.Between(this.x,this.y,t.x,t.y)<t.size+5) this._impact(); }
      else { const near=this.scene.shipGrid.query(this.x,this.y,14); for(let i=0;i<near.length;i++){ if(near[i].alive&&Phaser.Math.Distance.Between(this.x,this.y,near[i].x,near[i].y)<near[i].size+5){ this.target=near[i]; this._impact(); break; } } }
    } else {
      const _b=this.scene.base;
      if(!this.bypassShield&&this.scene.time.now<_b.shieldUntil&&Phaser.Math.Distance.Between(this.x,this.y,_b.x,_b.y)<=_b.shieldR){ _b.damage(this.dmg); this.scene.fx.hit(this.x,this.y,COL.cyan); this.kill(); return; }
      const t=this.target;
      if(t&&t.alive!==false&&(t.hp===undefined||t.hp>0)){
        const rad=((t===this.scene.base)?t.radius:(t._radius?t._radius():12))+4;
        if(Phaser.Math.Distance.Between(this.x,this.y,t.x,t.y)<rad){ t.damage(this.dmg,null); this.scene.fx.hit(this.x,this.y,COL.red); this.kill(); }
      } else {
        const b=this.scene.base; if(Phaser.Math.Distance.Between(this.x,this.y,b.x,b.y)<b.radius+4){ b.damage(this.dmg); this.scene.fx.hit(this.x,this.y,COL.red); this.kill(); }
      }
    }
  }
  _impact(){
    if(this.splash>0){ this.scene.fx.explode(this.x,this.y,this.splash*0.4); SFX.explode(); const near=this.scene.shipGrid.query(this.x,this.y,this.splash); for(let i=0;i<near.length;i++){ const s=near[i]; if(s.alive&&Phaser.Math.Distance.Between(this.x,this.y,s.x,s.y)<=this.splash) s.damage(this.dmg,this); } }
    else { if(this.target&&this.target.alive) this.target.damage(this.dmg,this); this.scene.fx.hit(this.x,this.y,COL.cyan); }
    this.kill();
  }
  kill(){ this.alive=false; this.gfx.setVisible(false); this.scene.freeProjectile(this); }
}

export class FX {
  constructor(scene){ this.scene=scene; }
  shake(i,d){ const _b=this.scene.base; const _hpCritical=_b&&_b.hp<250; this.scene.cameras.main.shake(d,i*(_hpCritical?0.6:0.15),false); }
  muzzle(x,y,c){ const g=this.scene.add.graphics().setDepth(46); g.fillStyle(c,0.9); g.fillCircle(x,y,5); this.scene.tweens.add({targets:g,alpha:0,duration:120,onComplete:()=>g.destroy()}); }
  tracer(x1,y1,x2,y2,c){ const g=this.scene.add.graphics().setDepth(46); g.lineStyle(1.4,c,0.8); g.lineBetween(x1,y1,x2,y2); this.scene.tweens.add({targets:g,alpha:0,duration:90,onComplete:()=>g.destroy()}); }
  hit(x,y,c){ const g=this.scene.add.graphics().setDepth(46); g.fillStyle(c,0.9); g.fillCircle(x,y,4); this.scene.tweens.add({targets:g,alpha:0,scale:2,duration:180,onComplete:()=>g.destroy()}); this.splash(x,y); }
  splash(x,y){ for(let i=0;i<3;i++){ const g=this.scene.add.graphics().setDepth(28); g.fillStyle(COL.white,0.4); g.fillCircle(0,0,2); g.setPosition(x,y); const a=Math.random()*Math.PI*2,d=8+Math.random()*10; this.scene.tweens.add({targets:g,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,alpha:0,duration:280,onComplete:()=>g.destroy()}); } }
  ring(x,y,r,c){ const g=this.scene.add.graphics().setDepth(46); this.scene.tweens.add({targets:{p:0},p:1,duration:360,onUpdate:(tw,o)=>{ g.clear(); g.lineStyle(3,c,1-o.p); g.strokeCircle(x,y,r*0.4+r*0.9*o.p); },onComplete:()=>g.destroy()}); }
  flashCircle(x,y,r,c){ const g=this.scene.add.graphics().setDepth(44); g.fillStyle(c,0.5); g.fillCircle(x,y,r); this.scene.tweens.add({targets:g,alpha:0,duration:200,onComplete:()=>g.destroy()}); }
  explode(x,y,size){ const sc=this.scene; const S=Math.min(size,46);
    const flash=sc.add.graphics().setDepth(49).setPosition(x,y); flash.fillStyle(0xffffff,0.95); flash.fillCircle(0,0,S*0.95); sc.tweens.add({targets:flash,alpha:0,scaleX:1.7,scaleY:1.7,duration:130,ease:'Quad.easeOut',onComplete:()=>flash.destroy()});
    const core=sc.add.graphics().setDepth(48).setPosition(x,y); core.fillStyle(0xfff2c0,1); core.fillCircle(0,0,S*0.62); core.fillStyle(0xffd070,1); core.fillCircle(0,0,S*0.48); core.fillStyle(0xff8a2e,0.95); core.fillCircle(0,0,S*0.32); sc.tweens.add({targets:core,alpha:0,scaleX:2.9,scaleY:2.9,duration:340,ease:'Quad.easeOut',onComplete:()=>core.destroy()});
    const fb=sc.add.graphics().setDepth(47).setPosition(x,y); fb.fillStyle(0xff6a22,0.95); fb.fillCircle(0,0,S*0.8); fb.fillStyle(0xffae5a,0.8); fb.fillCircle(-S*0.2,-S*0.2,S*0.45); fb.fillStyle(0xd23a1c,0.75); fb.fillCircle(S*0.22,S*0.2,S*0.4); sc.tweens.add({targets:fb,alpha:0,scaleX:2.3,scaleY:2.3,duration:480,ease:'Quad.easeOut',onComplete:()=>fb.destroy()});
    const sw=sc.add.graphics().setDepth(46).setPosition(x,y); sc.tweens.add({targets:{p:0},p:1,duration:300,onUpdate:(tw,o)=>{ sw.clear(); sw.lineStyle(Math.max(1,3*(1-o.p)),0xffffff,0.85*(1-o.p)); sw.strokeCircle(0,0,S*0.6+S*2.6*o.p); },onComplete:()=>sw.destroy()});
    this.ring(x,y,S*2.6,0xffd98a); sc.time.delayedCall(70,()=>{ if(this.ring) this.ring(x,y,S*3.4,0xff7a2c); });
    const sn=Math.min(26,12+Math.floor(S*0.6)); for(let i=0;i<sn;i++){ const sp=sc.add.graphics().setDepth(48).setPosition(x,y); const a=Math.random()*Math.PI*2,dist=S*1.4+Math.random()*S*2.6,len=4+Math.random()*7; const tx=x+Math.cos(a)*dist,ty=y+Math.sin(a)*dist; sp.lineStyle(1.6+Math.random()*1.2,i%3?0xffd070:0xff7a33,1); sp.lineBetween(0,0,-Math.cos(a)*len,-Math.sin(a)*len); sp.fillStyle(0xfff2c0,1); sp.fillCircle(0,0,1+Math.random()*1.6); sc.tweens.add({targets:sp,x:tx,y:ty,alpha:0,duration:360+Math.random()*300,ease:'Quad.easeOut',onComplete:()=>sp.destroy()}); }
    const dn=Math.min(10,4+Math.floor(S*0.25)); for(let i=0;i<dn;i++){ const ch=sc.add.graphics().setDepth(47).setPosition(x,y); ch.fillStyle(0x2a3038,1); const w=2+Math.random()*3; ch.fillRect(-w/2,-w/2,w,w*1.4); const a=Math.random()*Math.PI*2,dist=S*0.8+Math.random()*S*1.8,tx=x+Math.cos(a)*dist,ty=y+Math.sin(a)*dist+S*0.6; sc.tweens.add({targets:ch,x:tx,y:ty,rotation:(Math.random()-0.5)*8,alpha:0,duration:560+Math.random()*340,ease:'Quad.easeIn',onComplete:()=>ch.destroy()}); }
    const smn=Math.min(7,3+Math.floor(S*0.2)); for(let i=0;i<smn;i++){ const sm=sc.add.graphics().setDepth(45).setPosition(x+(Math.random()-0.5)*S*0.6,y+(Math.random()-0.5)*S*0.6); const col=Math.random()<0.5?0x4a5460:0x33414c; sm.fillStyle(col,0.55); sm.fillCircle(0,0,S*0.35+Math.random()*S*0.3); const a=-Math.PI/2+(Math.random()-0.5)*1.2,dist=S*0.7+Math.random()*S*1.4; sc.tweens.add({targets:sm,x:sm.x+Math.cos(a)*dist,y:sm.y+Math.sin(a)*dist-S*0.5,alpha:0,scaleX:2.6,scaleY:2.6,duration:680+Math.random()*360,ease:'Quad.easeOut',onComplete:()=>sm.destroy()}); } }
  damageNumber(x,y,n){ const t=this.scene.add.text(x,y,'-'+n,{fontFamily:'Space Grotesk',fontSize:'15px',fontStyle:'bold',color:'#ffe08a',stroke:'#05111d',strokeThickness:3}).setOrigin(0.5).setDepth(60); this.scene.tweens.add({targets:t,y:y-26,alpha:0,duration:620,ease:'Cubic.easeOut',onComplete:()=>t.destroy()}); }
  floatText(x,y,str,color){ const t=this.scene.add.text(x,y,str,{fontFamily:'Space Grotesk',fontSize:'13px',fontStyle:'bold',color:color,stroke:'#05111d',strokeThickness:3}).setOrigin(0.5).setDepth(61); this.scene.tweens.add({targets:t,y:y-30,alpha:0,duration:900,ease:'Cubic.easeOut',onComplete:()=>t.destroy()}); }
  floatGold(x,y,str,color){
    const s=this.scene; let finalStr=str; if(s.coinDoublerActive&&str.indexOf('+')===0) finalStr+=' (2X)';
    const c=s.add.container(x,y).setDepth(62);
    const t=s.add.text(0,0,finalStr,{fontFamily:'Space Grotesk',fontSize:'19px',fontStyle:'bold',color:'#ffe27a',stroke:'#3a2400',strokeThickness:5}).setOrigin(0,0.5);
    let w=t.width; c.add(t);
    if(s.textures.exists('icon_gold')){ const ic=s.add.image(-11,0,'icon_gold'); const src=s.textures.get('icon_gold').getSourceImage(); ic.setScale(18/Math.max(src.width,src.height)); c.add(ic); w+=20; t.x=2; s.tweens.add({targets:ic,scaleX:{from:ic.scaleX,to:ic.scaleX*0.2},duration:170,yoyo:true,repeat:2}); }
    c.x=x-w/2+8; c.setScale(0.3).setAlpha(0);
    s.tweens.add({targets:c,scale:1.18,alpha:1,duration:150,ease:'Back.easeOut',onComplete:()=>{ s.tweens.add({targets:c,scale:1,duration:120}); }});
    s.tweens.add({targets:c,y:y-44,x:c.x+(Math.random()-0.5)*26,alpha:0,duration:900,delay:200,ease:'Cubic.easeOut',onComplete:()=>c.destroy()});
    sparkBurst(s,x,y,{count:5,speed:34,life:420,size:2.2,color:0xffe27a,gravity:30});
  }
  healPop(x,y,r){ this.ring(x,y,r+16,COL.green); const g=this.scene.add.graphics().setDepth(37); g.fillStyle(COL.green,0.4); g.fillCircle(x,y,r); this.scene.tweens.add({targets:g,alpha:0,scale:1.45,duration:400,ease:'Cubic.easeOut',onComplete:()=>g.destroy()}); for(let i=0;i<5;i++){ const p=this.scene.add.text(x+(Math.random()-0.5)*r*1.3,y+(Math.random()-0.4)*8,'+',{fontFamily:'Space Grotesk',fontSize:((14+Math.random()*8)|0)+'px',fontStyle:'bold',color:'#86ffb0',stroke:'#05111d',strokeThickness:3}).setOrigin(0.5).setDepth(64).setAlpha(0).setScale(0.5); this.scene.tweens.add({targets:p,alpha:1,scale:1,duration:140,ease:'Back.easeOut'}); this.scene.tweens.add({targets:p,y:p.y-30-Math.random()*20,alpha:0,delay:140+i*45,duration:600,ease:'Cubic.easeOut',onComplete:()=>p.destroy()}); } }
  scorePop(x,y,n){ const t=this.scene.add.text(x,y,'+'+n,{fontFamily:'Space Grotesk',fontSize:'18px',fontStyle:'bold',color:'#ffe9a8',stroke:'#05111d',strokeThickness:4}).setOrigin(0.5).setDepth(63).setScale(0.4); const sc=this.scene; sc.tweens.add({targets:t,scale:1,duration:160,ease:'Back.easeOut'}); sc.tweens.add({targets:t,y:y-36,alpha:0,delay:200,duration:560,ease:'Cubic.easeOut',onComplete:()=>t.destroy()}); }
}

export class WaveManager {
  constructor(scene){ this.scene=scene; this.wave=0; this.spawnQueue=[]; this.spawnTimer=0; this.interWave=GAMECFG.waves.firstWaveDelayMs; this.state='prep'; this.timer=this.interWave; this.aliveCount=0; this.order=0; this.spawnEdges=[]; }
  start(){ this._planEdges(); this.state='prep'; this.timer=this.interWave; this.scene.ui.updateWave(); this.scene.time.delayedCall(this.interWave,()=>{ if(this.state==='prep'&&this.wave===0&&!this.scene.gameIsOver) this.nextWave(); }); }
  _planEdges(){ this.spawnEdges=[]; const n=1+Math.floor(Math.random()*2); for(let i=0;i<n;i++) this.spawnEdges.push(Math.floor(Math.random()*4)); }
  nextWave(){
    if(this.scene.ui.hideReady) this.scene.ui.hideReady();
    this.wave++; this.state='spawning'; this.spawnQueue=[]; this.spawnTimer=0; const w=this.wave;
    const hpMul=(1+(w/5))*GAMECFG.waves.enemyHpMul, dmgMul=(1+(w-1)*0.10)*GAMECFG.waves.enemyDmgMul; const total=Math.max(1,Math.round(waveShipCount(w)*GAMECFG.waves.enemyCountMul));
    for(let i=0;i<total;i++){ let type; const r=Math.random();
      if(w>=7&&r<0.04+Math.min(0.12,(w-7)*0.012)) type='carrier';
      else if(w>=5&&r<0.16+Math.min(0.16,(w-5)*0.02)) type='battleship';
      else if(w>=3&&r<0.34) type='cruiser';
      else if(w>=2&&r<0.52) type='destroyer';
      else if(r<0.72) type='scout';
      else type='gunboat';
      this.spawnQueue.push({type,hpMul,dmgMul});
    }
    this.spawnQueue.sort((a,b)=>(SHIP_TYPES[b.type].speed-SHIP_TYPES[a.type].speed));
    this.aliveCount=this.spawnQueue.length; this.scene.ui.announce('WAVE '+w); SFX.wave(); this.scene.ui.updateWave(); this.scene.ui.refreshBuild();
    if(this.scene.coinDoublerActive){
      if(this.scene.coinDoublerTween) this.scene.coinDoublerTween.remove();
      this.scene.coinDoublerTween = this.scene.tweens.add({
        targets: this.scene.ui.goldText,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.scene.ui.announce('2X GOLD ACTIVE!', COL.gold);
    }
  }
  onKilled(){ this.aliveCount--; if(this.aliveCount<=0&&this.spawnQueue.length===0&&this.state==='spawning'){ this.state='prep'; this.timer=this.interWave; this._planEdges(); this.scene.cancelBuild(); const wasDoubled=this.scene.coinDoublerActive; const bonus=GAMECFG.waves.waveBonusBase+this.wave*GAMECFG.waves.waveBonusPerWave; const finalGained=this.scene.addGold(bonus); if(this.scene.ui.showReady) this.scene.ui.showReady(); let healed=0; this.scene.turrets.forEach((t,i)=>{ if(t.alive&&t.hp<t.maxHp){ t.hp=t.maxHp; t._drawHpBar(); this.scene.time.delayedCall(i*80,()=>{ if(!t.alive) return; this.scene.fx.healPop(t.x,t.y,t._radius()+8); this.scene.tweens.add({targets:t.container,scale:{from:1.32,to:1},duration:340,ease:'Back.easeOut'}); }); healed++; } }); if(healed) SFX.upgrade(); const b=this.scene.base; if(b.hp<b.maxHp){ b.repair(Math.round(b.maxHp*0.10)); this.scene.fx.healPop(b.x,b.y,b.radius+12); } this.scene.ui.waveCompleteBanner(this.wave,finalGained,wasDoubled,healed>0); this.scene.ui.refreshBuild(); } }
  update(time,dt){ const sdt=dt*this.scene.gameSpeed;
    if(this.state==='prep'){ if(this._prevState!=='prep'){ this._prevState='prep'; this.prepActivityAt=time; if(this.scene.ui&&this.scene.ui.setReadyUrgent) this.scene.ui.setReadyUrgent(false); } if(this.wave>=1&&!this.scene.gameIsOver){ const el=time-(this.prepActivityAt||time); if(el>=GAMECFG.waves.readyForceStartMs){ if(this.scene.ui&&this.scene.ui.hideReady) this.scene.ui.hideReady(); this.nextWave(); } else if(el>=GAMECFG.waves.readyUrgentMs){ if(this.scene.ui&&this.scene.ui.setReadyUrgent) this.scene.ui.setReadyUrgent(true); } } return; }
    this._prevState=this.state;
    if(this.spawnQueue.length>0){ this.spawnTimer-=sdt; if(this.spawnTimer<=0){ this.spawnTimer=waveSpawnGapMs(this.wave); this._spawn(this.spawnQueue.shift()); } }
    this.scene.ui.updateWave();
  }
  _spawn(s){ const edge=this.spawnEdges[Math.floor(Math.random()*this.spawnEdges.length)]; const W=this.scene.worldW,H=this.scene.worldH; let x,y; if(edge===0){x=Math.random()*W;y=-20;}else if(edge===1){x=W+20;y=Math.random()*H;}else if(edge===2){x=Math.random()*W;y=H+20;}else{x=-20;y=Math.random()*H;} this.scene.spawnShip(s.type,x,y,s.hpMul,s.dmgMul,this.order++); }
  timeLeftStr(){ return this.state==='prep'?Math.ceil(this.timer/1000)+'s':'-'; }
}

export class UIManager {
  constructor(scene){ this.scene=scene; this.build(); }
  get touch(){ return this.scene.isTouch; }
  build(){
    const s=this.scene; this.W=s.worldW; this.H=s.worldH; this.tf=this.touch?1.22:1; this.insetY=s.uiInsetY||0; this.insetX=s.uiInsetX||0;
    this.layer=s.add.container(0,0).setDepth(1000);
    this._topLeft(); this._topCenter(); this._topRight(); this._build(); this._control(); this._aimDock(); this._abilities(); this._minimap(); this._announce(); this._selection(); this._readyBtn(); this._menu();
    this.updateWave(); this.updateBaseHp(); this.updateResources(); this.updateScore();
  }
  relayout(){ const abSnap=(this.abilityButtons||[]).map(b=>({key:b.key,charges:b.charges,readyAt:b.readyAt})); try{ if(this.layer) this.layer.destroy(true); }catch(e){} this.build(); if(this.abilityButtons&&abSnap.length){ this.abilityButtons.forEach(b=>{ const p=abSnap.find(x=>x.key===b.key); if(p){ b.charges=p.charges; b.readyAt=p.readyAt; } }); this.refreshAbilities(); } this.refreshControls(); this.refreshBuild(); if(this.scene.wave&&this.scene.wave.state==='prep'&&this.showReady) this.showReady(); }
  panel(x,y,w,h,r,a){ const g=this.scene.add.graphics(); g.fillStyle(COL.shadow,0.35); g.fillRoundedRect(x+3,y+5,w,h,r); g.fillStyle(COL.panel,a==null?0.96:a); g.fillRoundedRect(x,y,w,h,r); g.lineStyle(1.5,COL.panelLite,0.85); g.strokeRoundedRect(x,y,w,h,r); this.layer.add(g); return g; }
  txt(x,y,str,size,color,bold,origin){ const t=this.scene.add.text(x,y,str,{fontFamily:'Space Grotesk',fontSize:size+'px',color:CSS(color==null?COL.text:color),fontStyle:bold?'bold':'normal'}); if(origin!=null) t.setOrigin(origin); this.layer.add(t); return t; }
  _iconImg(key,x,y,sz){
    let finalKey = key;
    if(!this.scene.textures.exists(finalKey)){
      if(key.startsWith('icon_') && this.scene.textures.exists(key.substring(5))){
        finalKey = key.substring(5);
      } else if(!key.startsWith('icon_') && this.scene.textures.exists('icon_' + key)){
        finalKey = 'icon_' + key;
      } else {
        return null;
      }
    }
    const im=this.scene.add.image(x,y,finalKey);
    const src=this.scene.textures.get(finalKey).getSourceImage();
    im.setScale(sz/Math.max(1,Math.max(src.width,src.height)));
    this.layer.add(im);
    return im;
  }
  icon(g,type,x,y,sz,color){ g.fillStyle(color,1);
    if(type==='heart'){ g.fillCircle(x-sz*0.22,y-sz*0.1,sz*0.3); g.fillCircle(x+sz*0.22,y-sz*0.1,sz*0.3); g.fillTriangle(x-sz*0.5,y,x+sz*0.5,y,x,y+sz*0.55); }
    else if(type==='gold'){ g.fillCircle(x,y,sz*0.5); g.fillStyle(0xffe9a8,1); g.fillCircle(x,y,sz*0.3); }
    else if(type==='gem'){ g.fillStyle(COL.gem,1); g.fillTriangle(x-sz*0.5,y-sz*0.15,x+sz*0.5,y-sz*0.15,x,y+sz*0.55); g.fillRect(x-sz*0.5,y-sz*0.3,sz,sz*0.18); }
    else if(type==='rocket'){ g.fillStyle(COL.rocket,1); g.fillRoundedRect(x-sz*0.16,y-sz*0.45,sz*0.32,sz*0.78,sz*0.16); g.fillTriangle(x-sz*0.16,y-sz*0.45,x+sz*0.16,y-sz*0.45,x,y-sz*0.7); g.fillStyle(COL.rocketDk,1); g.fillTriangle(x-sz*0.16,y+sz*0.18,x-sz*0.34,y+sz*0.42,x-sz*0.16,y+sz*0.42); g.fillTriangle(x+sz*0.16,y+sz*0.18,x+sz*0.34,y+sz*0.42,x+sz*0.16,y+sz*0.42); g.fillStyle(COL.white,1); g.fillCircle(x,y-sz*0.12,sz*0.1); }
    else if(type==='cannon'){ g.fillCircle(x,y+sz*0.1,sz*0.4); g.fillRect(x-sz*0.12,y-sz*0.5,sz*0.24,sz*0.55); }
    else if(type==='missile'){ g.fillRoundedRect(x-sz*0.15,y-sz*0.5,sz*0.3,sz,3); g.fillTriangle(x-sz*0.15,y+sz*0.5,x+sz*0.15,y+sz*0.5,x,y+sz*0.78); }
    else if(type==='laser'){ g.fillRect(x-sz*0.1,y-sz*0.5,sz*0.2,sz); g.fillStyle(COL.white,1); g.fillCircle(x,y-sz*0.5,sz*0.18); }
    else if(type==='aa'){ g.fillRect(x-sz*0.32,y-sz*0.45,sz*0.18,sz*0.9); g.fillRect(x+sz*0.14,y-sz*0.45,sz*0.18,sz*0.9); }
    else if(type==='tesla'){ g.fillTriangle(x+sz*0.12,y-sz*0.5,x-sz*0.34,y+sz*0.08,x+sz*0.02,y+sz*0.04); g.fillTriangle(x-sz*0.02,y-sz*0.04,x+sz*0.34,y-sz*0.08,x-sz*0.12,y+sz*0.5); }
    else if(type==='shield'){ g.fillTriangle(x,y-sz*0.5,x-sz*0.5,y-sz*0.25,x,y+sz*0.55); g.fillTriangle(x,y-sz*0.5,x+sz*0.5,y-sz*0.25,x,y+sz*0.55); }
    else if(type==='repair'){ g.fillRect(x-sz*0.5,y-sz*0.13,sz,sz*0.26); g.fillRect(x-sz*0.13,y-sz*0.5,sz*0.26,sz); }
    else if(type==='airstrike'){ g.fillTriangle(x,y-sz*0.5,x-sz*0.45,y+sz*0.4,x+sz*0.45,y+sz*0.4); g.fillStyle(COL.panel,1); g.fillCircle(x,y,sz*0.12); }
    else if(type==='navy'){ g.fillTriangle(x-sz*0.5,y,x+sz*0.46,y,x+sz*0.32,y+sz*0.22); g.fillRect(x-sz*0.5,y-sz*0.05,sz*0.86,sz*0.13); g.fillRect(x-sz*0.05,y-sz*0.5,sz*0.1,sz*0.5); g.fillStyle(COL.white,0.85); g.fillRect(x+sz*0.04,y-sz*0.4,sz*0.2,sz*0.14); }
    else if(type==='mine'){ for(let k=0;k<8;k++){ const a=k*Math.PI/4; g.fillTriangle(x+Math.cos(a)*sz*0.34,y+Math.sin(a)*sz*0.34,x+Math.cos(a)*sz*0.5,y+Math.sin(a)*sz*0.5,x+Math.cos(a+0.3)*sz*0.34,y+Math.sin(a+0.3)*sz*0.34); } g.fillCircle(x,y,sz*0.34); g.fillStyle(COL.gold,1); g.fillCircle(x,y,sz*0.12); }
    else if(type==='trophy'){ g.fillStyle(COL.gold,1); g.fillRoundedRect(x-sz*0.28,y-sz*0.45,sz*0.56,sz*0.4,sz*0.1); g.fillRect(x-sz*0.1,y-sz*0.05,sz*0.2,sz*0.3); g.fillRect(x-sz*0.26,y+sz*0.26,sz*0.52,sz*0.12); g.fillTriangle(x-sz*0.28,y-sz*0.42,x-sz*0.5,y-sz*0.32,x-sz*0.28,y-sz*0.1); g.fillTriangle(x+sz*0.28,y-sz*0.42,x+sz*0.5,y-sz*0.32,x+sz*0.28,y-sz*0.1); }
    else if(type==='2x'){ g.fillStyle(COL.gold,1); g.fillCircle(x,y,sz*0.45); g.lineStyle(2,0xffffff,1); g.strokeCircle(x,y,sz*0.45); }
    else if(type==='first'){ g.lineStyle(3.2,color||COL.cyan,1); for(let k=0;k<2;k++){ const ox=x-sz*0.32+k*sz*0.42; g.beginPath(); g.moveTo(ox-sz*0.2,y-sz*0.42); g.lineTo(ox+sz*0.22,y); g.lineTo(ox-sz*0.2,y+sz*0.42); g.strokePath(); } }
    else if(type==='strong'){ g.fillStyle(color||COL.gold,1); g.fillTriangle(x,y-sz*0.5,x-sz*0.4,y+sz*0.3,x+sz*0.4,y+sz*0.3); g.fillStyle(0xffffff,1); g.fillCircle(x,y+0.05*sz,sz*0.18); }
    else if(type==='close'){ g.lineStyle(2,color||COL.cyan,1); g.strokeCircle(x,y,sz*0.45); g.strokeCircle(x,y,sz*0.18); g.lineBetween(x-sz*0.6,y,x+sz*0.6,y); g.lineBetween(x,y-sz*0.6,x,y+sz*0.6); }
  }
  _topLeft(){ const x=14+this.insetX,y=14+this.insetY; const hb=this.scene.add.graphics(); hb.fillStyle(COL.shadow,0.45); hb.fillRoundedRect(x+1,y+2,44,44,13); hb.fillStyle(COL.panel,1); hb.fillRoundedRect(x,y,44,44,13); hb.fillStyle(COL.cyanDk,0.5); hb.fillRoundedRect(x,y,44,21,{tl:13,tr:13,bl:0,br:0}); hb.lineStyle(1.5,COL.cyan,0.85); hb.strokeRoundedRect(x,y,44,44,13); hb.fillStyle(COL.white,0.96); hb.fillRoundedRect(x+14,y+14,6,16,2); hb.fillRoundedRect(x+24,y+14,6,16,2); this.layer.add(hb);
    const hz=this.scene.add.zone(x,y,44,44).setOrigin(0).setInteractive(); hz.on('pointerdown',()=>this.toggleMenu()); this.layer.add(hz);
    this.waveText=this.txt(x+56,y+10,'WAVE 1',20,COL.text,true); this.waveText.setStroke(CSS(COL.shadow),5);
  }
  updateWave(){ const wv=this.scene.wave; const n=(wv&&wv.state==='prep')?wv.wave+1:(wv?wv.wave:1); this.waveText.setText('WAVE '+Math.max(1,n)); }
  updateScore(){ if(this.scoreText) this.scoreText.setText(''+this.scene.score); }
  _topCenter(){ const w=288,h=62,x=this.W/2-w/2,y=12+this.insetY;
    const g=this.scene.add.graphics(); this.layer.add(g); if(!this._iconImg('icon_heart',x+28,y+26,24)) this.icon(g,'heart',x+28,y+26,24,COL.red);
    this.hpX=x+52; this.hpY=y+18; this.hpW=w-72; this.hpH=16; this.hpR=7;
    this.hpG=this.scene.add.graphics(); this.layer.add(this.hpG);
    this.hpText=this.txt(x+w/2+16,y+48,'750 / 750',14,COL.text,true,0.5); this.hpText.setStroke(CSS(COL.shadow),4); this.hpText.setShadow(0,1,CSS(COL.cyan),9,false,true);
  }
  updateBaseHp(){ const b=this.scene.base; const g=this.hpG; const x=this.hpX,y=this.hpY,w=this.hpW,h=this.hpH,r=this.hpR; g.clear(); g.fillStyle(COL.shadow,0.55); g.fillRoundedRect(x-2,y-2,w+4,h+4,r+2); g.fillStyle(COL.panelEdge,1); g.fillRoundedRect(x,y,w,h,r); const f=Phaser.Math.Clamp(b.hp/b.maxHp,0,1); const col=f>0.5?COL.green:(f>0.25?COL.gold:COL.red); const fw=Math.max(h,w*f); g.fillStyle(col,0.16); g.fillRoundedRect(x-4,y-4,fw+8,h+8,r+3); g.fillStyle(col,0.1); g.fillRoundedRect(x-8,y-8,fw+16,h+16,r+6); g.fillStyle(col,1); g.fillRoundedRect(x,y,fw,h,r); g.fillStyle(COL.white,0.22); g.fillRoundedRect(x,y,fw,Math.max(2,h*0.42),r); g.fillStyle(COL.shadow,0.14); g.fillRoundedRect(x,y+h*0.62,fw,h*0.38,r); g.lineStyle(1,COL.white,0.16); for(let i=1;i<5;i++){ const tx=x+w*i/5; g.lineBetween(tx,y+3,tx,y+h-3); } g.lineStyle(2,COL.cyan,0.45); g.strokeRoundedRect(x,y,w,h,r); this.hpText.setText(Math.ceil(b.hp)+' / '+b.maxHp); }
  _topRight(){
    const w=140, h=75;
    const x=this.W-w-12-this.insetX;
    const y=14+this.insetY;

    const g=this.scene.add.graphics();
    this.layer.add(g);

    // Row 1: Gold
    if(!this._iconImg('icon_gold',x+18,y+18,22)) this.icon(g,'gold',x+18,y+18,22,COL.gold);
    this.goldText=this.txt(x+38,y+9,'0',16,COL.gold,true);
    this.goldText.setStroke(CSS(COL.shadow),5);

    // Row 2: Score / Trophy
    if(!this._iconImg('trophy',x+18,y+49,22)&&!this._iconImg('icon_trophy',x+18,y+49,22)) this.icon(g,'trophy',x+18,y+49,22,COL.gold);
    this.scoreText=this.txt(x+38,y+40,'0',15,COL.cyan,true);
    this.scoreText.setStroke(CSS(COL.shadow),5);

    const bx=x-9, by=y+17, s=this.scene;
    const bc=s.add.container(bx,by); this.layer.add(bc); this.coinBtn=bc;
    const bg=s.add.graphics(); bc.add(bg); this._coinBtnG=bg;
    const bz=s.add.zone(0,0,40,40).setOrigin(0.5).setInteractive({useHandCursor:true}); bc.add(bz);
    bz.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); SFX.ui(); openPurchase(this.scene,{kind:'coins'}); });
    bz.on('pointerover',()=>bc.setScale(1.12)); bz.on('pointerout',()=>bc.setScale(1));
    this._coinPulse=s.tweens.add({targets:bc,scale:{from:1,to:1.13},duration:520,yoyo:true,repeat:-1,paused:true});
    this.coinBtn.setVisible(GAMECFG.shop.enabled);
    this.refreshCoinBtn();
    this._goldShown=0;
  }
  updateResources(){
    const to=this.scene.gold, from=this._goldShown??to;
    if(this._goldTw) this._goldTw.stop();
    if(to!==from&&this.scene.sys.isActive()){
      const up=to>from, st={v:from};
      this._goldTw=this.scene.tweens.add({targets:st,v:to,duration:Math.min(420,120+Math.abs(to-from)*3),ease:'Cubic.easeOut',onUpdate:()=>{ this._goldShown=Math.round(st.v); this.goldText.setText(''+this._goldShown); },onComplete:()=>{ this._goldShown=to; this.goldText.setText(''+to); }});
      this.goldText.setColor(CSS(up?0xfff3c4:COL.red)); this.scene.time.delayedCall(260,()=>{ if(this.goldText&&this.goldText.active) this.goldText.setColor(CSS(COL.gold)); });
      if(up){ this.scene.tweens.add({targets:this.goldText,scale:{from:1.35,to:1},duration:300,ease:'Back.easeOut'}); }
    } else { this._goldShown=to; this.goldText.setText(''+to); }
    if(this._coinPulse&&(this.scene.packsBought||0)<COIN_PACK_RUN_CAP){ if(to<80&&this._coinPulse.isPaused()) this._coinPulse.resume(); else if(to>=80&&!this._coinPulse.isPaused()){ this._coinPulse.pause(); this.coinBtn.setScale(1); } }
  }
  refreshCoinBtn(){ const g=this._coinBtnG; if(!g) return; const max=(this.scene.packsBought||0)>=COIN_PACK_RUN_CAP; g.clear();
    g.fillStyle(0x000000,0.4); g.fillCircle(1,2,11.5); g.fillStyle(max?0x55677a:0xe9a100,1); g.fillCircle(0,0,11); g.fillStyle(max?0x8696a8:0xffc933,1); g.fillCircle(0,-0.8,9.4);
    g.fillStyle(0xffffff,max?0.12:0.4); g.fillEllipse(0,-5.5,12,5); g.lineStyle(1.6,max?0x9fb2c4:0xfff0b3,1); g.strokeCircle(0,0,11);
    g.lineStyle(2.6,0x3a2a00,max?0.5:1); g.lineBetween(-4.5,0,4.5,0); g.lineBetween(0,-4.5,0,4.5);
    this.coinBtn.setAlpha(max?0.6:1); if(max&&this._coinPulse&&!this._coinPulse.isPaused()){ this._coinPulse.pause(); this.coinBtn.setScale(1); } }
  waveCompleteBanner(wave,gold,doubled,healed){ waveBanner(this.scene,{wave,gold,doubled,healed}); }
  _build(){ const keys=TURRET_ORDER; const n=keys.length; const cellW=this.touch?84:78, gpad=6; const topY=92+this.insetY; const x=12+this.insetX; let cellH=this.touch?82:74; const maxH=(this.H-this.insetY-12-topY-22); if(n*cellH>maxH) cellH=Math.floor(maxH/n); const y=topY; this.txt(x+gpad+cellW/2,y+1,'BUILD',12,COL.textDim,true,0.5).setStroke(CSS(COL.shadow),4); this.buildButtons=[];
    keys.forEach((key,i)=>{ const cfg=TURRET_TYPES[key]; const bx=x+gpad, by=y+20+i*cellH; const bh=cellH-8; const isz=this.touch?42:38; const g=this.scene.add.graphics(); this.layer.add(g); const z=this.scene.add.zone(bx,by,cellW,bh).setOrigin(0).setInteractive(); this.layer.add(z); const img=this._iconImg('icon_'+key,bx+cellW/2,by+(bh-22)/2,isz)||(key==='mine'?this._iconImg('mine',bx+cellW/2,by+(bh-22)/2,isz):null); const nameT=this.txt(bx+cellW/2,by+bh-20,cfg.name,11,COL.text,true,0.5); const costT=this.txt(bx+cellW/2,by+bh-9,''+cfg.cost,10,COL.gold,true,0.5); const o={key,cfg,bx,by,cw:cellW,ch:bh,isz,g,z,costT,nameT,img}; z.on('pointerdown',()=>this.scene.selectBuild(key)); this.buildButtons.push(o); });
    this.refreshBuild();
  }
  refreshBuild(){
    const now=this.scene.time.now;
    this.buildButtons.forEach(o=>{
      const unlocked=this.scene.wave.wave>=o.cfg.unlock||o.cfg.unlock===0;
      const afford=this.scene.gold>=o.cfg.cost;
      const onCd=(o.key==='mine'&&now<this.scene.mineReadyAt);
      const sel=this.scene.buildType===o.key;
      const ac=unlocked?(onCd?COL.rock:o.cfg.accent):COL.rock;
      const buttonDim=!unlocked||onCd;
      o.g.clear();
      o.g.fillStyle(COL.shadow,0.45);
      o.g.fillRoundedRect(o.bx+2,o.by+3,o.cw,o.ch,12);
      o.g.fillStyle(sel?COL.cyanDk:COL.panel,sel?1:0.94);
      o.g.fillRoundedRect(o.bx,o.by,o.cw,o.ch,12);
      o.g.fillStyle(ac,unlocked?0.9:0.3);
      o.g.fillRoundedRect(o.bx,o.by,o.cw,4,2);
      o.g.lineStyle(sel?2.5:1.2,sel?COL.cyan:(unlocked?ac:COL.panelLite),sel?1:0.55);
      o.g.strokeRoundedRect(o.bx,o.by,o.cw,o.ch,12);
      if(o.img){
        o.img.setVisible(true).setTint(buttonDim?0x55677a:0xffffff).setAlpha(buttonDim?0.5:1);
      } else {
        this.icon(o.g,o.key,o.bx+o.cw/2,o.by+(o.ch-22)/2,o.isz*0.55,buttonDim?COL.rock:o.cfg.accent);
      }
      o.nameT.setColor(buttonDim?CSS(COL.textDim):CSS(COL.text)).setAlpha(buttonDim?0.6:1);
      if(onCd){
        const rem=Math.ceil((this.scene.mineReadyAt-now)/1000);
        o.costT.setText(rem+'s').setColor(CSS(COL.cyan)).setAlpha(1);
        const cx=o.bx+o.cw/2, cy=o.by+(o.ch-22)/2;
        const r=o.isz*0.62;
        o.g.fillStyle(COL.shadow,0.55);
        o.g.slice(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-(this.scene.mineReadyAt-now)/GAMECFG.economy.mineCooldownMs),true);
        o.g.fillPath();
      } else {
        o.costT.setText(unlocked?(''+o.cfg.cost):('Wave '+o.cfg.unlock)).setColor(unlocked?(afford?CSS(COL.gold):CSS(COL.red)):CSS(COL.textDim)).setAlpha(unlocked?1:0.7);
      }
    });
  }
  _control(){
    const t=this.touch;
    const cellW=t?96:80, cellH=t?64:54, gap=6;
    const bx=this.W-cellW-14-this.insetX;
    const sz=t?132:150;
    const mmY=this.H-this.insetY-sz-12;
    const totalH=34+3*cellH;
    const y=mmY-totalH-10;
    this.txt(bx+cellW/2,y+4,'TARGET',12,COL.textDim,true,0.5).setStroke(CSS(COL.shadow),4); this.ctrlCaption=this.txt(bx+cellW/2,y+19,'',11,COL.cyan,true,0.5); this.ctrlCaption.setStroke(CSS(COL.shadow),4); this.ctrlTop=y;
    this.ctrlButtons=[];
    const defs=[ {id:'first',label:'First',iconType:'first'}, {id:'strongest',label:'Strong',iconType:'strong'}, {id:'closest',label:'Close',iconType:'close'} ];
    defs.forEach((d,i)=>{
      const by=y+34+i*cellH, bh=cellH-gap, isz=t?42:34;
      const g=this.scene.add.graphics(); this.layer.add(g);
      const z=this.scene.add.zone(bx-6,by-3,cellW+12,cellH).setOrigin(0).setInteractive({useHandCursor:true}); this.layer.add(z);
      const img=this._iconImg('tgt_'+(d.id==='strongest'?'strong':(d.id==='closest'?'close':'first')), bx+cellW/2, by+(bh-14)/2-1, isz);
      const nameT=this.txt(bx+cellW/2,by+bh-11,d.label,t?13:11,COL.text,true,0.5);
      const o={id:d.id, iconType:d.iconType, bx, by, cw:cellW, ch:bh, isz, g, z, nameT, img};
      z.on('pointerdown',()=>this.onControl(d.id));
      this.ctrlButtons.push(o);
    });
    this.refreshControls();
  }
  _aimDock(){
    const s=this.scene, t=this.touch, sz=t?46:38, gap=8, padX=10, w=Math.max(sz*2+gap+padX*2,128), h=sz+74;
    const first=this.ctrlButtons[0]; const x=first.bx-w-12, y=this.ctrlTop+4;
    const c=s.add.container(x,y).setVisible(false); this.layer.add(c); this.aimDock=c;
    const bg=s.add.graphics(); c.add(bg);
    bg.fillStyle(COL.shadow,0.5); bg.fillRoundedRect(2,4,w,h,12); bg.fillStyle(COL.panel,0.95); bg.fillRoundedRect(0,0,w,h,12); bg.lineStyle(1.5,COL.cyan,0.6); bg.strokeRoundedRect(0,0,w,h,12);
    const lbl=(parent,txt)=>{ const l=s.add.text(w/2,11,txt,{fontFamily:'Space Grotesk',fontSize:'11px',fontStyle:'bold',color:CSS(COL.textDim)}).setOrigin(0.5); parent.add(l); return l; };
    const L=s.add.container(0,0); c.add(L); this.aimLocked=L; lbl(L,'AIM');
    const lg=s.add.graphics(); L.add(lg); const bw=w-padX*2, bh=sz+8;
    lg.fillStyle(COL.shadow,0.5); lg.fillRoundedRect(padX+1,25,bw,bh,12); lg.fillStyle(0x1b4466,1); lg.fillRoundedRect(padX,22,bw,bh,12); lg.fillStyle(0xffffff,0.15); lg.fillRoundedRect(padX+3,25,bw-6,bh*0.4,9); lg.lineStyle(2,COL.gold,0.95); lg.strokeRoundedRect(padX,22,bw,bh,12);
    const lt=s.add.text(w/2,22+bh/2-8,'ROTATE',{fontFamily:'Space Grotesk',fontSize:'13px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0.5); L.add(lt);
    const ct=s.add.text(w/2,22+bh/2+9,GAMECFG.economy.aimCost+' coins',{fontFamily:'Space Grotesk',fontSize:'12px',fontStyle:'bold',color:CSS(COL.gold)}).setOrigin(0.5); L.add(ct);
    const lz=s.add.zone(padX-3,19,bw+6,bh+6).setOrigin(0).setInteractive({useHandCursor:true}); L.add(lz); lz.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); s.startAim(); });
    const A=s.add.container(0,0); c.add(A); this.aimActiveC=A; lbl(A,'AIMING');
    const g=s.add.graphics(); A.add(g);
    const arrow=(cx,cy,r,dir)=>{ const m=dir; g.lineStyle(3.4,COL.white,1); g.beginPath(); for(let k=0;k<=24;k++){ const a=(-200+240*k/24)*D2R; const px=cx+m*r*Math.cos(a), py=cy+r*Math.sin(a); if(k===0) g.moveTo(px,py); else g.lineTo(px,py); } g.strokePath(); const ea=40*D2R, ex=cx+m*r*Math.cos(ea), ey=cy+r*Math.sin(ea); const tx=m*(-Math.sin(ea)), ty=Math.cos(ea), nx=m*Math.cos(ea), ny=Math.sin(ea); g.fillStyle(COL.white,1); g.fillTriangle(ex+tx*8,ey+ty*8,ex+nx*5.5,ey+ny*5.5,ex-nx*5.5,ey-ny*5.5); };
    const mk=(bx,dir)=>{ g.fillStyle(COL.panelLite,1); g.fillRoundedRect(bx,22,sz,sz,11); g.lineStyle(1.5,COL.cyan,0.55); g.strokeRoundedRect(bx,22,sz,sz,11); arrow(bx+sz/2,22+sz/2,sz*0.27,dir);
      const z=s.add.zone(bx-3,19,sz+6,sz+6).setOrigin(0).setInteractive({useHandCursor:true}); A.add(z);
      const step=()=>{ if(s.selectedTurret) s.rotateSelected(dir*10*D2R); };
      const stop=()=>{ if(this._aimTimer){ this._aimTimer.remove(false); this._aimTimer=null; } };
      z.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); stop(); step(); this._aimTimer=s.time.addEvent({delay:110,loop:true,callback:step}); });
      z.on('pointerup',stop); z.on('pointerout',stop); };
    const ox=(w-(sz*2+gap))/2; mk(ox,-1); mk(ox+sz+gap,1);
    const dg=s.add.graphics(); A.add(dg); const dy=22+sz+8, dh=26;
    dg.fillStyle(0x0f6b3a,1); dg.fillRoundedRect(padX,dy,w-padX*2,dh,10); dg.lineStyle(1.5,COL.green,0.9); dg.strokeRoundedRect(padX,dy,w-padX*2,dh,10);
    A.add(s.add.text(w/2,dy+dh/2,'DONE',{fontFamily:'Space Grotesk',fontSize:'13px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0.5));
    A.add(s.add.zone(padX-3,dy-3,w-padX*2+6,dh+6).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); s.endAim(); }));
  }
  refreshAim(){ if(!this.aimDock) return; const s=this.scene; const show=!!s.selectedTurret&&!s.buildType; if(this.aimDock.visible!==show){ this.aimDock.setVisible(show); if(!show&&this._aimTimer){ this._aimTimer.remove(false); this._aimTimer=null; } } if(show){ this.aimLocked.setVisible(!s.aimActive); this.aimActiveC.setVisible(!!s.aimActive); } }
  onControl(id){ SFX.ui(); if(id==='first'||id==='strongest'||id==='closest') this.scene.targetMode=id; this.refreshControls(); }
  refreshControls(){ if(this.ctrlCaption) this.ctrlCaption.setText({first:'Oldest ship',strongest:'Most HP',closest:'Nearest'}[this.scene.targetMode]||''); 
    this.ctrlButtons.forEach(o=>{
      const active=this.scene.targetMode===o.id;
      const color=active?0xffffff:0xa9bfd4;
      o.g.clear();
      o.g.fillStyle(COL.shadow,0.5); o.g.fillRoundedRect(o.bx+1,o.by+3,o.cw,o.ch,11);
      o.g.fillStyle(active?COL.cyanDk:COL.panel,0.96); o.g.fillRoundedRect(o.bx,o.by,o.cw,o.ch,11);
      o.g.lineStyle(active?2:1.5,active?COL.cyan:COL.panelEdge,active?0.95:0.8); o.g.strokeRoundedRect(o.bx,o.by,o.cw,o.ch,11);
      if(o.img){
        o.img.setVisible(true).setTint(color).setAlpha(active?1:0.85);
      } else {
        this.icon(o.g, o.iconType, o.bx+o.cw/2, o.by+(o.ch-14)/2, o.isz*0.95, color);
      }
      o.nameT.setColor(CSS(color)).setAlpha(active?1:0.92);
    });
  }
  _abilities(){ const keys=Object.keys(ABILITIES); const cellW=this.touch?78:70, cellH=this.touch?82:74, isz=this.touch?38:34, gpad=5; const w=keys.length*cellW+gpad*2; const x=Math.round(this.W/2-w/2),y=this.H-this.insetY-cellH-14; this.txt(x+w/2,y-13,'ABILITIES',10,COL.textDim,true,0.5).setStroke(CSS(COL.shadow),4); this.abilityButtons=[];
    keys.forEach((key,i)=>{ const ab=ABILITIES[key]; const bx=x+gpad+i*cellW,by=y; const g=this.scene.add.graphics(); this.layer.add(g); const cd=this.scene.add.graphics(); this.layer.add(cd); const img=this._iconImg('icon_'+ab.icon,bx+cellW/2,by+20+isz/2,isz); let txtOv=null; if(!img && ab.icon==='2x'){ txtOv=this.txt(bx+cellW/2,by+20+isz/2,'2X',16,COL.gold,true,0.5); txtOv.setStroke(CSS(COL.shadow),4); } const chargeT=this.txt(bx+cellW-11,by+18,'x'+ab.charges,10,COL.cyan,true,1); const nameT=this.txt(bx+cellW/2,by+cellH-16,ab.name,10,COL.text,true,0.5); const z=this.scene.add.zone(bx+3,by,cellW-6,cellH).setOrigin(0).setInteractive(); this.layer.add(z); const o={key,ab,bx,by,cw:cellW,ch:cellH,isz,g,cd,chargeT,nameT,img,charges:ab.charges,readyAt:0,txtOv}; z.on('pointerdown',()=>this.scene.useAbility(key)); this.abilityButtons.push(o); });
    this.refreshAbilities();
  }
  refreshAbilities(){ const now=this.scene.time.now; this.abilityButtons.forEach(o=>{ o.g.clear();
    const isGold=!!o.ab.gold; const afford=isGold?this.scene.gold>=o.ab.gold:true;
    const onCd=now<o.readyAt; const waveActive=this.scene.wave&&this.scene.wave.state==='spawning';
    const gated=(o.key==='airstrike'||o.key==='shield')&&!waveActive;
    const noFoe=o.key==='airstrike'&&!(this.scene.enemies&&this.scene.enemies.some(e=>e.alive));
    const uses=o.charges+Platform.extraCount(o.key);
    const bought=(this.scene.puBought&&this.scene.puBought[o.key])||0;
    const atLimit=uses<=0&&(!GAMECFG.shop.enabled||bought>=runCap(o.key));
    const needsCoins=uses>0&&isGold&&!afford, buy=uses<=0&&!atLimit;
    const dim=onCd||gated||noFoe||atLimit;
    const AMBER=0xff9f43;
    const bw=o.cw-6, bx=o.bx+3;
    o.g.fillStyle(COL.shadow,0.45); o.g.fillRoundedRect(bx+2,o.by+3,bw,o.ch,12);
    o.g.fillStyle(COL.panel,dim?0.8:(needsCoins?0.88:0.96)); o.g.fillRoundedRect(bx,o.by,bw,o.ch,12);
    o.g.fillStyle(needsCoins?AMBER:COL.cyan,dim?0.3:(needsCoins?0.7:0.85)); o.g.fillRoundedRect(bx,o.by,bw,4,2);
    const edge=dim?COL.panelLite:(needsCoins?AMBER:(buy?COL.gold:COL.cyan));
    o.g.lineStyle(!dim&&(needsCoins||buy)?2:1.2,edge,dim?0.5:((needsCoins||buy)?0.95:0.9)); o.g.strokeRoundedRect(bx,o.by,bw,o.ch,12);
    const cx=o.bx+o.cw/2, cy=o.by+20+o.isz/2;
    if(o.img){ o.img.setVisible(true).setTint(dim?0x55677a:(needsCoins?0xffd9b0:0xffffff)).setAlpha(dim?0.55:(needsCoins?0.62:1)); }
    else { this.icon(o.g,o.ab.icon,cx,cy,o.isz*0.55,dim?COL.rock:COL.cyan); if(o.txtOv) o.txtOv.setColor(dim?CSS(COL.textDim):CSS(COL.gold)).setAlpha(dim?0.5:1); }
    o.nameT.setText(needsCoins?('Need $'+o.ab.gold):o.ab.name).setColor(dim?CSS(COL.textDim):(needsCoins?CSS(AMBER):CSS(COL.text))).setAlpha(dim?0.6:1);
    let tag, tagCol;
    if(atLimit){ tag='USED UP'; tagCol=CSS(COL.textDim); }
    else if(uses<=0){ tag='BUY '+POWERUP_PRICE; tagCol=dim?CSS(COL.textDim):CSS(COL.gold); }
    else if(needsCoins){ tag='x'+uses+(o.charges>0?' FREE':''); tagCol=dim?CSS(COL.textDim):CSS(COL.cyan); }
    else { tag='x'+uses+(isGold?' $'+o.ab.gold:''); tagCol=dim?CSS(COL.textDim):CSS(COL.cyan); }
    o.chargeT.setText(tag).setColor(tagCol);
    { const tw=o.chargeT.width+10, th=15, px=o.chargeT.x-tw+5, py=o.chargeT.y-o.chargeT.height/2-th/2; o.g.fillStyle(0x06121d,0.92); o.g.fillRoundedRect(px,py,tw,th,7); o.g.lineStyle(1,edge,dim?0.4:0.8); o.g.strokeRoundedRect(px,py,tw,th,7); }
    o.cd.clear(); if(onCd){ const p=1-(o.readyAt-now)/o.ab.cd; const r=o.isz*0.62; o.cd.fillStyle(COL.shadow,0.5); o.cd.slice(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p),true); o.cd.fillPath(); } }); }
  refillFx(list){ if(!list||!list.length) return; const lay=this.layer; list.forEach((o,idx)=>{ const cx=o.bx+o.cw/2, cy=o.by+o.ch/2; const ring=this.scene.add.graphics().setDepth(1150); ring.lineStyle(3,COL.cyan,0.9); ring.strokeCircle(cx,cy,o.cw*0.2); lay.add(ring); ring.setScale(0.4).setAlpha(1); this.scene.tweens.add({targets:ring,scale:2.2,alpha:0,duration:520,delay:idx*70,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()}); const glow=this.scene.add.graphics().setDepth(1149); glow.fillStyle(COL.cyan,0.5); glow.fillRoundedRect(o.bx+1,o.by+1,o.cw-2,o.ch-2,12); lay.add(glow); glow.setAlpha(0); this.scene.tweens.add({targets:glow,alpha:0.6,duration:140,delay:idx*70,yoyo:true,hold:120,ease:'Sine.easeOut',onComplete:()=>glow.destroy()}); const plus=this.scene.add.text(cx,cy-4,'+1',{fontFamily:'Arial',fontSize:'22px',fontStyle:'bold',color:'#86f6ff',stroke:'#05111d',strokeThickness:4}).setOrigin(0.5).setDepth(1160).setAlpha(0).setScale(0.4); lay.add(plus); this.scene.tweens.add({targets:plus,alpha:1,scale:1.15,duration:180,delay:idx*70,ease:'Back.easeOut'}); this.scene.tweens.add({targets:plus,y:cy-30,alpha:0,delay:idx*70+260,duration:520,ease:'Cubic.easeOut',onComplete:()=>plus.destroy()}); if(o.chargeT){ o.chargeT.setScale(0.4); this.scene.tweens.add({targets:o.chargeT,scale:1,duration:300,delay:idx*70,ease:'Back.easeOut'}); } }); }
  wellDoneBadge(){ const s=this.scene; const cx=this.W/2, cy=this.H/2-30; const c=s.add.container(cx,cy).setDepth(1450); this.layer.add(c); const ring=s.add.graphics(); ring.lineStyle(4,COL.gold,0.85); ring.strokeCircle(0,0,54); c.add(ring); ring.setScale(0.5); s.tweens.add({targets:ring,scale:2.6,alpha:0,duration:900,ease:'Cubic.easeOut'}); let badge; if(s.textures.exists('badge')){ badge=s.add.image(0,0,'badge'); const _b=s.textures.get('badge').getSourceImage(); badge.setScale(112/Math.max(1,Math.max(_b.width,_b.height))); } else { badge=s.add.graphics(); const pts=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5; const rr=(i%2===0)?48:21; pts.push(new Phaser.Geom.Point(Math.cos(a)*rr,Math.sin(a)*rr)); } badge.fillStyle(COL.shadow,0.4); badge.fillCircle(2,3,50); badge.fillStyle(COL.gold,1); badge.fillPoints(pts,true); badge.lineStyle(3,COL.white,0.85); badge.strokePoints(pts,true); badge.fillStyle(0xfff0b8,1); badge.fillCircle(0,0,17); badge.fillStyle(COL.gold,1); badge.fillCircle(0,0,11); } c.add(badge); const t1=s.add.text(0,72,'WELL DONE!',{fontFamily:'Arial Black, Arial',fontSize:'26px',fontStyle:'bold',color:CSS(COL.gold)}).setOrigin(0.5).setStroke(CSS(COL.shadow),6); c.add(t1); const t2=s.add.text(0,100,'Abilities Refilled',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:CSS(COL.cyan)}).setOrigin(0.5).setStroke(CSS(COL.shadow),4); c.add(t2); c.setScale(0.2).setAlpha(0); s.tweens.add({targets:c,scale:1,alpha:1,duration:430,ease:'Back.easeOut'}); s.tweens.add({targets:badge,angle:{from:-22,to:0},duration:560,ease:'Back.easeOut'}); s.tweens.add({targets:c,alpha:0,y:cy-30,delay:1500,duration:520,ease:'Cubic.easeIn',onComplete:()=>c.destroy()}); }
  _minimap(){ const sz=this.touch?132:150,x=this.W-sz-12-this.insetX,y=this.H-this.insetY-sz-12; this.mmX=x+6; this.mmY=y+6; this.mmS=sz-12; this.mmStatic=this.scene.add.graphics(); this.layer.add(this.mmStatic); this.mmG=this.scene.add.graphics(); this.layer.add(this.mmG); this._mmStatic(); }
  _mmStatic(){ const g=this.mmStatic; g.clear(); const sx=this.mmS/this.scene.worldW,sy=this.mmS/this.scene.worldH; const cx=this.mmX+this.mmS/2,cy=this.mmY+this.mmS/2,R=this.mmS/2; g.fillStyle(COL.shadow,0.55); g.fillCircle(cx,cy,R+2); g.fillStyle(0x06222e,1); g.fillCircle(cx,cy,R); g.fillStyle(COL.oceanDeep,0.45); g.fillCircle(cx,cy,R); this.scene.islands.forEach(o=>{ const ox=this.mmX+o.x*sx,oy=this.mmY+o.y*sy; if(Phaser.Math.Distance.Between(ox,oy,cx,cy)<R-1){ g.fillStyle(COL.island,0.8); g.fillCircle(ox,oy,Math.max(2,o.r*sx)); } }); this.scene.rocks.forEach(o=>{ const ox=this.mmX+o.x*sx,oy=this.mmY+o.y*sy; if(Phaser.Math.Distance.Between(ox,oy,cx,cy)<R-1){ g.fillStyle(COL.rock,0.75); g.fillCircle(ox,oy,Math.max(1,o.r*sx*0.6)); } }); g.lineStyle(1,COL.cyan,0.12); for(let i=1;i<=3;i++) g.strokeCircle(cx,cy,R*i/3); g.lineStyle(1,COL.cyan,0.1); g.lineBetween(cx-R,cy,cx+R,cy); g.lineBetween(cx,cy-R,cx,cy+R); for(let i=0;i<12;i++){ const a=i*Math.PI/6; const r1=R-1,r2=R-(i%3===0?8:4); g.lineStyle(i%3===0?2:1,COL.cyan,0.45); g.lineBetween(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1,cx+Math.cos(a)*r2,cy+Math.sin(a)*r2); } g.lineStyle(3,COL.cyanDk,0.9); g.strokeCircle(cx,cy,R); g.lineStyle(1.5,COL.cyan,0.6); g.strokeCircle(cx,cy,R-2); }
  updateMinimap(){ const g=this.mmG; g.clear(); const sx=this.mmS/this.scene.worldW,sy=this.mmS/this.scene.worldH; const now=(this.scene.time?this.scene.time.now:0); const cx=this.mmX+this.mmS/2,cy=this.mmY+this.mmS/2,R=this.mmS/2,rr=R-2; const inR=(x,y)=>Phaser.Math.Distance.Between(x,y,cx,cy)<=rr;
    for(let k=0;k<2;k++){ const pp=(((now/2400)+k*0.5)%1); g.lineStyle(1.4,COL.cyan,0.28*(1-pp)); g.strokeCircle(cx,cy,pp*rr); }
    const sweep=(now*0.0016)%(Math.PI*2); const seg=24; for(let t=0;t<seg;t++){ const a=sweep-t*0.05,a2=sweep-(t+1)*0.05; g.fillStyle(COL.cyan,0.16*(1-t/seg)); g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); g.lineTo(cx+Math.cos(a2)*rr,cy+Math.sin(a2)*rr); g.closePath(); g.fillPath(); }
    g.lineStyle(2,COL.cyan,0.85); g.lineBetween(cx,cy,cx+Math.cos(sweep)*rr,cy+Math.sin(sweep)*rr);
    const b=this.scene.base; const bx2=this.mmX+b.x*sx,by2=this.mmY+b.y*sy; g.fillStyle(COL.cyan,0.3); g.fillCircle(bx2,by2,5); g.fillStyle(COL.white,1); g.fillRect(bx2-2.5,by2-2.5,5,5);
    this.scene.turrets.forEach(t=>{ const tx=this.mmX+t.x*sx,ty=this.mmY+t.y*sy; if(inR(tx,ty)){ g.fillStyle(COL.cyan,1); g.fillCircle(tx,ty,1.9); } });
    this.scene.friendlies.forEach(f=>{ const fx2=this.mmX+f.x*sx,fy2=this.mmY+f.y*sy; if(inR(fx2,fy2)){ g.fillStyle(COL.green,1); g.fillCircle(fx2,fy2,2); } });
    this.scene.mines.forEach(m=>{ const mx=this.mmX+m.x*sx,my=this.mmY+m.y*sy; if(inR(mx,my)){ g.fillStyle(COL.gold,1); g.fillCircle(mx,my,1.4); } });
    this.scene.enemies.forEach(e=>{ if(!e.alive) return; const ex=this.mmX+e.x*sx,ey=this.mmY+e.y*sy; if(!inR(ex,ey)) return; const ang=Math.atan2(ey-cy,ex-cx); const da=((sweep-ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); const lit=da<0.7?(1-da/0.7):0; g.fillStyle(COL.red,1); g.fillCircle(ex,ey,2.2); if(lit>0){ g.fillStyle(COL.red,0.55*lit); g.fillCircle(ex,ey,2.2+lit*4.5); } });
  }
  _announce(){ this.announceT=this.scene.add.text(this.W/2,this.H*0.30,'',{fontFamily:'Arial',fontSize:'28px',fontStyle:'bold',color:CSS(COL.cyan),stroke:CSS(COL.shadow),strokeThickness:5}).setOrigin(0.5).setDepth(1100).setAlpha(0); this.layer.add(this.announceT); this.announceSub=this.scene.add.text(this.W/2,this.H*0.30+42,'',{fontFamily:'Arial',fontSize:'20px',fontStyle:'bold',color:CSS(COL.gold),stroke:CSS(COL.shadow),strokeThickness:4}).setOrigin(0.5).setDepth(1100).setAlpha(0); this.layer.add(this.announceSub); }
  announce(msg,color){ this.announceT.setFontSize(28).setText(msg).setColor(CSS(color||COL.cyan)).setAlpha(0).setScale(0.7); this.scene.tweens.add({targets:this.announceT,alpha:1,scale:1,duration:280,ease:'Back.easeOut',yoyo:true,hold:900,onComplete:()=>this.announceT.setAlpha(0)}); }
  announceWave(big,sub,color){ const c=CSS(color||COL.gold); this.announceT.setFontSize(48).setText(big).setColor(c).setAlpha(0).setScale(0.45); this.announceSub.setText(sub).setColor(CSS(COL.gold)).setAlpha(0).setScale(0.7); if(this.scene.fx) this.scene.fx.shake(0.0028,160); this.scene.tweens.add({targets:this.announceT,alpha:1,scale:1,duration:360,ease:'Back.easeOut',yoyo:true,hold:1150,onComplete:()=>{ this.announceT.setAlpha(0).setFontSize(28); }}); this.scene.tweens.add({targets:this.announceSub,alpha:1,scale:1,duration:340,delay:140,ease:'Back.easeOut',yoyo:true,hold:1050,onComplete:()=>this.announceSub.setAlpha(0)}); }
  _selection(){ this.selW=236; this.selH=140;
    this.sel=this.scene.add.container(0,0).setDepth(1200).setVisible(false); this.layer.add(this.sel);
    this.selBg=this.scene.add.graphics(); this.sel.add(this.selBg);
    this.selTitle=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:CSS(COL.text)}); this.sel.add(this.selTitle);
    this.selStats=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',color:CSS(COL.textDim)}); this.sel.add(this.selStats);
    this.rotLBtn=this.scene.add.graphics(); this.rotRBtn=this.scene.add.graphics(); this.sel.add([this.rotLBtn,this.rotRBtn]);
    this.rotLbl=this.scene.add.text(0,0,'Aim',{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:CSS(COL.cyan)}).setOrigin(0.5); this.sel.add(this.rotLbl);
    this.rotCoin=null; if(this.scene.textures.exists('icon_gold')){ this.rotCoin=this.scene.add.image(0,0,'icon_gold'); const _rc=this.scene.textures.get('icon_gold').getSourceImage(); this.rotCoin.setScale(13/Math.max(1,Math.max(_rc.width,_rc.height))); this.sel.add(this.rotCoin); this.rotCoin.setVisible(false); }
    this.rotCostT=this.scene.add.text(0,0,'20',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:CSS(COL.gold)}).setOrigin(0,0.5); this.sel.add(this.rotCostT);
    this.rotLZone=this.scene.add.zone(0,0,46,32).setOrigin(0).setInteractive(); this.sel.add(this.rotLZone);
    this.rotRZone=this.scene.add.zone(0,0,46,32).setOrigin(0).setInteractive(); this.sel.add(this.rotRZone);
    this.rotLZone.on('pointerdown',()=>this.scene.rotateSelected(-12*D2R));
    this.rotRZone.on('pointerdown',()=>this.scene.rotateSelected(12*D2R));
    this.rotDoneBtn=this.scene.add.graphics(); this.sel.add(this.rotDoneBtn);
    this.rotDoneText=this.scene.add.text(0,0,'Rotate',{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); this.sel.add(this.rotDoneText);
    this.rotDoneZone=this.scene.add.zone(0,0,10,10).setOrigin(0).setInteractive(); this.sel.add(this.rotDoneZone);
    this.rotDoneZone.on('pointerdown',()=>this.scene.submitRotate());
    this.upBtn=this.scene.add.graphics(); this.sel.add(this.upBtn);
    this.upText=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); this.sel.add(this.upText);
    this.upCoin=null; if(this.scene.textures.exists('icon_gold')){ this.upCoin=this.scene.add.image(0,0,'icon_gold'); const _cs=this.scene.textures.get('icon_gold').getSourceImage(); this.upCoin.setScale(15/Math.max(1,Math.max(_cs.width,_cs.height))); this.sel.add(this.upCoin); this.upCoin.setVisible(false); }
    this.selBars=this.scene.add.graphics(); this.sel.add(this.selBars); this.barLbl=[]; this.barVal=[];
    for(let _i=0;_i<3;_i++){ const _l=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:CSS(COL.textDim)}).setOrigin(0,0.5); this.sel.add(_l); this.barLbl.push(_l); const _v=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:CSS(COL.text)}).setOrigin(1,0.5); this.sel.add(_v); this.barVal.push(_v); }
    this.upCostT=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:CSS(COL.gold)}).setOrigin(0,0.5); this.sel.add(this.upCostT);
    this.sellBtn=this.scene.add.graphics(); this.sel.add(this.sellBtn);
    this.sellText=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); this.sel.add(this.sellText);
    this.upZone=this.scene.add.zone(0,0,98,32).setOrigin(0).setInteractive(); this.sel.add(this.upZone);
    this.sellZone=this.scene.add.zone(0,0,98,32).setOrigin(0).setInteractive(); this.sel.add(this.sellZone);
    this.upZone.on('pointerdown',()=>this.scene.upgradeSelected());
    this.sellZone.on('pointerdown',()=>this.scene.sellSelected());
  }
  showSelection(t){ const rot=!!this.scene.rotateMode; const _sh=rot?128:62; const px=Phaser.Math.Clamp(t.x-this.selW/2,8,this.W-this.selW-8); let py=t.y-t._radius()-_sh-14; if(py<8) py=t.y+t._radius()+14; py=Phaser.Math.Clamp(py,8,this.H-_sh-8); this.sel.setPosition(px,py).setVisible(true);
    const g=this.selBg; g.clear(); g.fillStyle(COL.shadow,0.4); g.fillRoundedRect(3,5,this.selW,_sh,12); g.fillStyle(COL.panel,0.97); g.fillRoundedRect(0,0,this.selW,_sh,12); g.lineStyle(1.5,COL.cyan,0.7); g.strokeRoundedRect(0,0,this.selW,_sh,12);
    const _vis=(o,v)=>{ if(o&&o.setVisible) o.setVisible(v); }; _vis(this.selStats,!rot); this.barLbl.forEach(o=>_vis(o,false)); this.barVal.forEach(o=>_vis(o,false)); _vis(this.upBtn,false); _vis(this.upText,false); _vis(this.upCoin,false); _vis(this.upCostT,false); _vis(this.rotCoin,false); _vis(this.rotCostT,false); _vis(this.rotDoneBtn,false); _vis(this.rotDoneText,false); _vis(this.sellBtn,false); _vis(this.sellText,false); if(this.upZone) this.upZone.setPosition(-999,-999); if(this.sellZone) this.sellZone.setPosition(-999,-999); if(this.rotDoneZone) this.rotDoneZone.setPosition(-999,-999);
    this.selBars.clear();
    this.selTitle.setPosition(12,9).setText(rot?(t.cfg.name+'  \u2022  Rotate'):(t.cfg.name+'  Lv'+t.level));
    if(!rot){ this.selStats.setPosition(12,32).setText('DMG '+t.atk+'    RNG '+t.range+'    Max HP '+t.maxHp); }
    const ry=rot?42:58;
    if(rot){
    this.rotLBtn.setVisible(true); this.rotRBtn.setVisible(true); this.rotLbl.setVisible(true);
    this.rotLBtn.clear(); this.rotLBtn.fillStyle(COL.panelLite,1); this.rotLBtn.fillRoundedRect(12,ry,40,30,8); this.rotLBtn.fillStyle(COL.cyan,1); this.rotLBtn.fillTriangle(38,ry+8,38,ry+22,26,ry+15);
    this.rotRBtn.clear(); this.rotRBtn.fillStyle(COL.panelLite,1); this.rotRBtn.fillRoundedRect(this.selW-52,ry,40,30,8); this.rotRBtn.fillStyle(COL.cyan,1); this.rotRBtn.fillTriangle(this.selW-38,ry+8,this.selW-38,ry+22,this.selW-26,ry+15);
    this.rotLbl.setOrigin(0.5,0.5).setPosition(this.selW/2,ry+15).setText('Aim Turret');
    this.rotLZone.setPosition(12,ry); this.rotRZone.setPosition(this.selW-52,ry);
    } else { this.rotLBtn.setVisible(false); this.rotRBtn.setVisible(false); this.rotLbl.setVisible(false); this.rotLZone.setPosition(-999,-999); this.rotRZone.setPosition(-999,-999); }
    if(rot){ const dy=ry+42; const bh2=34; this.rotDoneBtn.clear(); this.rotDoneBtn.fillStyle(COL.shadow,0.4); this.rotDoneBtn.fillRoundedRect(14,dy+4,this.selW-28,bh2,10); this.rotDoneBtn.fillStyle(0x1c7d3d,1); this.rotDoneBtn.fillRoundedRect(12,dy+3,this.selW-24,bh2,10); this.rotDoneBtn.fillStyle(COL.green,1); this.rotDoneBtn.fillRoundedRect(12,dy,this.selW-24,bh2,10); this.rotDoneBtn.fillStyle(0x7df0a8,0.45); this.rotDoneBtn.fillRoundedRect(15,dy+3,this.selW-30,bh2*0.42,8); this.rotDoneBtn.lineStyle(1.5,0x2bd06a,1); this.rotDoneBtn.strokeRoundedRect(12,dy,this.selW-24,bh2,10); this.rotDoneBtn.setVisible(true); const cyy=dy+bh2/2; this.rotDoneText.setVisible(true).setOrigin(0,0.5).setPosition(this.selW/2-48,cyy).setText('Rotate'); this.rotDoneZone.setPosition(12,dy).setSize(this.selW-24,bh2); const ccx=this.selW/2+30; this.rotDoneBtn.fillStyle(COL.shadow,0.45); this.rotDoneBtn.fillCircle(ccx,cyy+1,10); if(this.rotCoin){ this.rotCoin.setVisible(true).setPosition(ccx,cyy); } else { this.rotDoneBtn.fillStyle(COL.gold,1); this.rotDoneBtn.fillCircle(ccx,cyy,9); this.rotDoneBtn.lineStyle(1.6,0x8a6d1f,1); this.rotDoneBtn.strokeCircle(ccx,cyy,9); this.rotDoneBtn.fillStyle(0xfff3c4,0.95); this.rotDoneBtn.fillCircle(ccx-3,cyy-3,3.2); } this.rotCostT.setVisible(true).setOrigin(0,0.5).setPosition(ccx+12,cyy).setText('20').setColor(CSS(COL.gold)); }
    if(this.sellBtn) this.sellBtn.clear();
  }
  hideSelection(){ this.sel.setVisible(false); }
  _ensureUpPrev(){ if(this._upPrev) return this._upPrev; const s=this.scene; const c=s.add.container(0,0).setDepth(67).setVisible(false); const g=s.add.graphics(); const tg=s.add.graphics(); const title=s.add.text(0,0,'',{fontFamily:'Space Grotesk',fontSize:'12px',fontStyle:'bold',color:CSS(COL.gold)}).setOrigin(0.5,0); title.setShadow(0,1,CSS(COL.shadow),5,false,true); const lbls=[],vals=[]; for(let i=0;i<3;i++){ lbls.push(s.add.text(0,0,'',{fontFamily:'Space Grotesk',fontSize:'10px',fontStyle:'bold',color:CSS(COL.textDim)}).setOrigin(0,0.5)); vals.push(s.add.text(0,0,'',{fontFamily:'Space Grotesk',fontSize:'10px',fontStyle:'bold',color:CSS(COL.green)}).setOrigin(1,0.5)); } const upText=s.add.text(0,0,'',{fontFamily:'Space Grotesk',fontSize:'12px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); const cancelText=s.add.text(0,0,'Cancel',{fontFamily:'Space Grotesk',fontSize:'12px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); const upZone=s.add.zone(0,0,10,10).setOrigin(0).setInteractive({useHandCursor:true}); const cancelZone=s.add.zone(0,0,10,10).setOrigin(0).setInteractive({useHandCursor:true}); upZone.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); s.confirmUpgrade(); }); cancelZone.on('pointerdown',(p,lx,ly,ev)=>{ if(ev&&ev.stopPropagation) ev.stopPropagation(); s.cancelUpgrade(); }); let coin=null; if(s.textures.exists('icon_gold')){ coin=s.add.image(0,0,'icon_gold'); const _cc=s.textures.get('icon_gold').getSourceImage(); coin.setScale(16/Math.max(1,Math.max(_cc.width,_cc.height))); coin.setVisible(false); } c.add([g,tg,title,...lbls,...vals,upText,cancelText,upZone,cancelZone]); if(coin) c.add(coin); this._upPrev={c,g,tg,title,lbls,vals,upText,cancelText,upZone,cancelZone,coin}; return this._upPrev; }
  showUpgradePreview(t){ if(!t||!t.canUpgrade()){ this.hideUpgradePreview(); return; } const p=this._ensureUpPrev(); const W=216,H=190; const lvl=t.level; const nAtk=Math.round(t.cfg.damage*Math.pow(1.25,lvl)*GAMECFG.allies.turretDmgMul), nRng=Math.round(t.cfg.range*(1+0.08*lvl)), nHp=Math.round(t.cfg.hp*2*Math.pow(1.25,lvl)*GAMECFG.allies.turretHpMul); const rows=[{l:'MAX HP',c:t.maxHp,n:nHp,m:Math.round(t.cfg.hp*2*Math.pow(1.25,4)*GAMECFG.allies.turretHpMul)},{l:'DAMAGE',c:t.atk,n:nAtk,m:Math.round(t.cfg.damage*Math.pow(1.25,4)*GAMECFG.allies.turretDmgMul)},{l:'RANGE',c:t.range,n:nRng,m:Math.round(t.cfg.range*(1+0.08*4))}]; const g=p.g; g.clear(); g.fillStyle(COL.cyan,0.14); g.fillRoundedRect(-W/2-6,-6,W+12,H+12,18); g.fillStyle(COL.shadow,0.55); g.fillRoundedRect(-W/2+3,6,W,H,16); g.fillStyle(COL.panel,0.97); g.fillRoundedRect(-W/2,0,W,H,16); g.fillStyle(COL.cyanDk,0.5); g.fillRoundedRect(-W/2,0,W,32,{tl:16,tr:16,bl:0,br:0}); g.lineStyle(1.5,COL.cyan,0.8); g.strokeRoundedRect(-W/2,0,W,H,16); g.lineStyle(1,COL.cyan,0.18); g.lineBetween(-W/2+12,32,W/2-12,32); p.title.setVisible(true).setPosition(0,9).setText('Upgrade  Lv'+lvl+'  \u2192  Lv'+(lvl+1)); const lx=-W/2+16, rx=W/2-16, bw=W-32; for(let i=0;i<3;i++){ const r=rows[i]; const rowY=48+i*34; const by=rowY+12; const fc=Phaser.Math.Clamp(r.c/r.m,0.05,1),fn=Phaser.Math.Clamp(r.n/r.m,0.05,1); p.lbls[i].setVisible(true).setPosition(lx,rowY).setText(r.l); p.vals[i].setVisible(true).setPosition(rx,rowY).setText(Math.round(r.c)+'  \u2192  '+Math.round(r.n)); g.fillStyle(COL.panelEdge,1); g.fillRoundedRect(lx,by,bw,6,3); g.fillStyle(COL.green,0.4); g.fillRoundedRect(lx,by,Math.max(5,bw*fn),6,3); g.fillStyle(COL.cyan,1); g.fillRoundedRect(lx,by,Math.max(5,bw*fc),6,3); } const cost=t.upgradeCost(); const byb=H-42,bh=32,btnW=bw; const ux=lx; const xcx=W/2-19, xcy=16; g.fillStyle(COL.shadow,0.4); g.fillRoundedRect(ux+2,byb+3,btnW,bh,9); g.fillStyle(COL.green,1); g.fillRoundedRect(ux,byb,btnW,bh,9); g.fillStyle(0x7df0a8,0.4); g.fillRoundedRect(ux+3,byb+3,btnW-6,bh*0.4,7); g.lineStyle(1.5,0x2bd06a,1); g.strokeRoundedRect(ux,byb,btnW,bh,9); g.fillStyle(COL.enemyDk,1); g.fillCircle(xcx,xcy,12); g.lineStyle(1.5,COL.red,0.85); g.strokeCircle(xcx,xcy,12); const ucy=byb+bh/2; if(p.coin){ p.coin.setVisible(true).setPosition(ux+btnW/2-15,ucy); p.upText.setVisible(true).setOrigin(0,0.5).setPosition(ux+btnW/2-3,ucy).setText(''+cost); } else { g.fillStyle(COL.gold,1); g.fillCircle(ux+btnW/2-16,ucy,7); g.lineStyle(1.4,0x8a6d1f,1); g.strokeCircle(ux+btnW/2-16,ucy,7); g.fillStyle(0xfff3c4,0.95); g.fillCircle(ux+btnW/2-18,ucy-2,2.4); p.upText.setVisible(true).setOrigin(0,0.5).setPosition(ux+btnW/2-4,ucy).setText(''+cost); } p.cancelText.setText('\u2715').setFontSize(14).setVisible(true).setOrigin(0.5).setPosition(xcx,xcy); p.upZone.setSize(btnW,bh).setPosition(ux,byb); p.cancelZone.setSize(38,38).setPosition(xcx-19,xcy-19); if(p.tg) p.tg.clear(); const px=Phaser.Math.Clamp(t.x,W/2+8,this.scene.worldW-W/2-8); let py=t.y-t._radius()-H-20; if(py<8) py=t.y+t._radius()+20; p.c.setPosition(px,py).setVisible(true); }
  hideUpgradePreview(){ if(this._upPrev){ this._upPrev.c.setVisible(false); if(this._upPrev.tg) this._upPrev.tg.clear(); } this.scene.armedUpgrade=null; }
  updateUpgradePreview(time){ const p=this._upPrev; if(!p||!p.c.visible) return; const t=this.scene.armedUpgrade; if(!t||!t.alive){ this.hideUpgradePreview(); } }
  _readyBtn(){ const abW=Object.keys(ABILITIES).length*(this.touch?78:70)+10; const abRight=this.W/2+abW/2; const mmSz=this.touch?132:150; const mmLeft=this.W-mmSz-12-this.insetX; const bw=this.touch?132:116, bh=this.touch?46:40; let cxBtn=(abRight+mmLeft)/2; if(cxBtn+bw/2>mmLeft-6) cxBtn=mmLeft-6-bw/2; if(cxBtn-bw/2<abRight+6) cxBtn=abRight+6+bw/2; const bx=Math.round(cxBtn-bw/2), by=this.H-this.insetY-bh-14; this.readyPos={bx,by,bw,bh}; this.readyUrgent=false; this.readyBtn=this.scene.add.container(0,0).setDepth(1150).setVisible(false); this.layer.add(this.readyBtn); this.readyGlow=this.scene.add.graphics(); this.readyBtn.add(this.readyGlow); this.readyG=this.scene.add.graphics(); this.readyBtn.add(this.readyG); this.readyText=this.scene.add.text(bx+bw/2+9,by-bh-8+bh/2,'READY!',{fontFamily:'Space Grotesk',fontSize:(this.touch?'18px':'16px'),fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); this.readyText.setStroke(CSS(COL.shadow),4); this.readyBtn.add(this.readyText); const z=this.scene.add.zone(bx,by-bh-8,bw,bh).setOrigin(0).setInteractive({useHandCursor:true}); this.readyBtn.add(z); z.on('pointerdown',()=>{ if(this.scene.wave&&this.scene.wave.state==='prep'&&this.scene.wave.wave>=1&&!this.scene.gameIsOver){ SFX.wave(); this.hideReady(); this.scene.selectTurret(null); this.scene.wave.nextWave(); } }); this._drawReady(); if(this.readyPulse&&this.readyPulse.remove) this.readyPulse.remove(); this.readyPulse=this.scene.tweens.add({targets:this.readyText,scaleX:1.08,scaleY:1.08,duration:560,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); this.doublerBtn=this.scene.add.container(0,0).setDepth(1150).setVisible(false); this.layer.add(this.doublerBtn); this.doublerG=this.scene.add.graphics(); this.doublerBtn.add(this.doublerG); this.doublerText=this.scene.add.text(bx+bw/2,by+bh/2,'2X GOLD',{fontFamily:'Space Grotesk',fontSize:(this.touch?'15px':'13px'),fontStyle:'bold',color:'#ffffff'}).setOrigin(0.5); this.doublerText.setStroke(CSS(COL.shadow),4); this.doublerBtn.add(this.doublerText); const dz=this.scene.add.zone(bx,by,bw,bh).setOrigin(0).setInteractive({useHandCursor:true}); this.doublerBtn.add(dz); dz.on('pointerdown',()=>this.onDoublerClick()); this._drawDoublerBtn(this.scene.coinDoublerActive); if(this.scene.wave&&this.scene.wave.state==='prep'&&this.scene.wave.wave>=1){ this.readyBtn.setVisible(true); this.doublerBtn.setVisible(true); this._startDoublerBlink(); } }
  _drawReady(){ const g=this.readyG; if(!g) return; const b=this.readyPos; const bx=b.bx,by=b.by-b.bh-8,bw=b.bw,bh=b.bh; const u=this.readyUrgent; const base=u?0x7a1410:0x1c7d3d, mid=u?COL.red:COL.green, hi=u?0xffb0a4:0x7df0a8, edge=u?0xff6b5e:0x2bd06a; if(this.readyGlow){ this.readyGlow.clear(); if(u){ this.readyGlow.fillStyle(COL.red,0.5); this.readyGlow.fillRoundedRect(bx-7,by-7,bw+14,bh+14,18); this.readyGlow.fillStyle(COL.red,0.3); this.readyGlow.fillRoundedRect(bx-12,by-12,bw+24,bh+24,22); } } g.clear(); g.fillStyle(COL.shadow,0.5); g.fillRoundedRect(bx+2,by+5,bw,bh,13); g.fillStyle(base,1); g.fillRoundedRect(bx,by+4,bw,bh,13); g.fillStyle(mid,1); g.fillRoundedRect(bx,by,bw,bh,13); g.fillStyle(hi,0.5); g.fillRoundedRect(bx+3,by+3,bw-6,bh*0.42,11); g.lineStyle(2,edge,1); g.strokeRoundedRect(bx,by,bw,bh,13); const ax=bx+20,ay=by+bh/2; g.fillStyle(COL.white,0.95); g.fillTriangle(ax-6,ay-8,ax-6,ay+8,ax+8,ay); }
  _drawDoublerBtn(active){ const g=this.doublerG; if(!g) return; const b=this.readyPos; const bx=b.bx,by=b.by,bw=b.bw,bh=b.bh; g.clear(); g.fillStyle(COL.shadow,0.5); g.fillRoundedRect(bx+2,by+5,bw,bh,13); if(active){ g.fillStyle(0x8a6d1f,1); g.fillRoundedRect(bx,by+4,bw,bh,13); g.fillStyle(COL.gold,1); g.fillRoundedRect(bx,by,bw,bh,13); g.fillStyle(0xfff3c4,0.5); g.fillRoundedRect(bx+3,by+3,bw-6,bh*0.42,11); g.lineStyle(2,0xffeb7a,1); g.strokeRoundedRect(bx,by,bw,bh,13); this.doublerText.setText("2X ACTIVE"); } else { g.fillStyle(0x7a3e0c,1); g.fillRoundedRect(bx,by+4,bw,bh,13); g.fillStyle(0xd9751e,1); g.fillRoundedRect(bx,by,bw,bh,13); g.fillStyle(0xffc58d,0.5); g.fillRoundedRect(bx+3,by+3,bw-6,bh*0.42,11); g.lineStyle(2,0xffa452,1); g.strokeRoundedRect(bx,by,bw,bh,13); this.doublerText.setText(this._doublerLabel()); } }
  _startDoublerBlink(){ if(this.doublerTween){ this.doublerTween.remove(); this.doublerTween=null; } this.doublerBtn.setAlpha(1); if(!this.scene.coinDoublerActive){ this.doublerTween=this.scene.tweens.add({targets:this.doublerBtn,alpha:0.35,duration:500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); } }
  onDoublerClick(){ const s=this.scene; if(s.coinDoublerActive) return;
    if(!s.doublerFreeUsed){ s.doublerFreeUsed=true; this._activateDoubler(); return; }
    if(Platform.extraCount('doubler')>0){ Platform.useExtra('doubler'); this._activateDoubler(); return; }
    openPurchase(s,{kind:'ability',key:'doubler',hasUse:false,shortCoins:0}); }
  _doublerLabel(){ const s=this.scene; return (!s.doublerFreeUsed||Platform.extraCount('doubler')>0)?'2X GOLD':'2X GOLD \u00b7 '+POWERUP_PRICE; }
  _activateDoubler(){ SFX.upgrade(); this.scene.coinDoublerActive=true; this._drawDoublerBtn(true); if(this.doublerTween){ this.doublerTween.remove(); this.doublerTween=null; } this.doublerBtn.setAlpha(1); this.scene.ui.announce('2X GOLD NEXT WAVE!',COL.gold); }
  showReady(){ if(!this.readyBtn||this.scene.gameIsOver) return; if(this.scene.wave&&this.scene.wave.wave<1) return; this.setReadyUrgent(false); this.readyBtn.setVisible(true); if(this.readyText) this.readyText.setScale(1); this.scene.coinDoublerActive=false; if(this.scene.coinDoublerTween){ this.scene.coinDoublerTween.remove(); this.scene.coinDoublerTween=null; } if(this.goldText) this.goldText.setScale(1); const why=this.scene.shouldOfferDoubler(); this._drawDoublerBtn(false); this.doublerBtn.setVisible(!!why); if(why){ this._startDoublerBlink(); const wv=this.scene.wave.wave; if(this._doublerAnnounced!==wv){ this._doublerAnnounced=wv; this.announce(this.scene.doublerFreeUsed&&Platform.extraCount('doubler')<=0?'2X GOLD AVAILABLE: '+POWERUP_PRICE+' GOLD':'WAVE BONUS: 2X GOLD!',COL.gold); } } }
  setReadyUrgent(u){ u=!!u; if(this.readyUrgent===u) return; this.readyUrgent=u; this._drawReady(); if(this.readyGlowTween&&this.readyGlowTween.remove) this.readyGlowTween.remove(); if(u&&this.readyGlow){ this.readyGlow.setAlpha(0.4); this.readyGlowTween=this.scene.tweens.add({targets:this.readyGlow,alpha:1,duration:420,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); } else if(this.readyGlow){ this.readyGlow.setAlpha(1); this.readyGlow.clear(); } }
  hideReady(){ if(this.readyBtn) this.readyBtn.setVisible(false); if(this.doublerBtn) this.doublerBtn.setVisible(false); if(this.doublerTween){ this.doublerTween.remove(); this.doublerTween=null; } }
  _menu(){ this.menu=this.scene.add.container(0,0).setDepth(1300).setVisible(false); this.layer.add(this.menu);
    const ov=this.scene.add.graphics(); ov.fillStyle(COL.shadow,0.78); ov.fillRect(-1600,-1600,this.W+3200,this.H+3200); this.menu.add(ov); this.menuOv=ov;
    const oz=this.scene.add.zone(0,0,this.W,this.H).setOrigin(0).setInteractive(); this.menu.add(oz); oz.on('pointerdown',()=>this.toggleMenu());
    const mw=440,mh=388; const card=this.scene.add.container(this.W/2,this.H/2); this.menu.add(card); this.menuCard=card; const hx=-mw/2,hy=-mh/2;
    const glow=this.scene.add.graphics(); glow.fillStyle(COL.cyan,0.12); glow.fillRoundedRect(hx-7,hy-7,mw+14,mh+14,26); card.add(glow);
    const p=this.scene.add.graphics(); p.fillStyle(COL.shadow,0.5); p.fillRoundedRect(hx+5,hy+10,mw,mh,22); p.fillStyle(COL.panel,1); p.fillRoundedRect(hx,hy,mw,mh,22); p.fillStyle(COL.cyanDk,0.55); p.fillRoundedRect(hx,hy,mw,72,{tl:22,tr:22,bl:0,br:0}); p.fillStyle(COL.cyan,0.10); p.fillRoundedRect(hx+4,hy+4,mw-8,30,{tl:18,tr:18,bl:0,br:0}); p.lineStyle(2,COL.cyan,0.6); p.strokeRoundedRect(hx,hy,mw,mh,22); card.add(p);
    const acc=this.scene.add.graphics(); acc.fillStyle(COL.cyan,0.92); const _cl=22,_ct=2.5; [[hx+13,hy+13,1,1],[hx+mw-13,hy+13,-1,1],[hx+13,hy+mh-13,1,-1],[hx+mw-13,hy+mh-13,-1,-1]].forEach(c=>{ const ax=c[0],ay=c[1],sxv=c[2],syv=c[3]; acc.fillRect(sxv>0?ax:ax-_cl,ay-_ct/2,_cl,_ct); acc.fillRect(ax-_ct/2,syv>0?ay:ay-_cl,_ct,_cl); }); card.add(acc);
    { const _t=this.scene.add.text(0,hy+26,'\u2693  '+GAME_NAME.toUpperCase(),{fontFamily:'Space Grotesk',fontSize:'21px',fontStyle:'bold',color:CSS(COL.cyan)}).setOrigin(0.5); if(_t.width>300) _t.setScale(300/_t.width); card.add(_t); }
    const _guideStr=this.scene.isTouch?'Defend the castle. Enemy fleets attack your\ndefenses AND the castle - watch your turrets!\n\nTap turret buttons on left to build \u00b7 Touch wheel to aim\nTap a turret to upgrade or rotate it. \nEvery defense has a firing arc - mind the blind spot!':'Defend the castle. Enemy fleets attack your\ndefenses AND the castle - watch your turrets!\n\nKeys: 1-6 build \u00b7 AIM button rotates (20 coins) \u00b7 Space pause\nTap a turret to upgrade or rotate it.\nEvery defense has a firing arc - mind the blind spot!'; card.add(this.scene.add.text(0,hy+84,_guideStr,{fontFamily:'Space Grotesk',fontSize:'13px',color:CSS(COL.textDim),align:'center'}).setOrigin(0.5,0));
    const bw=mw-72,bx=-bw/2,bh=46,bgap=12; const sy=hy+mh-20-bh-(bh+bgap)*2; this.soundBtnG=this.scene.add.graphics(); card.add(this.soundBtnG); this.soundBtnX=bx; this.soundBtnY=sy; this.soundBtnW=bw; this.soundBtnH=bh;
    this.soundText=this.scene.add.text(0,sy+bh/2,'',{fontFamily:'Space Grotesk',fontSize:'16px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5); card.add(this.soundText);
    const soundZ=this.scene.add.zone(bx,sy,bw,bh).setOrigin(0).setInteractive(); card.add(soundZ); soundZ.on('pointerdown',()=>{ SFX.muted=!SFX.muted; if(!SFX.muted) SFX.ui(); this._refreshSound(); });
    const ry=sy+(bh+bgap); const cb=this.scene.add.graphics(); cb.fillStyle(COL.cyan,0.18); cb.fillRoundedRect(bx-4,ry-4,bw+8,bh+8,15); cb.fillStyle(COL.shadow,0.4); cb.fillRoundedRect(bx+2,ry+3,bw,bh,12); cb.fillStyle(COL.cyanDk,1); cb.fillRoundedRect(bx,ry,bw,bh,12); cb.fillStyle(0x6fd9e8,0.45); cb.fillRoundedRect(bx+3,ry+3,bw-6,bh*0.4,9); cb.lineStyle(2,COL.cyan,0.95); cb.strokeRoundedRect(bx,ry,bw,bh,12); card.add(cb); card.add(this.scene.add.text(0,ry+bh/2,'\u25B6  RESUME',{fontFamily:'Space Grotesk',fontSize:'18px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5)); const cz=this.scene.add.zone(bx,ry,bw,bh).setOrigin(0).setInteractive(); card.add(cz); cz.on('pointerdown',()=>this.toggleMenu());
    const cyy=ry+(bh+bgap); const rb=this.scene.add.graphics(); rb.fillStyle(COL.shadow,0.4); rb.fillRoundedRect(bx+2,cyy+3,bw,bh,12); rb.fillStyle(COL.enemyDk,1); rb.fillRoundedRect(bx,cyy,bw,bh,12); rb.lineStyle(2,COL.red,0.85); rb.strokeRoundedRect(bx,cyy,bw,bh,12); card.add(rb); card.add(this.scene.add.text(0,cyy+bh/2,'\u21BB  RESTART',{fontFamily:'Space Grotesk',fontSize:'16px',fontStyle:'bold',color:CSS(COL.white)}).setOrigin(0.5)); const rz=this.scene.add.zone(bx,cyy,bw,bh).setOrigin(0).setInteractive(); card.add(rz); rz.on('pointerdown',()=>this.scene.restart());
    this._refreshSound();
  }
  _refreshSound(){ const g=this.soundBtnG; g.clear(); const w=this.soundBtnW||180,h=this.soundBtnH||40; g.fillStyle(SFX.muted?COL.panelLite:COL.cyanDk,1); g.fillRoundedRect(this.soundBtnX,this.soundBtnY,w,h,12); g.lineStyle(1.5,SFX.muted?COL.panelEdge:COL.cyan,0.7); g.strokeRoundedRect(this.soundBtnX,this.soundBtnY,w,h,12); this.soundText.setText(SFX.muted?'Sound: OFF':'Sound: ON'); }
  toggleMenu(){ SFX.ui(); const v=!this.menu.visible; if(v){ this.menu.setVisible(true); if(this.menuOv){ this.menuOv.setAlpha(0); this.scene.tweens.add({targets:this.menuOv,alpha:1,duration:200}); } if(this.menuCard){ this.menuCard.setScale(0.6).setAlpha(0); this.scene.tweens.add({targets:this.menuCard,scaleX:1,scaleY:1,alpha:1,duration:320,ease:'Back.easeOut'}); } this.scene._prevPaused=this.scene.paused; this.scene.paused=true; } else { if(this.menuCard) this.scene.tweens.add({targets:this.menuCard,scaleX:0.7,scaleY:0.7,alpha:0,duration:160,ease:'Quad.easeIn'}); this.scene.tweens.add({targets:this.menuOv,alpha:0,duration:170,onComplete:()=>this.menu.setVisible(false)}); this.scene.paused=this.scene._prevPaused; } this.refreshControls(); }
}

export class Mine {
  constructor(scene,x,y){ this.scene=scene; this.x=x; this.y=y; this.alive=true; this.trigger=26; this.blast=96; this.dmg=150; this.armAt=scene.time.now+700; this.g=scene.add.graphics().setDepth(19); if(scene.textures.exists('mine')){ this.img=scene.add.image(x,y,'mine').setDepth(22); const _s=scene.textures.get('mine').getSourceImage(); this.img.setScale(25/Math.max(1,Math.max(_s.width,_s.height))); } this._draw(false); }
  _draw(armed){ const g=this.g; g.clear(); if(this.img){ this.img.setTint(armed?0xffaaaa:0xffffff); return; } g.fillStyle(COL.shadow,0.4); g.fillCircle(this.x+2,this.y+3,9); for(let k=0;k<8;k++){ const a=k*Math.PI/4; g.fillStyle(COL.rockDk,1); g.fillTriangle(this.x+Math.cos(a)*7,this.y+Math.sin(a)*7,this.x+Math.cos(a)*13,this.y+Math.sin(a)*13,this.x+Math.cos(a+0.3)*7,this.y+Math.sin(a+0.3)*7); } g.fillStyle(COL.rockDk,1); g.fillCircle(this.x,this.y,9); g.fillStyle(COL.rock,1); g.fillCircle(this.x-2,this.y-2,5); g.fillStyle(armed?COL.red:COL.gold,1); g.fillCircle(this.x,this.y,2.6); }
  update(time,dt){ if(!this.alive) return; const armed=time>=this.armAt; if(((time*0.008)|0)%2===0) this._draw(armed); if(!armed) return; const near=this.scene.shipGrid.query(this.x,this.y,this.trigger+24); for(let i=0;i<near.length;i++){ const s=near[i]; if(s.alive&&Phaser.Math.Distance.Between(this.x,this.y,s.x,s.y)<this.trigger+s.size){ this.explode(); return; } } }
  explode(){ if(!this.alive) return; this.alive=false; this.scene.fx.explode(this.x,this.y,this.blast*0.5); SFX.explode(); this.scene.fx.shake(0.006,120); const near=this.scene.shipGrid.query(this.x,this.y,this.blast); for(let i=0;i<near.length;i++){ const s=near[i]; if(s.alive&&Phaser.Math.Distance.Between(this.x,this.y,s.x,s.y)<=this.blast) s.damage(this.dmg,null); } this.g.destroy(); if(this.img) this.img.destroy(); const idx=this.scene.mines.indexOf(this); if(idx>=0) this.scene.mines.splice(idx,1); }
}
export class Friendly {
  constructor(scene,idx){ this.scene=scene; this.alive=true; this.angle=Math.random()*Math.PI*2; this.patrol=this.angle; this.orbit=scene.base.attackRadius+30+(idx%3)*18; this.spd=0.00055; this.moveSpeed=140; this.range=195; this.dmg=Math.round(20*GAMECFG.allies.navyDmgMul); this.fireRate=560; this.lastFire=0; this.size=12; this.face=0; this._vx=0; this._vy=0; this.hp=Math.round(310*GAMECFG.allies.navyHpMul); this.maxHp=this.hp; this.flashUntil=0; this.x=scene.base.x+Math.cos(this.angle)*this.orbit; this.y=scene.base.y+Math.sin(this.angle)*this.orbit;
    this.container=scene.add.container(this.x,this.y).setDepth(31); this.gfx=scene.add.graphics(); this.sprite=scene.add.image(0,0,'__DEFAULT').setVisible(false); this.turret=scene.add.graphics(); this.hpBar=scene.add.graphics(); this.container.add([this.gfx,this.sprite,this.turret,this.hpBar]); this.useSprite=false; this._draw(); }
  _draw(){ if(this.scene.textures.exists('ship_friendly')){ this.useSprite=true; this.gfx.clear(); this.sprite.setTexture('ship_friendly').setVisible(true).setOrigin(0.5); const _s=this.scene.textures.get('ship_friendly').getSourceImage(); this.sprite.setScale((this.size*2.9)/Math.max(1,_s.height)); return; } this.useSprite=false; this.sprite.setVisible(false); const g=this.gfx; g.clear(); const s=this.size,L=s*2.9,W=s*1.1; g.fillStyle(COL.shadow,0.3); g.fillEllipse(2,3,L,W); g.fillStyle(COL.cyanDk,1); g.beginPath(); g.moveTo(L*0.6,0); g.lineTo(L*0.28,-W*0.5); g.lineTo(-L*0.55,-W*0.45); g.lineTo(-L*0.6,0); g.lineTo(-L*0.55,W*0.45); g.lineTo(L*0.28,W*0.5); g.closePath(); g.fillPath(); g.fillStyle(COL.cyan,1); g.fillRoundedRect(-L*0.12,-W*0.28,L*0.32,W*0.56,2); g.fillStyle(COL.white,0.9); g.fillCircle(L*0.3,0,2.2); }
  _radius(){ return this.size+4; }
  _drawHp(){ const g=this.hpBar; g.clear(); if(!this.alive||this.hp>=this.maxHp) return; const w=this.size*2.2,h=3.4,yo=-this.size*2.9*0.5-7; const f=Phaser.Math.Clamp(this.hp/this.maxHp,0,1); const col=f>0.5?COL.green:(f>0.25?COL.gold:COL.red); g.fillStyle(col,1); g.fillRoundedRect(-w/2,yo,Math.max(2,w*f),h,1.5); }
  damage(a){ if(!this.alive) return; this.hp-=a; this.flashUntil=this.scene.time.now+120; if(this.hp<=0) this.die(); }
  die(){ if(!this.alive) return; this.alive=false; if(this.scene.fx) this.scene.fx.explode(this.x,this.y,34); SFX.explode(); const i=this.scene.friendlies.indexOf(this); if(i>=0) this.scene.friendlies.splice(i,1); if(this.container) this.container.destroy(); }
  update(time,dt){ if(!this.alive) return; const sc=this.scene; const base=sc.base;
    let best=null,bd=this.range*1.2; for(let i=0;i<sc.enemies.length;i++){ const e=sc.enemies[i]; if(!e.alive) continue; const dE=Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y); const dB=Phaser.Math.Distance.Between(base.x,base.y,e.x,e.y); if(dE<this.range*2.4 && dB<base.attackRadius+260 && dE<bd){ bd=dE; best=e; } }
    let gx,gy; if(best){ const ea=Math.atan2(best.y-this.y,best.x-this.x); gx=best.x-Math.cos(ea)*this.range*0.7; gy=best.y-Math.sin(ea)*this.range*0.7; } else { this.patrol+=this.spd*dt*sc.gameSpeed; gx=base.x+Math.cos(this.patrol)*this.orbit; gy=base.y+Math.sin(this.patrol)*this.orbit; }
    let dx=gx-this.x,dy=gy-this.y; const dl=Math.hypot(dx,dy)||1; dx/=dl; dy/=dl;
    let ax=0,ay=0,tnx=0,tny=0; const obs=sc.obstacles;
    for(let i=0;i<obs.length;i++){ const o=obs[i]; const odx=this.x-o.x,ody=this.y-o.y; const od=Math.hypot(odx,ody)||0.01; const safe=o.r+this.size+34; if(od<safe){ const f=(safe-od)/safe; const nx=odx/od,ny=ody/od; ax+=nx*f*3.0; ay+=ny*f*3.0; let cross=nx*dy-ny*dx; if(Math.abs(cross)<0.06) cross=((this.orbit|0)%2?1:-1); const sgn=cross>0?1:-1; tnx+=(-ny)*sgn*f; tny+=(nx)*sgn*f; } }
    const near=sc.shipGrid.query(this.x,this.y,40); for(let i=0;i<near.length;i++){ const s=near[i]; if(!s.alive) continue; const sdx=this.x-s.x,sdy=this.y-s.y; const sd=Math.hypot(sdx,sdy); if(sd<28&&sd>0.01){ const f=(28-sd)/28; ax+=(sdx/sd)*f*1.1; ay+=(sdy/sd)*f*1.1; } }
    for(let i=0;i<sc.friendlies.length;i++){ const o2=sc.friendlies[i]; if(o2===this||!o2.alive) continue; const sdx=this.x-o2.x,sdy=this.y-o2.y; const sd=Math.hypot(sdx,sdy); const minSep=this.size+o2.size+6; if(sd<minSep&&sd>0.01){ const nx=sdx/sd,ny=sdy/sd; const f=(minSep-sd)/minSep; ax+=nx*f*2.6; ay+=ny*f*2.6; const push=(minSep-sd)*0.5; this.x+=nx*push; this.y+=ny*push; } }
    let mvx=dx+ax+tnx*1.3, mvy=dy+ay+tny*1.3; const ml=Math.hypot(mvx,mvy)||1; mvx/=ml; mvy/=ml;
    const goalD=Math.hypot(gx-this.x,gy-this.y), obstPush=Math.hypot(ax,ay); if(goalD<10&&obstPush<0.05){ mvx=0; mvy=0; } const desSp=this.moveSpeed*sc.gameSpeed; this._vx+=((mvx*desSp)-this._vx)*0.18; this._vy+=((mvy*desSp)-this._vy)*0.18; this.x+=this._vx*(dt/1000); this.y+=this._vy*(dt/1000);
    for(let oi=0;oi<obs.length;oi++){ const oo=obs[oi]; const kdx=this.x-oo.x,kdy=this.y-oo.y; const kd=Math.hypot(kdx,kdy)||0.01; const mind=oo.r*1.12+this.size*0.6; if(kd<mind){ this.x=oo.x+(kdx/kd)*mind; this.y=oo.y+(kdy/kd)*mind; } }
    { const bdx=this.x-base.x,bdy=this.y-base.y; const bd=Math.hypot(bdx,bdy)||0.01; const md=base.radius+this.size+8; if(bd<md){ this.x=base.x+(bdx/bd)*md; this.y=base.y+(bdy/bd)*md; } }
    for(let oi=0;oi<sc.turrets.length;oi++){ const oo=sc.turrets[oi]; if(!oo.alive) continue; const kdx=this.x-oo.x,kdy=this.y-oo.y; const kd=Math.hypot(kdx,kdy)||0.01; const mind=oo._radius()+this.size*0.6; if(kd<mind){ this.x=oo.x+(kdx/kd)*mind; this.y=oo.y+(kdy/kd)*mind; } }
    this.x=Phaser.Math.Clamp(this.x,this.size,sc.worldW-this.size); this.y=Phaser.Math.Clamp(this.y,this.size,sc.worldH-this.size);
    if(Math.hypot(this._vx,this._vy)>3){ this.face=Phaser.Math.Angle.RotateTo(this.face,Math.atan2(this._vy,this._vx),0.12); } this.container.setPosition(this.x,this.y); this.container.setAlpha(this.scene.time.now<this.flashUntil?0.4:1); if(this.useSprite){ this.sprite.setRotation(this.face+Math.PI/2); } else { this.gfx.setRotation(this.face); } this._drawHp();
    this.turret.clear(); if(best && Phaser.Math.Distance.Between(this.x,this.y,best.x,best.y)<=this.range){ const ga=Math.atan2(best.y-this.y,best.x-this.x); this.turret.lineStyle(3,COL.cyanDk,1); this.turret.lineBetween(0,0,Math.cos(ga)*15,Math.sin(ga)*15); this.turret.fillStyle(COL.white,1); this.turret.fillCircle(0,0,3.2); if(time-this.lastFire>=this.fireRate){ this.lastFire=time; const mx=this.x+Math.cos(ga)*16,my=this.y+Math.sin(ga)*16; sc.spawnProjectile('shell',mx,my,best,this.dmg,560,0,true); sc.fx.muzzle(mx,my,COL.cyan); sc.playShoot('cannon'); } } }
}
