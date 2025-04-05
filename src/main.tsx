
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set up a global error handler for debugging auth issues
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
