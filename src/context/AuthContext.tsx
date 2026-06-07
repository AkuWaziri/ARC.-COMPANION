import React, { createContext, useContext, useState, useEffect } from "react";
import { WalletState } from "../types";

export interface AuthContextType {
  userEmail: string | null;
  sessionToken: string | null;
  wallet: WalletState | null;
  isAuthenticated: boolean; // State 1: Gmail/Email sign in completed
  isWalletConnected: boolean; // State 2: Wallet created/restored/connected
  login: (email: string, sessionToken: string) => void;
  connectWallet: (wallet: WalletState) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);

  // Load and verify initial states from localStorage & server
  useEffect(() => {
    const initializeSession = async () => {
      const storedToken = localStorage.getItem("arc_session_token");
      const storedWallet = localStorage.getItem("arc_wallet_session");

      if (!storedToken) {
        // Enforce clean state if no token
        setUserEmail(null);
        setSessionToken(null);
        setWallet(null);
        setLoading(false);
        return;
      }

      try {
        setSessionToken(storedToken);
        const res = await fetch(`/api/auth/verify-session?token=${encodeURIComponent(storedToken)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUserEmail(data.email);
            
            // Server returned a designated wallet record for this authenticated user
            if (data.wallet) {
              const activeWallet = {
                ...data.wallet,
                isConnected: true
              };
              setWallet(activeWallet);
              localStorage.setItem("arc_wallet_session", JSON.stringify(activeWallet));
            } else if (storedWallet) {
              // Try restoring local storage cached wallet
              try {
                const parsed = JSON.parse(storedWallet);
                if (parsed && parsed.isConnected) {
                  setWallet(parsed);
                }
              } catch (_) {}
            }
          } else {
            // Clean out expired session
            localStorage.removeItem("arc_session_token");
            localStorage.removeItem("arc_wallet_session");
          }
        } else {
          localStorage.removeItem("arc_session_token");
          localStorage.removeItem("arc_wallet_session");
        }
      } catch (err) {
        console.error("Session verification fetch failed during AuthProvider init:", err);
        // Offline / server offline fallback - restore local session token and wallet
        if (storedWallet) {
          try {
            const parsed = JSON.parse(storedWallet);
            if (parsed && parsed.isConnected) {
              setWallet(parsed);
            }
          } catch (_) {}
        }
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  const login = (email: string, token: string) => {
    setUserEmail(email);
    setSessionToken(token);
    localStorage.setItem("arc_session_token", token);
    localStorage.removeItem("arc_user_signed_out");
  };

  const connectWallet = (newWallet: WalletState) => {
    const updated = { ...newWallet, isConnected: true };
    setWallet(updated);
    localStorage.setItem("arc_wallet_session", JSON.stringify(updated));
  };

  const logout = async () => {
    setUserEmail(null);
    setSessionToken(null);
    setWallet(null);
    localStorage.removeItem("arc_session_token");
    localStorage.removeItem("arc_wallet_session");
    localStorage.setItem("arc_user_signed_out", "true");

    try {
      await fetch("/api/wallet/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConnected: false })
      });
    } catch (e) {
      console.warn("Failed to notify log out state to server:", e);
    }
  };

  const isAuthenticated = !!(userEmail && sessionToken);
  const isWalletConnected = !!(isAuthenticated && wallet && wallet.isConnected && wallet.address);

  return (
    <AuthContext.Provider value={{
      userEmail,
      sessionToken,
      wallet,
      isAuthenticated,
      isWalletConnected,
      login,
      connectWallet,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
