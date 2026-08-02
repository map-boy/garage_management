import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/electron/renderer';
import App from './App.tsx';
import './index.css';

try {
  Sentry.init({
    dsn: 'https://66213e0e7054b0122b8c69717e016afa@o4511678051778560.ingest.de.sentry.io/4511678073405520',
  });
} catch (e) {
  console.warn('Sentry failed to initialize, app continues normally:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);