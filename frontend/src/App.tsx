import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Overview from '@/pages/Overview';
import Tasks from '@/pages/Tasks';
import Agents from '@/pages/Agents';
import Phases from '@/pages/Phases';
import Memories from '@/pages/Memories';
import Graph from '@/pages/Graph';
import Observability from '@/pages/Observability';
import Results from '@/pages/Results';
import Tickets from '@/pages/Tickets';
import Config from '@/pages/Config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="overview" element={<Overview />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="agents" element={<Agents />} />
              <Route path="phases" element={<Phases />} />
              <Route path="memories" element={<Memories />} />
              <Route path="graph" element={<Graph />} />
              <Route path="observability" element={<Observability />} />
              <Route path="results" element={<Results />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="config" element={<Config />} />
            </Route>
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                style: {
                  background: 'hsl(142 70% 45%)',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: 'hsl(142 70% 45%)',
                },
              },
              error: {
                style: {
                  background: 'hsl(0 84% 60%)',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: 'hsl(0 84% 60%)',
                },
              },
            }}
          />
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
