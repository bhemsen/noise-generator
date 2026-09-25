import './style.css';
import {NoiseEngine} from './audio';
import {load,save,type Settings,type Preset} from './storage';
import {registerSW} from 'virtual:pwa-register';
registerSW({immediate:true});

const defaults:Settings={slope:-6,low:20,high:20000,volume:35,width:100,fade:2,timer:0};
const colors=[['Brown',-6],['Pink',-3],['White',0],['Blue',3],['Violet',6]] as const;
const engine=new NoiseEngine();
let settings={...defaults};let presets:Preset[]=[];let activeTimer:number|undefined;let endAt=0;let saving:number|undefined;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="shell">
<header><div class="brand"><span class="brand-icon">≋</span><div><strong>NOISE</strong><small>OFFLINE SOUND STUDIO</small></div></div><span class="offline" id="network">● LOCAL FIRST</span></header>
<section class="hero"><span class="eyebrow">YOUR SPACE. YOUR SOUND.</span><h1>Find your<br><em>frequency.</em></h1><p>Generatives Rauschen, genau so wie du es brauchst. Keine Accounts, keine Audiodateien, kein Tracking.</p></section>
<section class="player panel"><div class="player-top"><div><span class="eyebrow">NOW PLAYING</span><h2 id="now">Brown Noise</h2></div><span class="pill" id="status">BEREIT</span></div><canvas id="spectrum" width="1000" height="180" aria-label="Live-Frequenzspektrum"></canvas><div class="player-bottom"><button class="play" id="play" aria-label="Wiedergabe starten">▶</button><div><strong id="play-label">Start listening</strong><small id="timer-label">Endloswiedergabe</small></div><span class="headphones">◖))</span></div></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">01 / SOUND COLOR</span><h2>Noise Color</h2></div><span class="value" id="slope-value">−6 dB/oct</span></div><div class="presets" id="colors"></div><label for="slope">Spektralneigung <output id="slope-out"></output></label><input type="range" id="slope" min="-6" max="6" step="0.5"/><div class="range-ends"><span>DEEP</span><span>BRIGHT</span></div><p class="hint">Die Farb-Presets verwenden angenäherte Spektren; die dB/Oktave-Werte sind Richtwerte, keine kalibrierte Messung.</p></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">02 / TONE SHAPING</span><h2>Frequency Range</h2></div></div><label for="low">Low cut <output id="low-out"></output></label><input type="range" id="low" min="20" max="1000" step="1"/><label for="high">High cut <output id="high-out"></output></label><input type="range" id="high" min="1000" max="20000" step="100"/><p class="hint">Grenzfrequenzen der Filter; außerhalb des Bereichs wird das Signal gedämpft, nicht hart abgeschnitten.</p></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">03 / SPATIAL AUDIO</span><h2>Sound & Space</h2></div></div><label for="volume">Volume <output id="volume-out"></output></label><input type="range" id="volume" min="0" max="100" step="1"/><label for="width">Stereo width <output id="width-out"></output></label><input type="range" id="width" min="0" max="100" step="1"/><div class="range-ends"><span>MONO</span><span>INDEPENDENT L/R</span></div></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">04 / WIND DOWN</span><h2>Sleep & Fade</h2></div></div><label for="timer">Sleep timer <output id="timer-out"></output></label><select id="timer"><option value="0">Aus</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="60">60 Minuten</option><option value="120">120 Minuten</option></select><label for="fade">Fade in / out <output id="fade-out"></output></label><input type="range" id="fade" min="0" max="15" step="0.5"/></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">05 / YOUR COLLECTION</span><h2>Meine Presets</h2></div><span class="pill">LOKAL</span></div><div class="save-row"><input id="preset-name" maxlength="48" placeholder="Name für neues Preset" aria-label="Preset-Name"/><button class="primary" id="save-preset">Speichern</button></div><div id="saved-presets" class="saved-presets"></div><div class="button-row"><button id="backup">↓ JSON sichern</button><button id="restore">↑ JSON importieren</button><input id="import-file" type="file" accept="application/json,.json" hidden/></div><p class="hint">Nur auf diesem Gerät gespeichert. Browserdaten löschen kann Presets entfernen – sichere sie bei Bedarf als JSON.</p></section>
<section class="panel"><div class="section-head"><div><span class="eyebrow">06 / TAKE IT WITH YOU</span><h2>WAV Export</h2></div></div><p class="hint">Erzeuge eine Stereo-WAV-Datei deiner aktuellen Konfiguration (44,1 kHz / 16 Bit). Keine Serverübertragung.</p><label for="duration">Dauer <output id="duration-out">30 s</output></label><select id="duration"><option value="15">15 Sekunden</option><option value="30" selected>30 Sekunden</option><option value="60">60 Sekunden</option><option value="120">120 Sekunden</option></select><button class="primary full" id="export">WAV erzeugen</button></section>
<footer><p>MADE FOR QUIET MOMENTS · 100% CLIENT SIDE · NO ACCOUNT</p><nav class="footer-links" aria-label="Rechtliches und Links"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a><a href="https://bhemsen.de" target="_blank" rel="noopener">bhemsen.de</a></nav><a class="sponsor" href="https://github.com/sponsors/bhemsen" target="_blank" rel="noopener">♥ Sponsor on GitHub</a></footer>
</main><div id="toast" role="status" aria-live="polite"></div>`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const number=(id:string)=>Number(($(id) as HTMLInputElement).value);
const format=(n:number)=>new Intl.NumberFormat('de-DE').format(n);
function toast(message:string){const t=$('toast');t.textContent=message;t.classList.add('show');window.setTimeout(()=>t.classList.remove('show'),4500);}
function persist(){window.clearTimeout(saving);saving=window.setTimeout(()=>{void save('settings',settings).catch(()=>toast('Speichern nicht möglich – Browser-Speicher prüfen.'));},250);}
function setStatus(text:string){$('status').textContent=text;}
function updateUI(){
  for(const key of ['slope','low','high','volume','width','fade'] as const){($(key) as HTMLInputElement).value=String(settings[key]);}
  ($<HTMLSelectElement>('timer')).value=String(settings.timer);
  $('slope-value').textContent=`${settings.slope>0?'+':''}${settings.slope} dB/oct`;
  $('slope-out').textContent=$('slope-value').textContent;
  $('low-out').textContent=`${format(settings.low)} Hz`;$('high-out').textContent=`${format(settings.high)} Hz`;
  $('volume-out').textContent=`${settings.volume}%`;$('width-out').textContent=`${settings.width}%`;
  $('fade-out').textContent=`${settings.fade} s`;$('timer-out').textContent=settings.timer?`${settings.timer} min`:'Aus';
  const matched=colors.find(c=>c[1]===settings.slope);
  $('now').textContent=matched?`${matched[0]} Noise`:'Custom Noise';
  document.querySelectorAll<HTMLButtonElement>('[data-slope]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slope)===settings.slope));
}
function setSettings(s:Settings){settings={...s};updateUI();engine.update(settings);persist();if(engine.playing)scheduleTimer();}
function scheduleTimer(){window.clearTimeout(activeTimer);endAt=settings.timer?Date.now()+settings.timer*60000:0;
  if(endAt)activeTimer=window.setTimeout(()=>void stop(),settings.timer*60000);
}
function mediaState(playing:boolean){if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:$('now').textContent||'Noise',artist:'Offline Noise Generator'});navigator.mediaSession.playbackState=playing?'playing':'paused';}}
function displayPlaying(playing:boolean){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Wiedergabe stoppen':'Wiedergabe starten');$('play-label').textContent=playing?'Playing now':'Start listening';setStatus(playing?'SPIELT':'BEREIT');mediaState(playing);}
async function start(){try{await engine.start(settings);displayPlaying(true);scheduleTimer();}catch(e){toast(`Audio konnte nicht gestartet werden: ${String(e)}`);}}
async function stop(){window.clearTimeout(activeTimer);endAt=0;displayPlaying(false);await engine.stop(settings.fade);}
$('play').addEventListener('click',async()=>{if(engine.playing)await stop();else await start();});
for(const [name,slope] of colors){const button=document.createElement('button');button.textContent=name;button.dataset.slope=String(slope);button.addEventListener('click',()=>setSettings({...settings,slope}));$('colors').append(button);}
for(const key of ['slope','low','high','volume','width','fade'] as const){$(key).addEventListener('input',()=>{settings={...settings,[key]:number(key)};updateUI();engine.update(settings);persist();});}
$('timer').addEventListener('change',()=>{settings.timer=number('timer');updateUI();persist();if(engine.playing)scheduleTimer();});
function renderPresets(){const target=$('saved-presets');target.replaceChildren();if(!presets.length){target.textContent='Noch keine eigenen Presets gespeichert.';target.classList.add('empty');return;}target.classList.remove('empty');
  for(const p of presets){const row=document.createElement('div');row.className='saved-row';const label=document.createElement('button');label.className='preset-load';label.textContent=p.name;label.title='Preset laden';label.addEventListener('click',()=>{setSettings(p.settings);toast(`„${p.name}“ geladen`);});
    const rename=document.createElement('button');rename.textContent='✎';rename.title='Umbenennen';rename.setAttribute('aria-label',`${p.name} umbenennen`);rename.addEventListener('click',async()=>{const next=prompt('Neuer Name',p.name)?.trim();if(!next)return;p.name=next.slice(0,48);await save('presets',presets);renderPresets();});
    const del=document.createElement('button');del.textContent='×';del.title='Löschen';del.setAttribute('aria-label',`${p.name} löschen`);del.addEventListener('click',async()=>{if(!confirm(`Preset „${p.name}“ löschen?`))return;presets=presets.filter(x=>x.id!==p.id);await save('presets',presets);renderPresets();});row.append(label,rename,del);target.append(row);}}
$('save-preset').addEventListener('click',async()=>{const name=$<HTMLInputElement>('preset-name').value.trim();if(!name){toast('Bitte einen Namen eingeben.');return;}presets.unshift({id:crypto.randomUUID(),name,settings:{...settings},createdAt:Date.now()});try{await save('presets',presets);renderPresets();$<HTMLInputElement>('preset-name').value='';toast('Preset lokal gespeichert.');}catch{toast('Preset konnte nicht gespeichert werden.');}});
$('backup').addEventListener('click',()=>{const data=JSON.stringify({format:'noise-presets',version:1,presets},null,2);download(new Blob([data],{type:'application/json'}),'noise-presets.json');});
$('restore').addEventListener('click',()=>$<HTMLInputElement>('import-file').click());
function validSettings(s:unknown):s is Settings {if(!s||typeof s!=='object')return false;const v=s as Record<string,unknown>;return ['slope','low','high','volume','width','fade','timer'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]));}
$('import-file').addEventListener('change',async()=>{const file=$<HTMLInputElement>('import-file').files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text()) as {format?:string;presets?:unknown};if(obj.format!=='noise-presets'||!Array.isArray(obj.presets)||obj.presets.length>1000)throw Error('Ungültige Datei');
  const imported:Preset[]=obj.presets.map((p:unknown)=>{if(!p||typeof p!=='object')throw Error('Ungültiges Preset');const item=p as Preset;if(typeof item.name!=='string'||!validSettings(item.settings))throw Error('Ungültiges Preset');return{id:crypto.randomUUID(),name:item.name.slice(0,48),settings:sanitize(item.settings),createdAt:Date.now()};});
  presets=[...imported,...presets];await save('presets',presets);renderPresets();toast(`${imported.length} Presets importiert.`);
}catch(e){toast(`Import fehlgeschlagen: ${String(e)}`);}finally{$<HTMLInputElement>('import-file').value='';}});
function sanitize(s:Settings):Settings{return {slope:Math.max(-6,Math.min(6,s.slope)),low:Math.max(20,Math.min(1000,s.low)),high:Math.max(1000,Math.min(20000,s.high)),volume:Math.max(0,Math.min(100,s.volume)),width:Math.max(0,Math.min(100,s.width)),fade:Math.max(0,Math.min(15,s.fade)),timer:[0,15,30,60,120].includes(s.timer)?s.timer:0};}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('duration').addEventListener('change',()=>$('duration-out').textContent=`${number('duration')} s`);
$('export').addEventListener('click',async()=>{const button=$<HTMLButtonElement>('export');button.disabled=true;button.textContent='WAV wird erzeugt …';try{const wav=await engine.exportWav(settings,number('duration'));download(wav,`noise-${Date.now()}.wav`);toast('WAV wurde erzeugt.');}catch(e){toast(`Export fehlgeschlagen: ${e instanceof Error?e.message:String(e)}`);}finally{button.disabled=false;button.textContent='WAV erzeugen';}});
if('mediaSession' in navigator){navigator.mediaSession.setActionHandler('play',()=>void start());navigator.mediaSession.setActionHandler('pause',()=>void stop());navigator.mediaSession.setActionHandler('stop',()=>void stop());}
const canvas=$<HTMLCanvasElement>('spectrum');const ctx=canvas.getContext('2d')!;const spectrum=new Uint8Array(1024);
function draw(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#101b20';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#25373c';ctx.lineWidth=1;
 for(let y=30;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 if(engine.analyser&&engine.playing){engine.analyser.getByteFrequencyData(spectrum);ctx.beginPath();ctx.strokeStyle='#a7efac';ctx.lineWidth=2.5;
 for(let i=0;i<180;i++){const index=Math.min(1023,Math.floor((Math.pow(1024,i/179)-1)));const x=i/179*w,y=h-12-spectrum[index]/255*(h-24);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 else{ctx.beginPath();ctx.strokeStyle='#658d77';ctx.lineWidth=2;for(let i=0;i<w;i+=4){const y=h*.52+Math.sin(i*.025)*11+Math.sin(i*.08)*6;if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}ctx.stroke();}
 if(endAt){const remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));$('timer-label').textContent=`Noch ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;}else $('timer-label').textContent='Endloswiedergabe';
 requestAnimationFrame(draw);}
async function init(){settings=sanitize(await load('settings',defaults));presets=await load('presets',[]);updateUI();renderPresets();draw();}
void init();
