import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Real visible height in px: works on every Safari, including the iPad address-bar / home-screen cases
const setAppHeight = () => {
  const el = document.documentElement, w = window.innerWidth, h = window.innerHeight;
  el.style.setProperty('--app-h', `${h}px`);
  // 'land' = phone held sideways (short), 'phone' = narrow portrait; anything bigger keeps the roomy iPad layouts
  el.dataset.fit = w > h && h < 560 ? 'land' : w < 600 ? 'phone' : '';
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 250));
