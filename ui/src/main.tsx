import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';

const rootStyle = document.createElement('style');
rootStyle.textContent = `
  body { margin: 0; padding: 0; }
  *, *::before, *::after { box-sizing: border-box; }
`;
document.head.appendChild(rootStyle);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
