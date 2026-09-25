// "App installieren"-Button: Chromium über beforeinstallprompt, iOS nur mit Anleitung (dort gibt es keine API).
type BeforeInstallPromptEvent = Event & { prompt():Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}> };
const DISMISSED='noise-install-dismissed';

function dismissed(){try{return localStorage.getItem(DISMISSED)==='1';}catch{return false;}}
function remember(){try{localStorage.setItem(DISMISSED,'1');}catch{/* ohne Storage nur für diese Sitzung ausblenden */}}
function standalone(){return matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;}
function ios(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}

export function setupInstall(button:HTMLButtonElement,hint:HTMLElement){
  let deferred:BeforeInstallPromptEvent|null=null;
  const toggleHint=(open:boolean)=>{hint.hidden=!open;button.setAttribute('aria-expanded',String(open));};
  const hide=()=>{button.hidden=true;toggleHint(false);};
  if(standalone()||dismissed())return;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as BeforeInstallPromptEvent;button.hidden=false;});
  window.addEventListener('appinstalled',()=>{deferred=null;hide();});
  if(ios())button.hidden=false;
  button.addEventListener('click',async()=>{
    if(!deferred){toggleHint(hint.hidden);return;}
    const prompt=deferred;deferred=null;
    await prompt.prompt();
    const {outcome}=await prompt.userChoice;
    if(outcome==='dismissed')remember();
    hide();
  });
  hint.querySelector('[data-install-close]')?.addEventListener('click',()=>{toggleHint(false);button.focus();});
  hint.querySelector('[data-install-dismiss]')?.addEventListener('click',()=>{remember();hide();});
}
