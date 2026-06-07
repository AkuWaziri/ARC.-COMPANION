import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { defineChain } from 'viem';
import { QueryClient } from '@tanstack/react-query';

// Configure Arc Testnet Definition
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
});

// Create networks list
export const networks = [arcTestnet];

// WalletConnect Project ID - fallback to a valid 32-character hex format
export const projectId = typeof window !== 'undefined' && (window as any).VITE_WALLETCONNECT_PROJECT_ID 
  ? (window as any).VITE_WALLETCONNECT_PROJECT_ID 
  : 'c3d3da77520e5c83d6cb46f7ff00fa74';

// Setup Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

// Setup React QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Initialize Reown AppKit Modal
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [arcTestnet],
  metadata: {
    name: 'Arc Protocol Wallet Connection',
    description: 'Production-grade Web3 wallet portal on Arc Testnet',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://testnet.arc.network',
    icons: ['https://testnet.arc.network/favicon.ico'],
  },
  projectId,
  features: {
    analytics: false,
    email: false, // We use our proprietary Enclave OTP Gateway
    socials: false,
    allWallets: true, // Enable all wallets (MetaMask, Coinbase, Trust Wallet, Rabby, etc.)
  },
  allWallets: 'SHOW',
});
