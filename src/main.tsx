import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

/**
 * React entry point.
 *
 * The Three.js hero pipeline (main.ts logic) runs imperatively alongside React.
 * App.tsx renders the narrative sections that were previously built by
 * webNarrativeMount.ts's imperative DOM construction.
 *
 * CSS load order (preserved): tailwind.css → style.css
 */

// --- Bootstrap the Three.js hero ---
// Import as side effect: fires the full pipeline (scene, camera, renderer,
// model loading, particle birth, post-processing, animate loop).
import './main';

// --- Mount React ---
const rootEl = document.getElementById('react-root');
if (!rootEl) throw new Error('Missing #react-root in index.html');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
