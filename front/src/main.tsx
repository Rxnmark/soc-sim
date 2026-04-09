import React from 'react';
import ReactDOM from 'react-dom/client';
// Правильний шлях до App.tsx
import App from './app/App'; 
// Правильний шлях до файлу стилів
import './styles/index.css'; 

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);