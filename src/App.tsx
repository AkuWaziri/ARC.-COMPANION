import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  Fingerprint, 
  History, 
  HelpCircle, 
  Plus, 
  Search, 
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Zap,
  BookOpen,
  Activity,
  Cpu,
  Layers,
  User,
  Wallet,
  Shield,
  LogOut,
  Twitter,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WalletCard from "./components/WalletCard";
import ContactsDatabase from "./components/ContactsDatabase";
import SecurityConsole from "./components/SecurityConsole";
import TransactionHistory from "./components/TransactionHistory";
import EmailAuthModal from "./components/EmailAuthModal";
import { useAuth } from "./context/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
import robotAvatar from "./assets/images/friendly_bot_logo_1780649113441.png";
import { Message, WalletState, Contact, Transaction, SecurityConfig } from "./types";
import { API_BASE_URL } from "./config";

let lastBeepTime = 0;

export default function App() {
  const { 
    wallet: contextWallet, 
    connectWallet, 
    logout, 
    isWalletConnected: contextIsWalletConnected,
    web3Address,
    web3ChainId,
    web3NetworkName,
    web3ProviderName,
    web3IsConnected,
    isExternal
  } = useAuth();

  const [wallet, setWallet] = useState<WalletState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("arc_wallet_session");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    return {
      address: "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0",
      balance: 350.00,
      privateKey: "0x9d4b...4f7a",
      seedPhrase: "",
      isConnected: false
    };
  });

  // Keep localStorage updated upon any wallet changes (e.g. balance, faucet)
  useEffect(() => {
    if (wallet && wallet.isConnected) {
      localStorage.setItem("arc_wallet_session", JSON.stringify(wallet));
    } else {
      localStorage.removeItem("arc_wallet_session");
    }
  }, [wallet]);

  const DEFAULT_CONTACTS: Contact[] = [
    { id: "1", name: "Musa", address: "0x89205A129ac68a6fcf4a3a9b910248ff2266bcf4", note: "Primary Arc partner", addedAt: new Date(2026, 4, 15).toISOString() },
    { id: "2", name: "Alice", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", note: "Dev collaborator", addedAt: new Date(2026, 4, 20).toISOString() },
    { id: "3", name: "Bob", address: "0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266", note: "Audit officer", addedAt: new Date(2026, 4, 25).toISOString() }
  ];

  const DEFAULT_TRANSACTIONS: Transaction[] = [
    {
      id: "tx-1001",
      txHash: "0xe8f09b2b93ff5fa1e6fbe5ed795fac862a9b3ee4cdc3a72ba9a826477b7325fa",
      fromAddress: "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0",
      toName: "Alice",
      toAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      amount: 50.00,
      token: "USDC",
      note: "Consulting fees",
      status: "success",
      timestamp: new Date(2026, 5, 1, 10, 15, 0).toISOString()
    }
  ];

  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-init-1",
      sender: "agent",
      text: "Secure session initialized. Hello, I am your ARC COMPANION. I specialize in secure, natural-language USDC transactions. Try telling me: 'Send 10 USDC to Musa for coffee' or ask 'Who is Alice?'",
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [encryptionLogs, setEncryptionLogs] = useState<string[]>([]);
  
  // Active payment draft waiting for confirmation
  const [activeDraft, setActiveDraft] = useState<Transaction | null>(null);
  
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    biometricsEnabled: false,
    encKeyDerived: true,
    encMethod: "AES-256-GCM / PBKDF2",
    shieldStatus: "secure"
  });

  const [biometricSigningInProgress, setBiometricSigningInProgress] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const userIsAtBottomRef = useRef<boolean>(true);

  const [scrolled, setScrolled] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [currentBlock, setCurrentBlock] = useState(741302);
  const [gwei, setGwei] = useState(0.125);
  const [activeTab, setActiveTab] = useState<'chat' | 'wallet' | 'transactions' | 'contacts' | 'security'>('chat');

  // Network mode: simulated vs live
  const [networkMode, setNetworkMode] = useState<'simulated' | 'live'>('live');

  // Copy state tracker for Explorer URL in Chat bubble
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  const promptAddArcNetwork = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const verifyChainIdBefore = await (window as any).ethereum.request({ method: 'eth_chainId' });
        const checkIsArcChain = (id: string) => id && (
          id.toLowerCase() === "0x4cef52" || 
          id === "5042002" || 
          id.toLowerCase() === "0x04cef52"
        );
        if (checkIsArcChain(verifyChainIdBefore)) {
          return true;
        }

        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x4cef52" }], // 5042002 in hex
          });
          addSecurityLog("Prompted wallet extension to switch to Arc Testnet (5042002).");
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await (window as any).ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x4cef52",
                    chainName: "Arc Testnet",
                    nativeCurrency: {
                      name: "USDC",
                      symbol: "USDC",
                      decimals: 18,
                    },
                    rpcUrls: ["https://rpc.testnet.arc.network"],
                    blockExplorerUrls: ["https://testnet.arcscan.app"],
                  },
                ],
              });
              addSecurityLog("Broadcasted Arc Testnet parameters payload. Network added.");
            } catch (addError) {
              console.error("Could not add Arc Testnet to extension wallet:", addError);
              return false;
            }
          } else {
            console.error("Could not switch Arc Testnet:", switchError);
            return false;
          }
        }

        const verifyChainIdAfter = await (window as any).ethereum.request({ method: 'eth_chainId' });
        return checkIsArcChain(verifyChainIdAfter);
      } catch (err) {
        console.error("Error during chain validation:", err);
        return false;
      }
    }
    return false;
  };

  // Sync mode state and trigger updates
  useEffect(() => {
    localStorage.setItem("arc_network_mode", networkMode);
    
    // sync back to server-side router
    const syncMode = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/wallet/mode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: networkMode })
        });
        await fetchWallet(wallet.address);
      } catch (err) {
        console.error("Error updating active network mode:", err);
      }
    };
    syncMode();
  }, [networkMode]);

  // Account and network change listeners for injected extension wallets (MetaMask/Rabby/Trust)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccounts = async (accounts: string[]) => {
        if (accounts.length === 0) {
          addSecurityLog("Manual disconnect or lock detected from Web3 extension. Severing session.");
          handleLogOut();
          return;
        }

        const isExtensionSession = wallet.privateKey === "WalletConnect Enclave" || wallet.privateKey === "Hardware/Extension Key";
        if (accounts.length > 0 && isExtensionSession) {
          if (wallet.address.toLowerCase() !== accounts[0].toLowerCase()) {
            addSecurityLog(`Detected extension account shift: ${accounts[0]}`);
            const updatedWallet = {
              ...wallet,
              address: accounts[0]
            };
            setWallet(updatedWallet);
            localStorage.setItem("arc_wallet_session", JSON.stringify(updatedWallet));
            try {
              await fetch(`${API_BASE_URL}/api/wallet/auth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedWallet)
              });
              await fetchWallet(updatedWallet.address);
            } catch (e) {}
          }
        }
      };

      const handleChain = (chainIdHex: string) => {
        addSecurityLog(`Injected extension chain changed to ${chainIdHex}. Refreshing context...`);
        // Soft reload ensures Ethers providers and hooks align with new network without state corruption
        window.location.reload();
      };
      
      const provider = (window as any).ethereum;
      provider.on('accountsChanged', handleAccounts);
      provider.on('chainChanged', handleChain);
      return () => {
        provider.removeListener('accountsChanged', handleAccounts);
        provider.removeListener('chainChanged', handleChain);
      };
    }
  }, [wallet]);

  // Scroll listener and block incrementer to show flowing trace
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Hide or show header based on scroll direction
      if (currentScrollY <= 0) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY.current) {
        setShowHeader(false); // scrolling down slightly: disappear immediately
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true); // scrolling up: show immediately
      }
      
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);

    const interval = setInterval(() => {
      setCurrentBlock(prev => prev + 1);
      setGwei(prev => {
        const delta = (Math.random() - 0.5) * 0.03;
        const next = parseFloat((prev + delta).toFixed(3));
        return Math.max(0.05, Math.min(0.25, next));
      });
    }, 4500);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  // Synchronize wallet state and fetch related parameters when context wallet settles
  useEffect(() => {
    if (contextWallet) {
      setWallet(contextWallet);
      if (contextWallet.address) {
        fetchWallet(contextWallet.address);
        fetchContacts();
        fetchTransactions(contextWallet.address);
        addSecurityLog(`Authentication credentials verified. Initialized session at Address: ${contextWallet.address.slice(0, 10)}...`);
      }
    }
  }, [contextWallet]);

  // Scroll chat
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastIsUser = lastMessage?.sender === "user";
    if (userIsAtBottomRef.current || lastIsUser) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  // Utility to write down logs
  const addSecurityLog = (text: string) => {
    const time = new Date().toLocaleTimeString();
    setEncryptionLogs(prev => [`[${time}] ${text}`, ...prev.slice(0, 40)]);
  };

  const handleLoginSuccess = async (newWallet: WalletState, secureLogs: string[], userEmail?: string) => {
    localStorage.removeItem("arc_user_signed_out");
    setWallet(newWallet);
    localStorage.setItem("arc_wallet_session", JSON.stringify(newWallet));
    connectWallet(newWallet);
    
    // Sync backend wallet state
    try {
      await fetch(`${API_BASE_URL}/api/wallet/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWallet,
          email: userEmail
        })
      });
      
      // Update local ledger items to align with updated wallet address/balance
      await fetchWallet(newWallet.address);
      await fetchTransactions(newWallet.address);
    } catch (err) {
      console.error("Error synchronizing dynamic wallet state:", err);
    }

    secureLogs.forEach(log => addSecurityLog(log));
    
    const isExtension = newWallet.privateKey === "WalletConnect Enclave" || newWallet.privateKey === "Hardware/Extension Key";
    if (isExtension) {
      addSecurityLog("Injected extension session active. Triggering automatic connection switch to Arc Testnet...");
      await promptAddArcNetwork();
    } else {
      addSecurityLog("Secure cryptographic authentication finalized.");
    }
  };

  const handleLogOut = async () => {
    triggerSynthBeep(300, 150, "fail");
    
    const disconnectedWallet: WalletState = {
      address: "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0",
      balance: 350.00,
      privateKey: "0x9d4b...4f7a",
      seedPhrase: "",
      isConnected: false
    };

    setWallet(disconnectedWallet);
    localStorage.removeItem("arc_wallet_session");
    localStorage.removeItem("arc_session_token");
    localStorage.setItem("arc_user_signed_out", "true");
    logout();

    // Sync disconnected state back to server
    try {
      await fetch(`${API_BASE_URL}/api/wallet/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disconnectedWallet)
      });
    } catch (err) {
      console.error("Error setting disconnected state on server:", err);
    }

    addSecurityLog("Enclave session severed by operator. Relocked environment.");
  };

  const fetchWallet = async (addressOverride?: string) => {
    try {
      const queryAddress = addressOverride || wallet.address;
      const res = await fetch(`${API_BASE_URL}/api/wallet?address=${encodeURIComponent(queryAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch (err) {
      console.error("Error fetching wallet:", err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const fetchTransactions = async (addressOverride?: string) => {
    try {
      const queryAddress = addressOverride || wallet.address;
      const res = await fetch(`${API_BASE_URL}/api/transactions?address=${encodeURIComponent(queryAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const handleFaucet = async () => {
    try {
      try {
        const res = await fetch(`${API_BASE_URL}/api/wallet/faucet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: wallet.address })
        });
        if (res.ok) {
          addSecurityLog(`Injected gas-free test assets: +100.00 USDC.`);
          await fetchWallet(wallet.address);
          triggerSynthBeep(450, 900, "success");
          return;
        }
      } catch (e) {
        console.warn("Server faucet endpoint not available, completing request in client memory", e);
      }

      // Local fallback
      const updatedWallet = {
        ...wallet,
        balance: wallet.balance + 100.00
      };
      setWallet(updatedWallet);
      localStorage.setItem("arc_wallet_session", JSON.stringify(updatedWallet));
      addSecurityLog(`Injected gas-free test assets locally: +100.00 USDC.`);
      triggerSynthBeep(450, 900, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (name: string, address: string, note: string) => {
    try {
      try {
        const res = await fetch(`${API_BASE_URL}/api/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address, note })
        });
        if (res.ok) {
          addSecurityLog(`Cryptographically saved contact info for "${name}". Mapped to ${address.slice(0, 10)}...`);
          triggerSynthBeep(600, 800, "neutral");
          await fetchContacts();
          return;
        }
      } catch (e) {
        console.warn("Server contacts post endpoint not available, saving to local memory", e);
      }

      // Local state fallback
      const nextContact: Contact = {
        id: `c-${Date.now()}`,
        name,
        address,
        note,
        addedAt: new Date().toISOString()
      };
      setContacts(prev => [...prev, nextContact]);
      addSecurityLog(`Saved contact info locally for "${name}". Mapped to ${address.slice(0, 10)}...`);
      triggerSynthBeep(600, 800, "neutral");
    } catch (err: any) {
      addSecurityLog(`Secure store failure: ${err.message}`);
      throw err;
    }
  };

  const triggerSynthBeep = (startFreq: number, endFreq: number, type: 'success' | 'fail' | 'neutral') => {
    const now = Date.now();
    if (now - lastBeepTime < 100) {
      return; // Do not replay sound if already triggered within 100ms
    }
    lastBeepTime = now;

    if (typeof window !== "undefined" && window.AudioContext) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        
        if (type === 'success') {
          // Double chime chord
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          
          osc2.frequency.setValueAtTime(startFreq * 1.5, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(endFreq * 1.5, audioCtx.currentTime + 0.1);
          gain2.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
          
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.3);
        }
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (e) {}
    }
  };

  const handleToggleBiometrics = () => {
    setSecurityConfig(prev => {
      const updated = !prev.biometricsEnabled;
      addSecurityLog(`WebAuthn Signature Shield ${updated ? "Armed" : "Disarmed"}.`);
      return {
        ...prev,
        biometricsEnabled: updated
      };
    });
    triggerSynthBeep(350, 550, "neutral");
  };

  // Pre-fill prompt when user selects a contact
  const handleSelectContact = (name: string) => {
    setInputText(`Send 10 USDC to ${name} for rent contribution`);
    triggerSynthBeep(500, 600, "neutral");
    setActiveTab("chat"); // Auto-switch context to chat screen with the text filled
  };

  // Submit chat query
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userMessageText = inputText.trim();
    setInputText("");

    // Add User Message
    const userMsg: Message = {
      id: `m-user-${Date.now()}`,
      sender: "user",
      text: userMessageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    addSecurityLog(`Received natural language command: "${userMessageText}"`);

    try {
      let intent;
      try {
        const res = await fetch(`${API_BASE_URL}/api/parse-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessageText })
        });

        if (!res.ok) {
          throw new Error("Local fallback triggered due to non-200 response status");
        }
        intent = await res.json();
      } catch (errFallback) {
        console.warn("API parse-intent returned error or not found. Falling back to robust client-side parser:", errFallback);
        
        const cleanText = userMessageText.toLowerCase();
        let defaultParsed = {
          action: "unknown",
          amount: 0,
          token: "USDC",
          recipient: "Musa",
          recipientAddress: "",
          note: "",
          responseMessage: "I detected a financial intent but I need more details to form a structured transfer payload."
        };

        // Extract amount
        const amountMatch = cleanText.match(/(?:send|transfer|give|pay|wire)\s+(\d+(?:\.\d+)?)\s*(?:usdc|dollars|coins)?/i);
        if (amountMatch) {
          defaultParsed.action = "send";
          defaultParsed.amount = parseFloat(amountMatch[1]);
        }

        // Find recipient mapping in the statement
        // Look for "to Musa", "to Alice", "to 0x..."
        const recipientMatch = cleanText.match(/to\s+(0x[a-fA-F0-9]{40}|[a-zA-Z0-9_]+)/i);
        if (recipientMatch) {
          const rawRec = recipientMatch[1];
          if (rawRec.startsWith("0x")) {
            defaultParsed.recipient = "External Address";
            defaultParsed.recipientAddress = rawRec;
          } else {
            defaultParsed.recipient = rawRec.charAt(0).toUpperCase() + rawRec.slice(1);
            // Try to resolve using contacts in local state
            const matchedContact = contacts.find(c => c.name.toLowerCase() === rawRec.toLowerCase());
            if (matchedContact) {
              defaultParsed.recipientAddress = matchedContact.address;
            }
          }
        }

        // Parse note ("for lunch", "for coffee", "lunch")
        const noteMatch = cleanText.match(/(?:for|reason:)\s+([a-zA-Z0-9_\s]+)/i);
        if (noteMatch) {
          defaultParsed.note = noteMatch[1].trim();
        }

        // Extra robust check for 0x address anywhere in original text
        const ethAddressMatch = userMessageText.match(/0x[a-fA-F0-9]{40}/i);
        if (ethAddressMatch) {
          const extractedAddr = ethAddressMatch[0];
          defaultParsed.recipientAddress = extractedAddr;
          const matchedContact = contacts.find(c => c.address.toLowerCase() === extractedAddr.toLowerCase());
          defaultParsed.recipient = matchedContact ? matchedContact.name : "External Address";
          if (defaultParsed.action === "unknown") {
            defaultParsed.action = "send";
          }
        }

        if (defaultParsed.action === "send" && defaultParsed.amount > 0 && defaultParsed.recipient) {
          defaultParsed.responseMessage = `I detected your intent to send ${defaultParsed.amount} ${defaultParsed.token} to ${defaultParsed.recipient}${defaultParsed.note ? ` for "${defaultParsed.note}"` : ""}. Please confirm the wallet payload before signing.`;
        }
        
        intent = defaultParsed;
      }

      addSecurityLog(`Gemini intent categorization result action: [${intent.action.toUpperCase()}]`);

      // Mock processing wait to give smooth tactile flow
      setTimeout(() => {
        let agentMessageText = intent.responseMessage || "I parsed your query but couldn't structure a payment intent.";
        
        // Check if send action is requested
        if (intent.action === "send" && intent.amount > 0) {
          if (!intent.recipientAddress) {
            // Recipient address not resolved (Musa needs address binding or unknown target)
            agentMessageText = `I processed your request to transfer ${intent.amount} USDC to "${intent.recipient}", but I could not resolve their address in your secure memories directory. Let's bind an address or specify the 0x address in your request.`;
            
            const agentResponse: Message = {
              id: `m-agent-${Date.now()}`,
              sender: "agent",
              text: agentMessageText,
              timestamp: new Date().toISOString(),
              status: "failed",
              intent
            };
            setMessages(prev => [...prev, agentResponse]);
            setIsProcessing(false);
            triggerSynthBeep(250, 150, "fail");
            return;
          }

          // Address is resolved - Create Draft Transaction
          const draftTx: Transaction = {
            id: `tx-draft-${Date.now()}`,
            txHash: "",
            fromAddress: wallet.address,
            toName: intent.recipient,
            toAddress: intent.recipientAddress,
            amount: intent.amount,
            token: intent.token || "USDC",
            note: intent.note || "Digital agents escrow payment",
            status: "draft",
            timestamp: new Date().toISOString()
          };

          // Hold the current active draft
          setActiveDraft(draftTx);

          const agentResponse: Message = {
            id: `m-agent-${Date.now()}`,
            sender: "agent",
            text: agentMessageText,
            timestamp: new Date().toISOString(),
            status: "confirming",
            intent,
            transaction: draftTx
          };

          setMessages(prev => [...prev, agentResponse]);
          triggerSynthBeep(520, 800, "neutral");
        } else {
          // Non-transfer response or unknown
          const agentResponse: Message = {
            id: `m-agent-${Date.now()}`,
            sender: "agent",
            text: agentMessageText,
            timestamp: new Date().toISOString(),
            status: "completed",
            intent
          };
          setMessages(prev => [...prev, agentResponse]);
          triggerSynthBeep(500, 680, "neutral");
        }
        setIsProcessing(false);
      }, 900);

    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setMessages(prev => [
        ...prev,
        {
          id: `m-agent-err-${Date.now()}`,
          sender: "agent",
          text: `An error occurred while securely communicating with the cryptographic AI processor: ${err.message}`,
          timestamp: new Date().toISOString(),
          status: "failed"
        }
      ]);
      triggerSynthBeep(200, 100, "fail");
    }
  };

  // User confirms the draft transaction
  const executeConfirmedTransaction = async (draft: Transaction) => {
    setActiveDraft(null);
    
    // If biometrics are enabled, do biometric signature step
    if (securityConfig.biometricsEnabled) {
      setBiometricSigningInProgress(true);
      addSecurityLog("Prompting WebAuthn Biometric TouchID validation...");
      
      // Simulate fingerprint scans
      triggerSynthBeep(380, 500, "neutral");
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setBiometricSigningInProgress(false);
      addSecurityLog("Biometric Signature validated successfully in Secure Enclave.");
    }

    addSecurityLog(`Deploying authorized transaction stream to Arc: ${draft.amount} USDC to ${draft.toName}`);
    
    // Push temporary signing messages
    const processingMsgId = `m-signing-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: processingMsgId,
        sender: "agent",
        text: `Signing and broadcasting transaction package. Please wait...`,
        timestamp: new Date().toISOString(),
        status: "processing"
      }
    ]);

    try {
      let executionData;

      try {
        const isExtensionWallet = wallet.privateKey === "WalletConnect Enclave" || wallet.privateKey === "Hardware/Extension Key" || wallet.privateKey === "Privy Secure Enclave";
      if (isExtensionWallet) {
        if (typeof window !== "undefined" && (window as any).ethereum) {
          // MetaMask chain validation or switch
          addSecurityLog("Validating Arc Testnet connectivity...");
          const isCorrectChain = await promptAddArcNetwork();
          if (!isCorrectChain) {
            throw new Error("Transaction cancelled: Connection switch to Arc Testnet (5042002) was denied. Please switch your extension wallet's network to Arc Testnet.");
          }
          addSecurityLog("Arc Testnet connection verified. Prompting extension wallet to sign native USDC transfer...");
          // accounts verify
          const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
          const fromAddr = accounts[0];
          const hexAmount = "0x" + (BigInt(Math.floor(draft.amount * 1e18))).toString(16);
          const rawHash = await (window as any).ethereum.request({
            target: "0x4cef52",
            method: 'eth_sendTransaction',
            params: [{ from: fromAddr, to: draft.toAddress, value: hexAmount }],
          });
          addSecurityLog(`Extension signing successful. Broadcasted Tx Hash: ${rawHash}`);
          try {
            const res = await fetch(`${API_BASE_URL}/api/transaction/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toName: draft.toName,
                toAddress: draft.toAddress,
                amount: draft.amount,
                note: draft.note,
                token: draft.token,
                overrideTxHash: rawHash,
                fromAddress: wallet.address
              })
            });
            if (!res.ok) {
              throw new Error("Failed to serialize external transaction ledger on server.");
            }
            executionData = await res.json();
          } catch (errJson) {
            console.warn("Could not save to server-side txn logs, using local fallback state", errJson);
            executionData = { hash: rawHash };
          }
        } else {
          throw new Error("No browser extension wallet (like MetaMask) detected inside this tab context. Please restore/import an account with your seed phrase or use the Secure Embedded Local Wallet connector.");
        }
      } else {
        // Option B: Post standard payload to server. Express handles onchain live wallet transfers.
        const res = await fetch(`${API_BASE_URL}/api/transaction/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toName: draft.toName,
            toAddress: draft.toAddress,
            amount: draft.amount,
            note: draft.note,
            token: draft.token,
            fromAddress: wallet.address
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Offline static server fallback" }));
          throw new Error(errorData.error || "Execution failed on chain broker.");
        }

        executionData = await res.json();
      }
      } catch (errApi: any) {
        if (errApi?.message && errApi.message.includes("cancelled")) {
          throw errApi; // don't execute if cancelled by user in extension
        }
        console.error("On-chain wallet transaction failed:", errApi);
        throw new Error(errApi?.message || "On-chain transaction execution failed.");
      }

      addSecurityLog(`Consensus finalized. Hash: ${executionData.hash}`);

      // Update local wallet view and state
      await fetchWallet(wallet.address);
      await fetchTransactions(wallet.address);

      // Trigger standard physical haptic feedback loop simulator sound
      triggerSynthBeep(520, 1040, "success");

      // Replace or update messages list
      setMessages(prev => {
        // Remove the temporary broadcast text
        const cleaned = prev.filter(m => m.id !== processingMsgId);
        return [
          ...cleaned,
          {
            id: `m-success-${Date.now()}`,
            sender: "agent",
            text: `Real on-chain transaction completed successfully on Arc Testnet! I have broadcasted and tracked your transfer of $${draft.amount.toFixed(2)} ${draft.token} to ${draft.toName}.`,
            timestamp: new Date().toISOString(),
            status: "completed",
            transaction: executionData.transaction
          }
        ];
      });

    } catch (err: any) {
      console.error(err);
      addSecurityLog(`Signing abort: ${err.message}`);
      triggerSynthBeep(260, 130, "fail");
      
      let friendlyError = err.message || "Unknown error";
      const isInsufficientFunds = friendlyError.toLowerCase().includes("insufficient funds") || friendlyError.includes("INSUFFICIENT_FUNDS");
      if (isInsufficientFunds) {
        friendlyError = `On-chain execution error: Insufficient funds. Your connected EVM account address (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) has 0 or low test ETH/USDC. If you sign in utilizing an external wallet, please make sure it is configured to Arc Testnet and populated with sample USDC/gas assets before executing. Alternatively, use our embedded local wallet option which starts pre-credited with gas/test assets.`;
      }
      
      setMessages(prev => {
        const cleaned = prev.filter(m => m.id !== processingMsgId);
        return [
          ...cleaned,
          {
            id: `m-fail-${Date.now()}`,
            sender: "agent",
            text: `Transaction aborted: ${friendlyError}`,
            timestamp: new Date().toISOString(),
            status: "failed"
          }
        ];
      });
    }
  };

  const cancelTransactionDraft = () => {
    setActiveDraft(null);
    addSecurityLog("Draft transaction rejected and purged from hardware scratchpad.");
    triggerSynthBeep(300, 200, "fail");
    setMessages(prev => [
      ...prev,
      {
        id: `m-cancel-${Date.now()}`,
        sender: "agent",
        text: "Transaction draft cancelled by the operator.",
        timestamp: new Date().toISOString(),
        status: "failed"
      }
    ]);
  };

  return (
    <AuthGuard 
      triggerBeep={triggerSynthBeep} 
      onLoginSuccess={handleLoginSuccess}
    >
      <div id="ai-money-agent-app" className="h-screen max-h-screen w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-slate-300 selection:text-slate-900">
      
      {/* Top Floating Header Rail */}
      <div className="shrink-0 sticky top-0 z-50 w-full px-2 pt-1.5 sm:px-4 sm:pt-2 transition-all duration-300">
        <motion.header 
          id="agent-main-header" 
          className="mx-auto max-w-7xl transition-all duration-300 flex items-center justify-between rounded-lg sm:rounded-xl border relative overflow-hidden bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 border-slate-300 shadow-xs"
          layout
        >
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center shadow-xs border border-slate-300 hover:scale-[1.02] transition-transform duration-250">
              <img 
                src={robotAvatar} 
                alt="Arc Companion Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          <div className="text-left">
            <h1 className="text-[10px] sm:text-xs font-bold font-display tracking-wider text-slate-900 uppercase">ARC COMPANION</h1>
            <p className="hidden sm:flex text-[8px] font-mono text-slate-500 lowercase tracking-wider items-center gap-1 mt-0.5">
              <span>arc. native. wallet. finance.</span>
            </p>
          </div>
        </div>

        {/* Diagnostic Status indicators showing Live Flow & Sign Out Option */}
        <div id="header-right-controls" className="flex items-center gap-1.5 sm:gap-2">
          {/* Locked Live ARC Testnet badge */}
          <div className="hidden md:flex bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg py-0.5 px-2 items-center gap-1 select-none text-[8.5px] font-mono uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 -ml-2.5" />
            <span>Arc Testnet Live</span>
          </div>

          {/* Dynamic Wallet Status Diagnostic Panel */}
          <div className="flex items-center">
            {isExternal ? (
              contextIsWalletConnected ? (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono leading-tight whitespace-nowrap shadow-3xs">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="font-bold hidden sm:inline">{web3ProviderName || "Wallet"}:</span>
                  <span className="font-semibold select-all text-slate-800">{web3Address ? `${web3Address.slice(0, 5)}...${web3Address.slice(-4)}` : "None"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 text-rose-700 rounded-lg px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono font-bold leading-tight shadow-3xs">
                  <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                  <span>Wallet Not Connected</span>
                </div>
              )
            ) : (
              // Embedded local HSM mode
              wallet && wallet.isConnected ? (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono leading-tight whitespace-nowrap shadow-3xs text-blue-800">
                  <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                  <span className="font-bold hidden sm:inline">Enclave:</span>
                  <span className="font-semibold select-all text-slate-800">{wallet.address ? `${wallet.address.slice(0, 5)}...${wallet.address.slice(-4)}` : "None"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 text-rose-700 rounded-lg px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono font-bold leading-tight shadow-3xs">
                  <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                  <span>Disconnected</span>
                </div>
              )
            )}
          </div>

          {wallet.isConnected && (
            <button
              onClick={handleLogOut}
              className="px-2 py-1 bg-slate-200 hover:bg-rose-50 border border-slate-355 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Secure Logout Session"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}
        </div>

        {/* Animated Live Block Flow Trace */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-slate-200 overflow-hidden">
          <motion.div 
            className="h-full w-2/5 bg-gradient-to-r from-transparent via-blue-500/80 to-transparent"
            animate={{ x: ["-100%", "250%"] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
          />
        </div>
        </motion.header>
      </div>

      {/* Dynamic Navigation Tabs System */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 mt-1 sm:mt-1.5 shrink-0">
        <div id="enclave-tabs-bar" className="grid grid-cols-5 items-stretch bg-white border border-slate-300 p-0.5 rounded-lg shadow-3xs gap-0.5 sm:gap-1 select-none w-full">
          {[
            { id: 'chat' as const, label: 'Chat', icon: Bot },
            { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
            { id: 'transactions' as const, label: 'History', icon: History },
            { id: 'contacts' as const, label: 'Profiles', icon: User },
            { id: 'security' as const, label: 'Security', icon: Shield },
          ].map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  triggerSynthBeep(450 + (idx * 35), 550 + (idx * 35), "neutral");
                }}
                className={`py-1.5 px-0.5 sm:py-2 sm:px-2.5 text-xs font-bold font-sans transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 relative w-full text-center ${
                  isActive
                    ? "text-white font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabOutline"
                    className="absolute inset-0 bg-slate-900 rounded-md -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 33 }}
                  />
                )}
                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-all ${isActive ? "text-blue-400 scale-105" : "text-slate-450"}`} />
                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] tracking-tight uppercase font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex flex-col items-center justify-start overflow-hidden min-h-0">
        <div className="w-full max-w-6xl flex-1 flex flex-col overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="w-full flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {activeTab === "chat" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full w-full min-h-0 flex-1">
                  <section id="chat-interactive-console" className="lg:col-span-8 flex flex-col bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm relative h-full flex-1 min-h-0 w-full">
                  
                  {/* Top Info Header */}
                  <div className="bg-slate-200 border-b border-slate-350 px-4 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-left">
                      <Zap className="w-3.5 h-3.5 text-slate-850 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-900 font-sans uppercase tracking-wider">Intent-Based AI Engine</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-350 text-[9px] font-mono text-slate-750">
                      <span>gemini-2.5 agent brain</span>
                    </div>
                  </div>

                  {/* Messages Stream Wrapper */}
                  <div 
                    className="flex-1 overflow-y-auto p-2 py-1.5 space-y-2 no-scrollbar"
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
                      userIsAtBottomRef.current = isAtBottom;
                    }}
                  >
                    {messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[75%] flex gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                            
                            {/* Speaker icon */}
                            <div className={`w-5 h-5 rounded overflow-hidden flex items-center justify-center shrink-0 border text-[8px] uppercase font-mono ${
                              isUser 
                                ? "bg-slate-200 text-slate-800 border-slate-300" 
                                : "bg-slate-900 text-white border-transparent"
                            }`}>
                              {isUser ? (
                                <span>U</span>
                              ) : (
                                <img 
                                  src={robotAvatar} 
                                  alt="Bot avatar" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer" 
                                />
                              )}
                            </div>

                            {/* Speech box bubble wrapper */}
                            <div className={`flex flex-col ${isUser ? "items-end text-right" : "items-start text-left"} max-w-full min-w-0`}>
                              
                              {/* Metadata Line */}
                              <div className={`flex items-center gap-1 mb-0.5 text-[8px] sm:text-[9.5px] font-mono text-slate-400 select-none leading-none ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                <span className={`font-bold uppercase tracking-wider ${isUser ? "text-blue-600" : "text-slate-650"}`}>
                                  {isUser ? "You" : "Arc Agent"}
                                </span>
                                <span>•</span>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isUser && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" /> Sent
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Speech box bubble */}
                              <div className={`py-1 px-2.5 rounded-lg sm:rounded-xl text-xs leading-normal relative w-fit max-w-[100%] transition-all duration-300 ${
                                msg.status === "completed"
                                  ? "bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-tl-none shadow-3xs"
                                  : isUser 
                                    ? "bg-slate-200/90 text-slate-950 border border-slate-350 rounded-tr-none shadow-3xs" 
                                    : "bg-slate-100 text-slate-900 border border-slate-250 rounded-tl-none font-sans"
                              }`}>
                                <div className="flex flex-col">
                                  <div className="text-[11px] sm:text-xs leading-normal break-words">{msg.text}</div>
                                </div>

                                {/* Interactive UI Draft Transaction Confirm Card inline */}
                                {msg.transaction && msg.status === "confirming" && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-300 text-slate-900 space-y-1.5 font-sans w-64 max-w-sm sm:w-80">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-1">
                                      <span className="text-[9px] font-bold font-sans text-slate-900 uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse shrink-0" /> Confirm payment request
                                      </span>
                                      <span className="text-[8px] font-mono text-slate-500 uppercase">Arc gasless</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                                      <div>
                                        <span className="text-slate-400 font-mono text-[7px] uppercase tracking-wider block">Recipient</span>
                                        <div className="font-bold text-slate-900 mt-0.5 truncate">{msg.transaction.toName}</div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-mono text-[7px] uppercase tracking-wider block">Address</span>
                                        <div className="font-mono text-slate-650 bg-slate-50 px-1 py-0.2 rounded border border-slate-200 text-[8px] mt-0.5 truncate" title={msg.transaction.toAddress}>
                                          {msg.transaction.toAddress.slice(0, 6)}...{msg.transaction.toAddress.slice(-4)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-mono text-[7px] uppercase tracking-wider block">Amount</span>
                                        <div className="font-bold text-slate-950 text-[10.5px] mt-0.5">
                                          {msg.transaction.amount} {msg.transaction.token}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-mono text-[7px] uppercase tracking-wider block">Context Memo</span>
                                        <div className="italic text-slate-650 mt-0.5 truncate font-sans text-[8.5px]">{msg.transaction.note || "N/A"}</div>
                                      </div>
                                    </div>

                                    {/* Actions block */}
                                    {activeDraft && activeDraft.id === msg.transaction.id ? (
                                      <div className="flex gap-1.5 pt-1 pb-0.5">
                                        <button
                                          onClick={() => executeConfirmedTransaction(msg.transaction!)}
                                          className="flex-1 bg-slate-900 text-white font-bold font-sans text-[9px] py-1 rounded hover:bg-slate-800 active:scale-[0.99] transition cursor-pointer shadow-3xs"
                                        >
                                          {securityConfig.biometricsEnabled ? "Approve" : "Sign & Send USDC"}
                                        </button>
                                        <button
                                          onClick={cancelTransactionDraft}
                                          className="px-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-650 font-bold font-sans text-[9px] rounded transition cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="text-[8px] text-slate-400 uppercase font-mono tracking-wider pt-0.5 italic text-center">
                                        Outdated signature session.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Interactive UI Success Transaction Details inline */}
                                {msg.transaction && msg.status === "completed" && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-white/95 border border-emerald-300 text-slate-900 space-y-1.5 font-sans shadow-3xs w-64 max-w-sm sm:w-80">
                                    <div className="flex items-center justify-between border-b border-emerald-100 pb-1 flex-wrap gap-1">
                                      <div className="flex items-center gap-1 text-emerald-800 font-bold text-[9px] uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>On-Chain Receipt Finalized</span>
                                      </div>
                                      <span className="text-[7.5px] px-1 py-0.2 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded font-mono font-bold uppercase">arc testnet</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                                      <div>
                                        <span className="text-slate-500 font-mono text-[7px] uppercase tracking-wider block">Transfer Amount</span>
                                        <div className="font-extrabold text-emerald-700 text-[11px] mt-0.5">
                                          {msg.transaction.amount} {msg.transaction.token}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <span className="text-slate-500 font-mono text-[7px] uppercase tracking-wider block">Recipient Contact</span>
                                        <div className="font-bold text-slate-900 mt-0.5 truncate flex items-center gap-0.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          {msg.transaction.toName}
                                        </div>
                                      </div>

                                      <div className="col-span-2">
                                        <span className="text-slate-500 font-mono text-[7px] uppercase tracking-wider block">Recipient EVM Address</span>
                                        <div className="flex items-center justify-between bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-800 mt-0.5">
                                          <span className="truncate select-all max-w-[80%]">{msg.transaction.toAddress}</span>
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(msg.transaction!.toAddress);
                                              triggerSynthBeep(600, 400, "success");
                                            }}
                                            className="ml-1 text-[8px] text-blue-650 hover:text-blue-800 font-bold shrink-0 cursor-pointer"
                                            title="Copy address"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pt-1.5 border-t border-emerald-100 text-[8px]">
                                      {msg.transaction.isLocalLedger ? (
                                        <div className="text-[8px] text-emerald-800 font-sans font-semibold flex items-center gap-1 py-0.5 px-1 bg-emerald-50/50 rounded border border-emerald-150 select-none">
                                          <span>Local Enclave Ledger Adjustment (Sandbox State Sync)</span>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div>
                                            <span className="text-slate-500 font-mono text-[7px] uppercase tracking-wider block">On-Chain Transaction Proof (Hash)</span>
                                            <div className="px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[7.5px] font-mono text-slate-600 break-all select-all font-semibold leading-tight">
                                              {msg.transaction.txHash}
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-1">
                                            {/* Open in New Tab for Desktop */}
                                            <a
                                              href={`https://testnet.arcscan.app/tx/${msg.transaction.txHash}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-255 text-slate-700 rounded transition font-sans cursor-pointer"
                                            >
                                              <span>New Tab Explorer</span>
                                              <ExternalLink className="w-2 h-2 text-slate-500" />
                                            </a>

                                            {/* Open in Same Tab for Mobile dApp Browsers to avoid blocked popup windows */}
                                            <a
                                              href={`https://testnet.arcscan.app/tx/${msg.transaction.txHash}`}
                                              target="_self"
                                              className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-white rounded transition font-sans cursor-pointer"
                                              title="Direct link for MetaMask/Trust mobile wallet browser"
                                            >
                                              <span>Same Tab</span>
                                            </a>

                                            {/* Copy transaction direct explorer URL with dynamic feedback */}
                                            <button
                                              onClick={() => {
                                                const url = `https://testnet.arcscan.app/tx/${msg.transaction!.txHash}`;
                                                navigator.clipboard.writeText(url);
                                                setCopiedTxId(msg.id);
                                                triggerSynthBeep(650, 750, "neutral");
                                                setTimeout(() => {
                                                  setCopiedTxId(null);
                                                }, 2000);
                                              }}
                                              className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded transition font-sans cursor-pointer ${
                                                copiedTxId === msg.id 
                                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
                                                  : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700"
                                              }`}
                                            >
                                              {copiedTxId === msg.id ? "Copied!" : "Copy Link"}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Interactive UI Insufficient Gas / Funds Help Card inline */}
                                {(msg.status === "failed" || msg.text?.toLowerCase().includes("insufficient funds")) && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-300 text-slate-900 space-y-1.5 font-sans shadow-3xs w-64 max-w-sm sm:w-80">
                                    <div className="flex items-center justify-between border-b border-rose-100 pb-0.5 flex-wrap gap-1">
                                      <div className="flex items-center gap-1 text-rose-800 font-bold text-[9px] uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                        <span>Gas Faucet & Sandbox Guide</span>
                                      </div>
                                      <span className="text-[7.5px] px-1 py-0.2 bg-rose-100 border border-rose-250 text-rose-800 rounded font-mono font-bold uppercase">low funds</span>
                                    </div>

                                    <div className="text-[9px] text-slate-700 leading-normal space-y-1">
                                      <p>
                                        Your gas wallet <strong className="font-mono bg-white px-1 border border-slate-150 rounded text-[8.5px] select-all">{wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : ""}</strong> has no native tokens on Arc Testnet to claim.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                      {/* Pathway 1: Toggle simulated mode */}
                                      <button
                                        onClick={async () => {
                                          triggerSynthBeep(520, 1000, "success");
                                          setNetworkMode('simulated');
                                          // Clean message list or inform success
                                          setMessages(prev => [
                                            ...prev,
                                            {
                                              id: `m-simulated-${Date.now()}`,
                                              sender: "agent",
                                              text: "⚡ Instantly switched back to Simulated Sandbox Ledger. Unlimited gas-free mock transactions are now fully enabled with $150 USDC starting balance! Try repeating your transaction now.",
                                              timestamp: new Date().toISOString(),
                                              status: "completed"
                                            }
                                          ]);
                                        }}
                                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[8.5px] rounded-md cursor-pointer transition active:scale-[0.98] shadow-3xs"
                                      >
                                        Simulated Mock ⚡
                                      </button>

                                      {/* Pathway 2: Open official faucet */}
                                      <a
                                        href="https://faucet.circle.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          triggerSynthBeep(600, 800, "neutral");
                                          if (wallet?.address) {
                                            navigator.clipboard.writeText(wallet.address);
                                          }
                                        }}
                                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[8.5px] rounded-md cursor-pointer transition text-center active:scale-[0.98] shadow-3xs"
                                      >
                                        CLAIM TESTNET GAS/USDC ⚡
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {/* Spinner loading state */}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] flex gap-1.5">
                          <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center shrink-0 bg-slate-200 border border-slate-350 text-slate-650">
                            <Bot className="w-3 h-3 animate-spin animate-pulse" />
                          </div>
                          <div className="space-y-1 text-left">
                            <div className="px-2.5 py-1 bg-slate-100/90 text-slate-600 border border-slate-300 rounded-xl rounded-tl-none font-sans text-[11px] flex items-center gap-1.5 shadow-3xs">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                              <span>Agent evaluating request intent...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Simulated overlay prompt during active WebAuthn simulated biometric block */}
                    {biometricSigningInProgress && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-40 p-6 text-center">
                        <div className="relative mb-5">
                          <div className="w-16 h-16 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center animate-pulse" />
                          <Fingerprint className="w-8 h-8 text-slate-900 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-900">Signature Required</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-[300px] leading-relaxed mx-auto">
                          Arc Shield is querying your hardware authenticator. Please place your finger on the sensor or touch your biometric key to verify your identity.
                        </p>
                        <div className="mt-4 px-3 py-1 bg-slate-150 border border-slate-300 text-[9px] font-mono text-slate-750 rounded">
                          SHA256_assertion_verify_session
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick-suggestion panel for fast testing */}
                  <div className="px-2 sm:px-4 py-1.5 border-t border-slate-350 bg-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mr-1 shrink-0">Options:</span>
                    <button
                      onClick={() => handleSelectContact("Musa")}
                      className="text-[9.5px] bg-white border border-slate-350 px-2.5 py-1 sm:py-0.5 text-slate-700 hover:text-slate-900 hover:border-slate-400 rounded-lg transition cursor-pointer shrink-0"
                    >
                      "Send 10 USDC to Musa"
                    </button>
                    <button
                      onClick={() => setInputText("Send 50 USDC to Alice for lunch contribution")}
                      className="text-[9.5px] bg-white border border-slate-350 px-2.5 py-1 sm:py-0.5 text-slate-700 hover:text-slate-900 hover:border-slate-400 rounded-lg transition cursor-pointer shrink-0"
                    >
                      "Send 50 USDC to Alice"
                    </button>
                    <button
                      onClick={() => setInputText("Who is Bob?")}
                      className="text-[9.5px] bg-white border border-slate-355 px-2.5 py-1 sm:py-0.5 text-slate-700 hover:text-slate-900 hover:border-slate-400 rounded-lg transition cursor-pointer shrink-0"
                    >
                      "Who is Bob?"
                    </button>
                  </div>

                  {/* Chat Form Input */}
                  <form onSubmit={handleSendMessage} className="p-1.5 sm:p-2 bg-white border-t border-slate-300 flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Send 10 USDC to Musa"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 px-3 py-2 sm:py-1.5 bg-slate-150 border border-slate-350 text-xs text-slate-1000 rounded-lg focus:outline-none focus:border-slate-800 focus:bg-white font-sans disabled:opacity-50 placeholder:text-slate-500 text-left"
                    />
                    
                    <button
                      type="submit"
                      disabled={isProcessing || !inputText.trim()}
                      className="px-3 sm:px-3.5 py-2 sm:py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold font-sans transition flex items-center gap-1 sm:gap-1.5 active:scale-[0.99] disabled:opacity-40 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                      title="Submit command to agent"
                    >
                      <span>Execute</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </section>

                {/* Right side Enclave Dashboard Sidebar - showing 3 previous commitments */}
                <div className="lg:col-span-4 hidden lg:flex flex-col gap-4 h-full min-h-0">
                  {/* Quick System Health / Hardware Enclave status card */}
                  <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-3xs text-left relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-900" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold font-display uppercase text-[10px] tracking-wide">
                        <Cpu className="w-3.5 h-3.5 text-slate-500" />
                        <span>Enclave Profile</span>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-display text-slate-950">${wallet.balance.toFixed(2)}</span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">USDC Spot</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600 truncate bg-slate-50 border border-slate-200 rounded px-2 py-1 select-none font-mono">
                      Proxy: {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-150 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Security Guard:</span>
                      <span className="text-emerald-700 font-bold uppercase tracking-wider">Armed (HSM)</span>
                    </div>
                  </div>

                  {/* 3 Previous Commitments card */}
                  <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-3xs text-left flex-1 flex flex-col min-h-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-800" />
                    <div className="flex items-center justify-between mb-2.5 shrink-0">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-550">3 Previous Commitments</span>
                      <span className="text-[8px] font-mono bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.2 rounded font-bold uppercase">Sync</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 no-scrollbar min-h-0">
                      {transactions.slice(0, 3).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                          <History className="w-6 h-6 text-slate-300 stroke-[1.5] mb-1" />
                          <div className="text-[9px] font-mono uppercase italic">No cryptographic records found</div>
                        </div>
                      ) : (
                        transactions.slice(0, 3).map((tx) => (
                          <div key={tx.id} className="p-2 border border-slate-200/90 bg-slate-50 rounded-lg text-[10px] space-y-1 hover:bg-slate-100/40 transition duration-100">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-950 truncate max-w-[100px]">To: {tx.toName}</span>
                              <span className="font-bold text-slate-950">+{tx.amount.toFixed(1)} USDC</span>
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-455 font-mono">
                              <span>{tx.toAddress.slice(0, 6)}...{tx.toAddress.slice(-4)}</span>
                              <span className="uppercase text-emerald-705 font-bold">{tx.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setActiveTab("transactions")}
                      className="w-full text-center text-[9px] uppercase font-mono mt-2.5 text-blue-600 hover:text-blue-800 font-bold tracking-wider hover:underline flex items-center justify-center gap-1 shrink-0 cursor-pointer pt-2 border-t border-slate-150"
                    >
                      Launch Cryptographic Ledger →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "wallet" && (
              <div className="w-full flex-1 min-h-0 overflow-y-auto py-2 px-1.5 flex flex-col justify-start items-center">
                <div className="max-w-4xl w-full">
                    <WalletCard 
                      wallet={wallet} 
                      onRefresh={fetchWallet} 
                      onFaucet={handleFaucet} 
                      networkMode={networkMode}
                    />
                  </div>
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto py-1 bg-white border border-slate-300 rounded-xl">
                  <TransactionHistory 
                    transactions={transactions} 
                    onRefresh={fetchTransactions} 
                  />
                </div>
              )}

              {activeTab === "contacts" && (
                <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto py-1 bg-white border border-slate-300 rounded-xl">
                  <ContactsDatabase 
                    contacts={contacts} 
                    onAddContact={handleAddContact} 
                    onSelectContact={handleSelectContact} 
                  />
                </div>
              )}

              {activeTab === "security" && (
                <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto py-1 bg-white border border-slate-300 rounded-xl">
                  <SecurityConsole 
                    securityConfig={securityConfig} 
                    onToggleBiometrics={handleToggleBiometrics} 
                    encryptionLogs={encryptionLogs} 
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer System Band */}
      <footer id="network-footer-bar" className="mt-auto shrink-0 border-t border-slate-300 bg-white p-2 sm:p-4 font-mono text-[9px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>© ARC COMPANION 2026. BY WAZIRI.</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-sans font-bold text-slate-700">
            <img 
              src={robotAvatar} 
              alt="Arccompanion Logo" 
              className="w-3.5 h-3.5 rounded-md object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] tracking-tight">Arccompanion</span>
          </div>
          <span className="hidden md:inline">UTC: {new Date().toISOString().replace('T', ' ').slice(0, 19)}</span>
          <div className="flex items-center gap-3 sm:border-l sm:border-slate-300 sm:pl-3">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors" title="Twitter / X">
              <Twitter className="w-3.5 h-3.5" />
            </a>
            <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors" title="Telegram">
              <Send className="w-3.5 h-3.5 shrink-0 rotate-[-15deg]" />
            </a>
          </div>
        </div>
      </footer>
    </div>
    </AuthGuard>
  );
}
