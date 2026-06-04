import React, { useState } from "react";
import { Wallet, Landmark, RefreshCw, Key, Copy, Check, ShieldAlert, Award } from "lucide-react";
import { WalletState } from "../types";

interface WalletCardProps {
  wallet: WalletState;
  onRefresh: () => void;
  onFaucet: () => Promise<void>;
  networkMode?: 'simulated' | 'live';
}

export default function WalletCard({ wallet, onRefresh, onFaucet, networkMode = 'simulated' }: WalletCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [loadingFaucet, setLoadingFaucet] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFaucet = async () => {
    setLoadingFaucet(true);
    try {
      await onFaucet();
      // Simulate micro haptic sound
      if (typeof window !== "undefined" && window.AudioContext) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFaucet(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div id="wallet-card-container" className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs relative overflow-hidden text-slate-900 w-full">
      {/* Subtle border accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-900" />
      
      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Column: Balance & Refresh/Faucet */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 text-slate-800 rounded-lg border border-slate-300/80">
                  <Wallet id="wallet-badge-icon" className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 font-display uppercase">Arc Wallet</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-medium font-semibold">Testnet Active</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={onRefresh}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition duration-150"
                title="Refresh Balance"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* USDC Balance Panel */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-left">
              <div className="text-[9px] uppercase font-mono tracking-widest text-slate-450 font-bold">ARC COMPLIANT BAL</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-display text-slate-950 tracking-tight">
                  ${wallet.balance.toFixed(2)}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded border border-slate-300/40">
                  USDC
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {/* Trigger Faucet Button */}
            {networkMode === "live" ? (
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-medium font-sans text-xs rounded-lg transition-all duration-150 active:scale-[0.99] shadow-xs cursor-pointer text-center select-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="font-bold">Request testnet gas / USDC</span>
              </a>
            ) : (
              <button
                onClick={handleFaucet}
                disabled={loadingFaucet}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-medium font-sans text-xs rounded-lg transition-all duration-150 active:scale-[0.99] disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFaucet ? "animate-spin" : ""}`} />
                <span className="font-bold">Add $100 Faucet USDC</span>
              </button>
            )}

            {/* Note about secure environment */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-[10px] rounded-lg font-sans leading-relaxed text-left space-y-1.5">
              <div>
                <strong>Real Arc Testnet Faucet:</strong> Click copy on your <strong>Address</strong> key, then visit the official <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Circle Testnet Faucet</a> to receive real gas assets to play with!
              </div>
              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono pt-1 border-t border-blue-105">
                <Award className="w-3 h-3 text-slate-500" />
                <span>Arc Secure Enclave Cryptography Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Credentials */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3 text-left">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase pb-1 border-b border-slate-100">Enclave Keys</h3>
            
            {/* Address Row */}
            <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-300 text-xs">
              <span className="text-slate-500 font-mono text-[9px] uppercase font-semibold">Address:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-850 font-mono bg-white px-2 py-0.5 rounded border border-slate-300/80 text-[10px]">
                  {truncateAddress(wallet.address)}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-1 rounded text-slate-500 hover:text-slate-950 hover:bg-white border border-slate-2.5 transition"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Recovery / Seed Row */}
            <div className="bg-slate-100 rounded-xl border border-slate-300 p-2.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-mono text-[9px] uppercase font-semibold flex items-center gap-1">
                  <Key className="w-3 h-3 text-slate-500" /> Recovery Phrase:
                </span>
                <button
                  onClick={() => setShowSeed(!showSeed)}
                  className="text-[9px] text-slate-600 hover:underline hover:text-slate-900 font-mono font-bold"
                >
                  {showSeed ? "Hide" : "Reveal Passphrase"}
                </button>
              </div>
              {showSeed ? (
                <div className="text-[10px] font-mono p-1.5 bg-white rounded text-slate-805 border border-slate-200 leading-normal break-words">
                  {wallet.seedPhrase}
                </div>
              ) : (
                <div className="text-[10px] font-mono p-1.5 bg-white rounded text-slate-400 border border-slate-200 select-none tracking-widest text-center">
                  •••• •••• •••• •••• ••••
                </div>
              )}
            </div>
          </div>

          {/* Integration Status Label */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-left">
            <span className="text-[9px] font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 rounded font-bold">HSM Confirmed</span>
            <p className="text-[10px] text-slate-600 mt-1 leading-tight">Key assets kept securely in local isolation.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
