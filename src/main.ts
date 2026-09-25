import './style.css';
import {NoiseEngine} from './audio';
import {load,save,type Settings,type Preset} from './storage';
import {setupInstall} from './install';
import {t,setupLangSwitch} from './i18n';
import {registerSW} from 'virtual:pwa-register';
registerSW({immediate:true});

const defaults:Settings={slope:-6,low:20,high:20000,volume:35,width:100,fade:2,timer:0};
const colors=[['Brown',-6],['Pink',-3],['White',0],['Blue',3],['Violet',6]] as const;
const engine=new NoiseEngine();
let settings={...defaults};let presets:Preset[]=[];let activeTimer:number|undefined;let endAt=0;let saving:number|undefined;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const number=(id:string)=>Number(($(id) as HTMLInputElement).value);
const format=(n:number)=>new Intl.NumberFormat(t('locale')).format(n);
setupInstall($<HTMLButtonElement>('install'),$('install-hint'));setupLangSwitch();
function toast(message:string){const t=$('toast');t.textContent=message;t.classList.add('show');window.setTimeout(()=>t.classList.remove('show'),4500);}
function persist(){window.clearTimeout(saving);saving=window.setTimeout(()=>{void save('settings',settings).catch(()=>toast(t('saveFailed')));},250);}
function setStatus(text:string){$('status').textContent=text;}
function updateUI(){
  for(const key of ['slope','low','high','volume','width','fade'] as const){($(key) as HTMLInputElement).value=String(settings[key]);}
  ($<HTMLSelectElement>('timer')).value=String(settings.timer);
  $('slope-value').textContent=`${settings.slope>0?'+':''}${settings.slope} dB/oct`;
  $('slope-out').textContent=$('slope-value').textContent;
  $('low-out').textContent=`${format(settings.low)} Hz`;$('high-out').textContent=`${format(settings.high)} Hz`;
  $('volume-out').textContent=`${settings.volume}%`;$('width-out').textContent=`${settings.width}%`;
  $('fade-out').textContent=`${settings.fade} s`;$('timer-out').textContent=settings.timer?`${settings.timer} min`:t('timerOff');
  const matched=colors.find(c=>c[1]===settings.slope);
  $('now').textContent=matched?`${matched[0]} Noise`:t('customNoise');
  document.querySelectorAll<HTMLButtonElement>('[data-slope]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slope)===settings.slope));
}
function setSettings(s:Settings){settings={...s};updateUI();engine.update(settings);persist();if(engine.playing)scheduleTimer();}
function scheduleTimer(){window.clearTimeout(activeTimer);endAt=settings.timer?Date.now()+settings.timer*60000:0;
  if(endAt)activeTimer=window.setTimeout(()=>void stop(),settings.timer*60000);
}
function mediaState(playing:boolean){if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:$('now').textContent||'Noise',artist:t('mediaArtist')});navigator.mediaSession.playbackState=playing?'playing':'paused';}}
function displayPlaying(playing:boolean){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?t('playStop'):t('playStart'));$('play-label').textContent=playing?t('labelPlaying'):t('labelStart');setStatus(playing?t('statusPlaying'):t('statusReady'));mediaState(playing);}
async function start(){try{await engine.start(settings);displayPlaying(true);scheduleTimer();}catch(e){toast(t('audioFailed',{error:String(e)}));}}
async function stop(){window.clearTimeout(activeTimer);endAt=0;displayPlaying(false);await engine.stop(settings.fade);}
$('play').addEventListener('click',async()=>{if(engine.playing)await stop();else await start();});
for(const [name,slope] of colors){const button=document.createElement('button');button.textContent=name;button.dataset.slope=String(slope);button.addEventListener('click',()=>setSettings({...settings,slope}));$('colors').append(button);}
for(const key of ['slope','low','high','volume','width','fade'] as const){$(key).addEventListener('input',()=>{settings={...settings,[key]:number(key)};updateUI();engine.update(settings);persist();});}
$('timer').addEventListener('change',()=>{settings.timer=number('timer');updateUI();persist();if(engine.playing)scheduleTimer();});
function renderPresets(){const target=$('saved-presets');target.replaceChildren();if(!presets.length){target.textContent=t('presetsEmpty');target.classList.add('empty');return;}target.classList.remove('empty');
  for(const p of presets){const row=document.createElement('div');row.className='saved-row';const label=document.createElement('button');label.className='preset-load';label.textContent=p.name;label.title=t('presetLoad');label.addEventListener('click',()=>{setSettings(p.settings);toast(t('presetLoaded',{name:p.name}));});
    const rename=document.createElement('button');rename.textContent='✎';rename.title=t('rename');rename.setAttribute('aria-label',t('renameLabel',{name:p.name}));rename.addEventListener('click',async()=>{const next=prompt(t('renamePrompt'),p.name)?.trim();if(!next)return;p.name=next.slice(0,48);await save('presets',presets);renderPresets();});
    const del=document.createElement('button');del.textContent='×';del.title=t('delete');del.setAttribute('aria-label',t('deleteLabel',{name:p.name}));del.addEventListener('click',async()=>{if(!confirm(t('deleteConfirm',{name:p.name})))return;presets=presets.filter(x=>x.id!==p.id);await save('presets',presets);renderPresets();});row.append(label,rename,del);target.append(row);}}
