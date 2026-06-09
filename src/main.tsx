import './suppress-mismatch.ts';
import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter, queryClient } from './lib/web3Config.ts';
import { clearCachedAuth } from './lib/jwtHelper.ts';
import './index.css';

// Production-grade React Error Boundary to catch any wallet rendering or provider crashes
class Web3ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Web3ErrorBoundary] Captured crash in Web3 provider tree: ", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function Web3FallbackUI() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-400 border border-red-500/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-100 font-display uppercase tracking-wider">Secure Provider Error</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          The Web3 Wallet connection adapter failed to initialize. Your active primary authentication session is secure.
        </p>
        <div className="mt-5 flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl transition-all duration-200 border border-slate-700 cursor-pointer"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => {
              clearCachedAuth();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs rounded-xl font-bold cursor-pointer transition-all duration-200 shadow-lg shadow-red-600/10"
          >
            Reset Session & Login
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3ErrorBoundary fallback={<Web3FallbackUI />}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3ErrorBoundary>
  </StrictMode>,
);


