import { createRoot } from 'react-dom/client';
import { App as Cap } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '../../../src/styles.css';
import './app.css';
import { startViewport } from './viewport';
import { store } from './store';
import { supply } from './supply';
import { setMuted } from '../../../src/lib/sfx';
import App from './App';

startViewport();
const root = createRoot(document.getElementById('root')!);

(async () => {
  await store.load();
  setMuted(!store.settings.sound);
  await supply.init();
  root.render(<App />);
  setTimeout(() => { void SplashScreen.hide({ fadeOutDuration: 250 }); }, 120);
})();

// anything not yet on disk goes there the moment the app leaves the screen
const bye = () => { void store.flush(true); };
document.addEventListener('visibilitychange', () => { if (document.hidden) bye(); else void store.pull(); });
void Cap.addListener('pause', bye);
void Cap.addListener('resume', () => { void store.pull(); });