$('save-preset').addEventListener('click',async()=>{const name=$<HTMLInputElement>('preset-name').value.trim();if(!name){toast(t('nameMissing'));return;}presets.unshift({id:crypto.randomUUID(),name,settings:{...settings},createdAt:Date.now()});try{await save('presets',presets);renderPresets();$<HTMLInputElement>('preset-name').value='';toast(t('presetSaved'));}catch{toast(t('presetSaveFailed'));}});
$('backup').addEventListener('click',()=>{const data=JSON.stringify({format:'noise-presets',version:1,presets},null,2);download(new Blob([data],{type:'application/json'}),'noise-presets.json');});
$('restore').addEventListener('click',()=>$<HTMLInputElement>('import-file').click());
function validSettings(s:unknown):s is Settings {if(!s||typeof s!=='object')return false;const v=s as Record<string,unknown>;return ['slope','low','high','volume','width','fade','timer'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]));}
$('import-file').addEventListener('change',async()=>{const file=$<HTMLInputElement>('import-file').files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text()) as {format?:string;presets?:unknown};if(obj.format!=='noise-presets'||!Array.isArray(obj.presets)||obj.presets.length>1000)throw Error(t('invalidFile'));
  const imported:Preset[]=obj.presets.map((p:unknown)=>{if(!p||typeof p!=='object')throw Error(t('invalidPreset'));const item=p as Preset;if(typeof item.name!=='string'||!validSettings(item.settings))throw Error(t('invalidPreset'));return{id:crypto.randomUUID(),name:item.name.slice(0,48),settings:sanitize(item.settings),createdAt:Date.now()};});
  presets=[...imported,...presets];await save('presets',presets);renderPresets();toast(t('imported',{count:imported.length}));
}catch(e){toast(t('importFailed',{error:String(e)}));}finally{$<HTMLInputElement>('import-file').value='';}});
function sanitize(s:Settings):Settings{return {slope:Math.max(-6,Math.min(6,s.slope)),low:Math.max(20,Math.min(1000,s.low)),high:Math.max(1000,Math.min(20000,s.high)),volume:Math.max(0,Math.min(100,s.volume)),width:Math.max(0,Math.min(100,s.width)),fade:Math.max(0,Math.min(15,s.fade)),timer:[0,15,30,60,120].includes(s.timer)?s.timer:0};}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('duration').addEventListener('change',()=>$('duration-out').textContent=`${number('duration')} s`);
$('export').addEventListener('click',async()=>{const button=$<HTMLButtonElement>('export');button.disabled=true;button.textContent=t('wavBusy');try{const wav=await engine.exportWav(settings,number('duration'));download(wav,`noise-${Date.now()}.wav`);toast(t('wavDone'));}catch(e){toast(t('exportFailed',{error:e instanceof Error?e.message:String(e)}));}finally{button.disabled=false;button.textContent=t('wavButton');}});
if('mediaSession' in navigator){navigator.mediaSession.setActionHandler('play',()=>void start());navigator.mediaSession.setActionHandler('pause',()=>void stop());navigator.mediaSession.setActionHandler('stop',()=>void stop());}
const canvas=$<HTMLCanvasElement>('spectrum');const ctx=canvas.getContext('2d')!;const spectrum=new Uint8Array(1024);
function draw(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#101b20';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#25373c';ctx.lineWidth=1;
 for(let y=30;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 if(engine.analyser&&engine.playing){engine.analyser.getByteFrequencyData(spectrum);ctx.beginPath();ctx.strokeStyle='#a7efac';ctx.lineWidth=2.5;
 for(let i=0;i<180;i++){const index=Math.min(1023,Math.floor((Math.pow(1024,i/179)-1)));const x=i/179*w,y=h-12-spectrum[index]/255*(h-24);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 else{ctx.beginPath();ctx.strokeStyle='#658d77';ctx.lineWidth=2;for(let i=0;i<w;i+=4){const y=h*.52+Math.sin(i*.025)*11+Math.sin(i*.08)*6;if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}ctx.stroke();}
 if(endAt){const remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));$('timer-label').textContent=t('remaining',{time:`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`});}else $('timer-label').textContent=t('endless');
 requestAnimationFrame(draw);}
async function init(){settings=sanitize(await load('settings',defaults));presets=await load('presets',[]);updateUI();renderPresets();draw();}
void init();
