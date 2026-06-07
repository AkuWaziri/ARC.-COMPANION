import React from "react";
import { useAuth } from "../context/AuthContext";
import EmailAuthModal from "./EmailAuthModal";

interface AuthGuardProps {
  children: React.ReactNode;
  triggerBeep: (start: number, end: number, type: 'success' | 'fail' | 'neutral') => void;
  onLoginSuccess: (wallet: any, logs: string[], email?: string) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, triggerBeep, onLoginSuccess }) => {
  const { isAuthenticated, isWalletConnected, loading } = useAuth();

  // State 0: Dynamic system verification / loading session
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-mono z-[999]">
        <div className="space-y-4 text-center max-w-md">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#4ade80] font-bold block animate-pulse">
            Establishing Secure HSM Enclave Tunnel...
          </span>
          <p className="text-[10px] text-slate-400">
            Validating dynamic authorization signature from local keystore parameters on Arc Testnet Ledger.
          </p>
        </div>
      </div>
    );
  }

  // State 1: Unauthenticated -> show ONLY login/signup screen.
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-slate-100 flex items-center justify-center">
        <EmailAuthModal 
          onLoginSuccess={onLoginSuccess}
          triggerBeep={triggerBeep}
          forceState="unauthenticated"
        />
      </div>
    );
  }

  // State 2: Authenticated but no wallet -> show ONLY wallet connection/creation/selection screen. Block everything else.
  if (!isWalletConnected) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-slate-100 flex items-center justify-center">
        <EmailAuthModal 
          onLoginSuccess={onLoginSuccess}
          triggerBeep={triggerBeep}
          forceState="authenticated-no-wallet"
        />
      </div>
    );
  }

  // State 3: Authenticated + wallet connected -> show full app.
  return <>{children}</>;
};
