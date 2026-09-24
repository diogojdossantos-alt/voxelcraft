import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: e o que torna o jogo instalavel e permite abrir sem rede.
// So no build de producao -- em desenvolvimento ele serviria arquivos velhos
// do cache e esconderia as mudancas que voce acabou de fazer.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      // Falha comum: certificado proprio. O jogo funciona igual, so nao instala.
      console.warn('[VoxelCraft] Service worker nao registrou:', e?.message || e);
    });
  });
}
