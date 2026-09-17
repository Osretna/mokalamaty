import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure browser tab favicon is set immediately
(() => {
  try {
    const existing = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (existing) {
      existing.href = '/favicon.svg?v=' + Date.now();
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = '/favicon.svg?v=' + Date.now();
      document.head.appendChild(link);
    }
  } catch (e) {
    console.debug('Favicon setup:', e);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
