import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // or './App.jsx' either works

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
