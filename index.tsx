
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/inter';
import '@fontsource/playfair-display';
import '@fontsource/montserrat';
import '@fontsource/bangers';
import '@fontsource/lobster';
import '@fontsource/permanent-marker';
import '@fontsource/sacramento';
import '@fontsource/press-start-2p';
import '@fontsource/monoton';
import '@fontsource/alfa-slab-one';
import '@fontsource/cinzel-decorative';
import '@fontsource/faster-one';
import '@fontsource/righteous';
import '@fontsource/fredoka-one';
import '@fontsource/orbitron';
import '@fontsource/special-elite';
import '@fontsource/cookie';
import '@fontsource/satisfy';
import '@fontsource/kaushan-script';
import '@fontsource/pinyon-script';
import '@fontsource/rochester';
import '@fontsource/abril-fatface';
import '@fontsource/comfortaa';
import '@fontsource/unifrakturmaguntia';
import '@fontsource/creepster';
import '@fontsource/nosifer';
import '@fontsource/bungee-shade';

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
