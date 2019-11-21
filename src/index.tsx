import React from 'react';
import { render } from 'react-dom';
import 'semantic-ui-css/semantic.css';
import App from './components/App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const div = document.createElement('div');
div.id = 'app';
document.body.appendChild(div);

render(<App />, div);
