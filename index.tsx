
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Global event listener for modal control
window.addEventListener('open-export-modal', () => {
  // This is handled via state inside App.tsx, but we can use this 
  // as a backup if we want components to trigger it.
  // In our case, we passed it through App.tsx's internal state mechanism 
  // and direct function props.
});
