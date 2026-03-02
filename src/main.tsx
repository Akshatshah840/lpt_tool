import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Authenticator } from '@aws-amplify/ui-react';

import '@fontsource-variable/inter';
import './styles/globals.css';
// @ts-ignore – CSS import valid via Vite
import '@aws-amplify/ui-react/styles.css';
import './lib/amplify';

import App from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Authenticator.Provider>
          <App />
        </Authenticator.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
