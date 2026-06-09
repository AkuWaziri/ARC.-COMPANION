import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient } from '@tanstack/react-query';
import { defineChain } from 'viem';

export const queryClient = new QueryClient();

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] }
  }
});

const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http()
  }
});

export const wagmiAdapter = { wagmiConfig: config };
