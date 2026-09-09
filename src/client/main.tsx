/// <reference types="vite/client" />

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from './App';

// app.css imports the U.S. Web Design System stylesheet itself, into a cascade
// layer — see the header comment there for why that indirection is required.
//
// The USWDS JavaScript bundle is deliberately NOT loaded: it initialises by
// querying the DOM on load and mutating it directly, which fights React's
// ownership of the same nodes. Every interactive USWDS pattern the app uses is
// implemented as a React component against the same `usa-*` markup contract.
import './styles/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5_000,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
