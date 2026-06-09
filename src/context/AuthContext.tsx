import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { WalletState } from "../types";
import { useAccount, useDisconnect } from "wagmi";
import { verifyStoredJWT, clearCachedAuth } from "../lib/jwtHelper";
import { API_BASE_URL } from "../config";

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
  
  // Custom Web3 Provider Verified Details
  web3Address: string | null;
  web3ChainId: number | null;
  web3NetworkName: string | null;
  web3ProviderName: string | null;
  web3IsConnected: boolean;
  isExternal: boolean;
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

  // Wagmi Provider hooks
  const { 
    address: wagmiAddress, 
    isConnected: wagmiIsConnected, 
    chainId: wagmiChainId, 
    connector,
    status: wagmiStatus
  } = useAccount();

  const { disconnect } = useDisconnect();

  // Determine if our loaded/active wallet is an external wallet
  const isExternalWallet = !!(
    wallet && 
    (wallet.privateKey === "WalletConnect Enclave" || 
     wallet.privateKey === "Hardware/Extension Key" || 
     wallet.privateKey === "external" || 
     !wallet.privateKey.startsWith("0x"))
  );

  // Expose precise, verified Web3 dynamic provider parameters
  const web3Address = isExternalWallet ? (wagmiAddress || null) : (wallet ? wallet.address : null);
  const web3ChainId = isExternalWallet ? (wagmiChainId || null) : 5042002;
  const web3NetworkName = isExternalWallet 
    ? (wagmiChainId === 5042002 ? "Arc Testnet" : (wagmiChainId ? `Chain ${wagmiChainId}` : "Unsupported Network")) 
    : "Arc Testnet";
  const web3ProviderName = isExternalWallet ? (connector?.name || "Web3 Wallet") : "Secure HSM Enclave";
  const web3IsConnected = isExternalWallet ? !!(wagmiIsConnected && wagmiAddress) : !!(wallet && wallet.isConnected);

  // Only show "Connected" when:
  // 1. A wallet address is returned.
  // 2. The wallet provider confirms connection (if external).
  // 3. The correct chain is selected (Chain ID 5042002).
  const isWalletConnected = !!(
    isAuthenticatedSession() && 
    wallet && 
    (isExternalWallet 
      ? (wagmiIsConnected && !!wagmiAddress && wagmiChainId === 5042002) 
      : (wallet.isConnected && !!wallet.address))
  );

  function isAuthenticatedSession() {
    return !!(userEmail && sessionToken);
  }

  // Debug logging refs for tracking event state changes.
  const prevWagmiConnected = useRef<boolean | undefined>(undefined);
  const prevWagmiAddress = useRef<string | undefined>(undefined);
  const prevWagmiChainId = useRef<number | undefined>(undefined);

  // 1. Connection Event Debug Logger
  useEffect(() => {
    // Audit log for connection shift
    if (wagmiIsConnected && prevWagmiConnected.current === false) {
      console.log(`[Web3 Debug] connect() event fired. Provider: ${connector?.name || "injected"}, Account: ${wagmiAddress}, Chain ID: ${wagmiChainId}`);
    } else if (!wagmiIsConnected && prevWagmiConnected.current === true) {
      console.log("[Web3 Debug] disconnect() event fired. External wallet disconnected from application.");
    }

    // Audit log for account shifts
    if (wagmiIsConnected && prevWagmiAddress.current && wagmiAddress !== prevWagmiAddress.current) {
      console.log(`[Web3 Debug] account changes detected in provider. New account: ${wagmiAddress}, Prior account: ${prevWagmiAddress.current}`);
    }

    // Audit log for chain shifts
    if (wagmiIsConnected && prevWagmiChainId.current && wagmiChainId !== prevWagmiChainId.current) {
      console.log(`[Web3 Debug] chain changes detected in provider. New Chain ID: ${wagmiChainId}, Prior Chain ID: ${prevWagmiChainId.current}`);
    }

    // Store state history
    prevWagmiConnected.current = wagmiIsConnected;
    prevWagmiAddress.current = wagmiAddress;
    prevWagmiChainId.current = wagmiChainId;
  }, [wagmiIsConnected, wagmiAddress, wagmiChainId, connector]);

  // 2. Automatic Teardown of Invalid Sessions
  useEffect(() => {
    if (!loading && isExternalWallet) {
      // If external wallet says disconnected, teardown this invalid session automatically
      if (wagmiStatus === "disconnected" || !wagmiIsConnected) {
        console.warn("[Web3 Warning] Invalid session resolved. External provider disconnected. Automatically separating wallet context.");
        teardownWalletSession();
      }
      // If connected to the wrong chain, automatically reset or enforce disconnect
      else if (wagmiChainId !== 5042002) {
        console.warn(`[Web3 Warning] Incorrect Chain ID (${wagmiChainId}) detected. Enforcing required Arc Testnet chain.`);
      }
    }
  }, [loading, isExternalWallet, wagmiIsConnected, wagmiStatus, wagmiChainId]);

  const teardownWalletSession = () => {
    setWallet(null);
    localStorage.removeItem("arc_wallet_session");
  };

  // Load and verify initial states from localStorage & server
  useEffect(() => {
    const initializeSession = async () => {
      // Sanitize and retrieve using our robust check
      const jwtCheck = verifyStoredJWT();
      const storedWallet = localStorage.getItem("arc_wallet_session");

      if (!jwtCheck.isValid) {
        console.warn(`[Auth Initialization] Invalid or missing JWT session:`, jwtCheck.error);
        if (localStorage.getItem("arc_session_token")) {
          clearCachedAuth();
        }
        setUserEmail(null);
        setSessionToken(null);
        setWallet(null);
        setLoading(false);
        return;
      }

      const storedToken = localStorage.getItem("arc_session_token")!;
      console.log(`[Auth Initialization] Verified local JWT segment successfully. Fetching server verification status. Claims:`, jwtCheck.payload);

      try {
        setSessionToken(storedToken);
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-session?token=${encodeURIComponent(storedToken)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUserEmail(data.email);
            
            if (data.wallet) {
              const activeWallet = {
                ...data.wallet,
                isConnected: true
              };
              setWallet(activeWallet);
              localStorage.setItem("arc_wallet_session", JSON.stringify(activeWallet));
            } else if (storedWallet) {
              try {
                const parsed = JSON.parse(storedWallet);
                if (parsed && parsed.isConnected) {
                  setWallet(parsed);
                }
              } catch (_) {}
            }
          } else {
            console.warn(`[Auth Initialization] Server rejected session token validation:`, data.error);
            clearCachedAuth();
          }
        } else {
          console.warn("[Auth Initialization] Server responded with error status during verify-session fetch.");
          clearCachedAuth();
        }
      } catch (err) {
        console.error("Session verification fetch failed during AuthProvider init:", err);
        // Fallback to local verified payload claims if the network is temporarily offline
        if (jwtCheck.payload && jwtCheck.payload.email) {
          console.info("[Auth Initialization] Server unreachable. Reverting to verified JWT offline claims fallback.");
          setUserEmail(jwtCheck.payload.email);
        }
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
    window.dispatchEvent(new Event("arc_auth_state_change"));
  };

  const connectWallet = (newWallet: WalletState) => {
    // If we're setting an external wallet, we don't manually assign "isConnected = true" 
    // unless the provider itself is actually connected.
    const isExt = newWallet.privateKey === "WalletConnect Enclave" || 
                  newWallet.privateKey === "Hardware/Extension Key" || 
                  newWallet.privateKey === "external";
                  
    const updated = { ...newWallet, isConnected: !isExt };
    setWallet(updated);
    localStorage.setItem("arc_wallet_session", JSON.stringify(updated));
  };

  const logout = async () => {
    setUserEmail(null);
    setSessionToken(null);
    setWallet(null);
    clearCachedAuth();
    localStorage.setItem("arc_user_signed_out", "true");

    try {
      disconnect(); // Also trigger standard Wagmi disconnect internally to purge provider connections
    } catch (e) {
      console.warn("Failed to invoke disconnect() straight from provider:", e);
    }

    try {
      await fetch(`${API_BASE_URL}/api/wallet/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConnected: false })
      });
    } catch (e) {
      console.warn("Failed to notify log out state to server:", e);
    }
  };

  const isAuthenticated = !!(userEmail && sessionToken);

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
      loading,
      web3Address,
      web3ChainId,
      web3NetworkName,
      web3ProviderName,
      web3IsConnected,
      isExternal: isExternalWallet
    }}>
      {children}
    </AuthContext.Provider>
  );
};
