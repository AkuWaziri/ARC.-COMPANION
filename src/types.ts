export interface ParsedIntent {
  action: 'send' | 'request' | 'balance' | 'contact' | 'unknown';
  amount: number;
  token: string;
  recipient: string;
  recipientAddress?: string;
  note?: string;
  responseMessage?: string;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  note?: string;
  addedAt: string;
}

export interface Transaction {
  id: string;
  txHash: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  amount: number;
  token: string;
  note?: string;
  status: 'draft' | 'confirming' | 'signing' | 'broadcasting' | 'success' | 'failed';
  timestamp: string;
  securitySigned?: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  status?: 'processing' | 'confirming' | 'completed' | 'failed';
  intent?: ParsedIntent;
  transaction?: Transaction;
}

export interface WalletState {
  address: string;
  balance: number;
  privateKey: string;
  seedPhrase: string;
  isConnected: boolean;
}

export interface SecurityConfig {
  biometricsEnabled: boolean;
  encKeyDerived: boolean;
  encMethod: string;
  shieldStatus: 'secure' | 'unlocked' | 'breached';
}
