// Nur auf der deutschen Startseite eingebunden (auch als Offline-Fallback des Service Workers).
try {
  // /en ohne Slash landet offline im Fallback – auf die gecachte /en/ umleiten
  if (location.pathname === '/en') location.replace('/en/' + location.search + location.hash);
  // wer zuvor EN gewählt hat, landet vor dem ersten Rendern auf /en/
  else if (localStorage.getItem('noise-lang') === 'en' && location.pathname === '/') location.replace('/en/' + location.search + location.hash);
} catch { /* ohne Storage keine Umleitung */ }
