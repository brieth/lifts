import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker for offline / home-screen install.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
}

// Fully disable zoom. The no-scaling viewport meta + touch-action cover Android;
// these guards handle iOS pinch gestures and desktop ctrl/⌘ zoom.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    if ((e as TouchEvent).touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
window.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) e.preventDefault();
  },
  { passive: false },
);
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
});
