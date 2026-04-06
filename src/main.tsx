import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeHttpsOnlyModePrevention } from "./utils/preventHttpsOnlyMode.ts";

// Auto-noindex on non-canonical domains (e.g., lovable.app preview/published URLs)
if (window.location.hostname.endsWith('.lovable.app')) {
  const noindex = document.createElement('meta');
  noindex.setAttribute('name', 'robots');
  noindex.setAttribute('content', 'noindex, nofollow');
  document.head.appendChild(noindex);
}

// Prevent extension interference (silent)
window.addEventListener('error', (e) => {
  if (e.filename?.includes('moz-extension://')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// Initialize HTTPS-Only mode prevention for camera proxy
initializeHttpsOnlyModePrevention();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
