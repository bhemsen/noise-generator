import {ui as de} from './i18n/de.json';
import {ui as en} from './i18n/en.json';

const LANG_KEY='noise-lang';
const dicts:Record<'de'|'en',typeof de>={de,en};
export const lang:'de'|'en'=document.documentElement.lang==='en'?'en':'de';
const dict=dicts[lang];

export function t(key:keyof typeof de,vars:Record<string,string|number>={}){
  return dict[key].replace(/\{(\w+)\}/g,(_,name:string)=>String(vars[name]??''));
}

// Merkt sich die explizite Sprachwahl; public/lang.js leitet / dann ggf. auf /en/ um.
export function setupLangSwitch(){
  document.querySelectorAll<HTMLAnchorElement>('[data-lang]').forEach(link=>link.addEventListener('click',()=>{
    try{localStorage.setItem(LANG_KEY,link.dataset.lang!);}catch{/* ohne Storage gilt die Wahl nur für diesen Aufruf */}
  }));
}
