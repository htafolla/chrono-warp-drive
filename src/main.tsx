import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeBackgroundProcessing } from '@/lib/backgroundProcessingIntegration'

// Initialize background processing before rendering
initializeBackgroundProcessing()
  .then(() => {
    console.log('[MAIN] Background processing initialized successfully');
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch((error) => {
    console.warn('[MAIN] Background processing initialization failed, continuing without:', error);
    createRoot(document.getElementById("root")!).render(<App />);
  });
