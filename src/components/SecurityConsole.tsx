import React, { useState } from "react";
import { Shield, Fingerprint, RefreshCw, KeyRound, Check, Lock, Unlock, Eye, Sparkles } from "lucide-react";
import { SecurityConfig } from "../types";

interface SecurityConsoleProps {
  securityConfig: SecurityConfig;
  onToggleBiometrics: () => void;
  encryptionLogs: string[];
}

export default function SecurityConsole({ securityConfig, onToggleBiometrics, encryptionLogs }: SecurityConsoleProps) {
  const [testingBiometrics, setTestingBiometrics] = useState(false);
  const [tested, setTested] = useState(false);

  const simulateBiometricVerification = () => {
    setTestingBiometrics(true);
    setTested(false);
    
    // Play electronic pulse sound
    if (typeof window !== "undefined" && window.AudioContext) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch (e) {}
    }

    setTimeout(() => {
      setTestingBiometrics(false);
      setTested(true);
      // Play high success chime sound
      if (typeof window !== "undefined" && window.AudioContext) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscIndex = [523.25, 659.25, 783.99]; // C5, E5, G5
          oscIndex.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.25);
            osc.start(audioCtx.currentTime + idx * 0.08);
            osc.stop(audioCtx.currentTime + idx * 0.08 + 0.25);
          });
        } catch (e) {}
      }
      setTimeout(() => setTested(false), 3000);
    }, 1200);
  };

  return (
    <div id="security-shield-console" className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs relative overflow-hidden h-full flex flex-col justify-between text-slate-900">
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-left">
            <div className={`p-2 rounded-lg border ${
              securityConfig.biometricsEnabled 
                ? "bg-stone-200 border-stone-300 text-slate-800" 
                : "bg-slate-200 border-slate-300 text-slate-500"
            }`}>
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-bold tracking-wider text-slate-900 font-display uppercase">Security Shield</h2>
              <p className="text-[9px] text-slate-500 font-mono uppercase">Cryptographic Guard Status</p>
            </div>
          </div>

          <div className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-semibold border ${
            securityConfig.biometricsEnabled
              ? "bg-slate-900 text-white border-transparent"
              : "bg-slate-200 text-slate-700 border-slate-300"
          }`}>
            {securityConfig.biometricsEnabled ? "BIOMETRICS ON" : "STANDARD PROTECT"}
          </div>
        </div>

        {/* Biometrics Config Toggle */}
        <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 shrink-0 relative overflow-hidden text-left">
          <div className="flex justify-between items-start mb-3">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 font-display">
                <span>Biometric TouchID Prompt</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                Require device biometric validation prompt before finalizing transfer orders.
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={onToggleBiometrics}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                securityConfig.biometricsEnabled ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-150 ease-in-out ${
                  securityConfig.biometricsEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Test verification scan button */}
          <button
            onClick={simulateBiometricVerification}
            disabled={testingBiometrics}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-[10px] hover:text-slate-950 hover:bg-slate-150 hover:border-slate-400 font-mono transition duration-150 cursor-pointer"
          >
            {testingBiometrics ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-slate-900" />
                <span className="text-slate-700">Validating fingerprint sensor...</span>
              </>
            ) : tested ? (
              <>
                <Check className="w-3 h-3 text-emerald-650 animate-bounce" />
                <span className="text-emerald-700 font-bold">Biometric Verified</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-3.5 h-3.5 text-slate-550" />
                <span>Interact with TouchID prompt</span>
              </>
            )}
          </button>
        </div>

        {/* Encryption Algorithm visualizer details */}
        <div className="space-y-1.5 text-left flex-1 flex flex-col min-h-0">
          <div className="text-[9px] uppercase font-mono tracking-widest text-slate-500 shrink-0">Security Audit Logs</div>
          <div className="bg-slate-200/70 p-2.5 rounded-lg border border-slate-300 font-mono text-[9px] text-slate-700 flex-1 overflow-y-auto no-scrollbar space-y-1 min-h-0">
            {encryptionLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-4">Logs offline...</div>
            ) : (
              encryptionLogs.map((log, index) => (
                <div key={index} className="border-b border-slate-300/60 pb-0.5 flex items-start gap-1">
                  <span className="text-slate-500 font-bold">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Security compliance indicators */}
      <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 mt-3 shrink-0 text-left">
        <div className="flex gap-2 items-center text-[10px] text-slate-750">
          <KeyRound className="w-3.5 h-3.5 text-slate-800" />
          <span className="font-bold text-slate-900 font-display">Hardware Enclave v2.4</span>
        </div>
        <p className="text-[9px] text-slate-400 mt-1 leading-normal font-mono">
          Decryption key derived on client-side with 256-bit PBKDF2 standard. No private elements leave safe memory.
        </p>
      </div>
    </div>
  );
}
