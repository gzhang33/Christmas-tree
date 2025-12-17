import React from 'react';
import './src/index.css';
import { createRoot } from 'react-dom/client';
import { Analytics } from "@vercel/analytics/react";
import App from './src/App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);