export const SFX = {
  ctx:null, master:null, muted:false, phaserSound:null, bgMusic:null,
  musicTimer:null, musicGain:null, musicNext:0, musicStep:0, _nbuf:null, _vis:false,
  ensure(){
    if(!this.ctx){ try{ const AC=window.AudioContext||window.webkitAudioContext; this.ctx=new AC(); this.master=this.ctx.createGain(); this.master.gain.value=0.30; this.master.connect(this.ctx.destination);}catch(e){ this.ctx=null; } }
    if(this.ctx&&!this._vis&&typeof document!=='undefined'){ this._vis=true; document.addEventListener('visibilitychange',()=>{ if(!this.ctx) return; if(document.hidden){ this.ctx.suspend(); } else if(!this.muted){ this.ctx.resume(); } }); }
    if(this.ctx&&this.ctx.state==='suspended'&&!(typeof document!=='undefined'&&document.hidden)){ this.ctx.resume(); }
  },
  playPhaser(key, loop=false, vol=1.0){
    if(this.muted) return true;
    if(this.phaserSound && this.phaserSound.game && this.phaserSound.game.cache && this.phaserSound.game.cache.audio.exists(key)){
      try {
        if(loop){
          const s = this.phaserSound.get(key);
          if(s){
            if(!s.isPlaying) s.play({ loop:true, volume:vol });
          } else {
            this.phaserSound.play(key, { loop:true, volume:vol });
          }
        } else {
          this.phaserSound.play(key, { volume:vol });
        }
        return true;
      } catch(e){}
    }
    return false;
  },
  playBg(){
    this.ensure(); if(!this.ctx||this.musicTimer) return;
    if(!this.musicGain){ this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=0.55; this.musicGain.connect(this.master); }
    this.musicStep=0; this.musicNext=this.ctx.currentTime+0.12;
    this.musicTimer=setInterval(()=>this._musicTick(),90);
  },
  stopBg(){
    if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; }
    if(this.bgMusic){ try{ this.bgMusic.stop(); }catch(e){} }
  },
  _musicTick(){
    const c=this.ctx; if(!c) return;
    const STEP=60/96/4;
    if(this.musicNext<c.currentTime) this.musicNext=c.currentTime+0.05;
    while(this.musicNext<c.currentTime+0.35){
      if(!this.muted) this._musicStep(this.musicStep,this.musicNext);
      this.musicStep=(this.musicStep+1)%128; this.musicNext+=STEP;
    }
  },
  _musicStep(n,t){
    const CH=[ {r:110,  c:[220,261.63,329.63]},
               {r:87.31,c:[174.61,220,261.63]},
               {r:130.81,c:[261.63,329.63,392]},
               {r:98,   c:[196,246.94,293.66]} ];
    const bar=Math.floor(n/16), s=n%16, ch=CH[bar%4], second=bar>=4;
    if(s%2===0) this._note(ch.r*(s===6||s===14?2:1),t,0.24,'triangle',s%8===0?0.20:0.13,0.01,500);
    if(s===0) ch.c.forEach(f=>this._note(f,t,2.3,'triangle',0.05,0.35,900));
    if(s%2===1) this._note(ch.c[((s-1)/2)%3]*(second&&s>7?4:2),t,0.17,'square',0.035,0.005,2400);
    if(s===0||s===8||(second&&s===10)) this._kick(t);
    if(s===4||s===12) this._hat(t,0.11,2800,0.13);
    if(s%2===0&&s!==4&&s!==12) this._hat(t,0.05,7000,0.04);
  },
  _note(f,t,d,type,v,a,lp){
    const c=this.ctx, o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+a); g.gain.exponentialRampToValueAtTime(0.0008,t+d);
    if(lp){ const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=lp; o.connect(fl); fl.connect(g); } else o.connect(g);
    g.connect(this.musicGain); o.start(t); o.stop(t+d+0.05);
  },
  _kick(t){
    const c=this.ctx, o=c.createOscillator(), g=c.createGain(); o.type='sine';
    o.frequency.setValueAtTime(135,t); o.frequency.exponentialRampToValueAtTime(42,t+0.12);
    g.gain.setValueAtTime(0.45,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+0.22);
  },
  _hat(t,dur,hp,v){
    const c=this.ctx;
    if(!this._nbuf){ const n=Math.floor(c.sampleRate*0.2); this._nbuf=c.createBuffer(1,n,c.sampleRate); const d=this._nbuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; }
    const src=c.createBufferSource(); src.buffer=this._nbuf;
    const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp;
    const g=c.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(this.musicGain); src.start(t); src.stop(t+dur+0.02);
  },
  tone(freq,dur,type,vol,slideTo){
    if(this.muted||!this.ctx) return;
    const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain();
    o.type=type||'square'; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
    g.gain.setValueAtTime(vol||0.25,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur,vol,filt){
    if(this.muted||!this.ctx) return;
    const t=this.ctx.currentTime; const n=Math.floor(this.ctx.sampleRate*dur);
    const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate); const d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol||0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    const lp=this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=filt||1200;
    src.connect(lp); lp.connect(g); g.connect(this.master); src.start(t);
  },
  shoot(kind){
    this.ensure();
    if(kind==='laser'){
      if(this.playPhaser('sfx_laser', false, 0.25)) return;
      this.tone(900,0.10,'sawtooth',0.10,500);
    } else if(kind==='missile'){
      if(this.playPhaser('sfx_missile', false, 0.45)) return;
      this.tone(300,0.16,'square',0.16,120);
    } else {
      if(this.playPhaser('sfx_shoot', false, 0.35)) return;
      this.tone(440,0.07,'square',0.14,200);
    }
  },
  marine(){
    this.ensure();
    if(this.playPhaser('sfx_hit', false, 0.25)) return;
    this.tone(1100,0.04,'square',0.07,700);
  },
  hit(){
    this.ensure();
    if(this.playPhaser('sfx_hit', false, 0.25)) return;
    this.tone(260,0.06,'triangle',0.10,160);
  },
  dry(){
    this.ensure();
    if(this.playPhaser('sfx_dry', false, 0.25)) return;
    this.tone(180,0.07,'square',0.06,120);
  },
  explode(){
    this.ensure();
    if(this.playPhaser('sfx_explode', false, 0.45)) return;
    this.noise(0.35,0.35,900); this.tone(120,0.3,'sawtooth',0.18,40);
  },
  place(){
    this.ensure();
    if(this.playPhaser('sfx_place', false, 0.35)) return;
    this.tone(520,0.08,'sine',0.2,720); this.tone(720,0.10,'sine',0.18,900);
  },
  upgrade(){
    this.ensure();
    if(this.playPhaser('sfx_upgrade', false, 0.35)) return;
    this.tone(600,0.09,'sine',0.2,900); this.tone(900,0.12,'sine',0.18,1300);
  },
  sell(){
    this.ensure();
    if(this.playPhaser('sfx_sell', false, 0.35)) return;
    this.tone(500,0.10,'sine',0.18,260);
  },
  rotate(){
    this.ensure();
    if(this.playPhaser('sfx_rotate', false, 0.25)) return;
    this.tone(360,0.04,'square',0.07,420);
  },
  ability(){
    this.ensure();
    if(this.playPhaser('sfx_ability', false, 0.45)) return;
    this.tone(420,0.18,'sawtooth',0.2,820);
  },
  wave(){
    this.ensure();
    if(this.playPhaser('sfx_wave', false, 0.4)) return;
    this.tone(330,0.18,'square',0.18,500); this.tone(500,0.2,'square',0.16,660);
  },
  ui(){
    this.ensure();
    if(this.playPhaser('sfx_ui', false, 0.25)) return;
    this.tone(640,0.04,'sine',0.10,640);
  },
  gameover(){
    this.ensure();
    this.stopBg();
    if(this.playPhaser('sfx_gameover', false, 0.5)) return;
    this.tone(400,0.5,'sawtooth',0.25,80);
  }
};
