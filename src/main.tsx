import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Real visible height in px: works on every Safari, including the iPad address-bar / home-screen cases
const setAppHeight = () => {
  const el = document.documentElement, w = window.innerWidth, h = window.innerHeight;
  el.style.setProperty('--app-h', `${h}px`);
  // 'land' = phone held sideways (short), 'phone' = narrow portrait; anything bigger keeps the roomy iPad layouts
  const fit = w > h && h < 560 ? 'land' : w < 600 ? 'phone' : '';
  if (fit) el.dataset.fit = fit; else delete el.dataset.fit; // an empty data-fit would still match [data-fit] in CSS
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 250));
