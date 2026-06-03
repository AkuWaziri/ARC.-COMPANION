import React, { useState } from "react";
import { History, ShieldCheck, ExternalLink, Search, RefreshCw, Layers, CheckCircle } from "lucide-react";
import { Transaction } from "../types";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

export default function TransactionHistory({ transactions, onRefresh }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.toName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || tx.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalUSDC = transactions
    .filter((tx) => tx.status === "success")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div id="tx-history-panel" className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs relative overflow-hidden text-slate-900 flex flex-col h-full min-h-[400px]">
      {/* Accent border at the top of the card */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-900" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-200 text-slate-800 rounded-lg border border-slate-300">
            <History className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-bold tracking-wider text-slate-900 font-display uppercase">Transaction History</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-medium">Arc Ledger Synchronized</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition duration-150"
          title="Sync Ledger"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transaction Overview Statistics Bar */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-left">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Secured Volume</div>
          <div className="text-md font-bold text-slate-950 font-display mt-0.5">${totalUSDC.toFixed(2)} USDC</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-left">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Committed Blocks</div>
          <div className="text-md font-bold text-slate-950 font-display mt-0.5">{transactions.length} TXs</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-slate-800"
        >
          <option value="all">All States</option>
          <option value="success">Success</option>
          <option value="confirming">Confirming</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Ledger Records List Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 text-left">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            <Layers className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
            <div className="text-xs font-medium text-slate-500">No cryptographic commitments found</div>
            <div className="text-[9px] text-slate-400 mt-1 max-w-[200px]">Send transactions using natural language console to populate history ledger.</div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-mono uppercase tracking-widest text-slate-450">
                    <th className="pb-2 font-bold">Recipient</th>
                    <th className="pb-2 font-bold">Wallet Address</th>
                    <th className="pb-2 font-bold">Context Note</th>
                    <th className="pb-2 font-bold">Time Commit</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold text-right">Sum</th>
                    <th className="pb-2 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/75 transition duration-150">
                      <td className="py-2.5 font-bold text-slate-900 font-display text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.toName}</span>
                          {tx.securitySigned && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded font-bold uppercase tracking-wider">HSM</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 text-[10px]">{truncateAddress(tx.toAddress)}</td>
                      <td className="py-2.5 text-slate-600 italic truncate max-w-[130px] text-[11px]">{tx.note ? `"${tx.note}"` : "—"}</td>
                      <td className="py-2.5 font-mono text-slate-450 text-[11px]">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === "success" 
                              ? "bg-emerald-500" 
                              : tx.status === "failed" 
                              ? "bg-rose-500" 
                              : "bg-blue-500 animate-pulse"
                          }`} />
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">{tx.status}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-950 font-mono text-xs">
                        +{tx.amount.toFixed(2)} USDC
                      </td>
                      <td className="py-2.5 text-right">
                        {tx.txHash ? (
                          <a
                            href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-950 font-mono border border-slate-200 rounded px-2 py-0.5 bg-white shadow-3xs transition"
                          >
                            <span>{tx.txHash.slice(0, 8)}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg border border-slate-200/90 bg-slate-50 hover:bg-slate-100/70 transition duration-150 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 font-display">
                        To: {tx.toName}
                      </span>
                      {tx.securitySigned && (
                        <span className="flex items-center gap-0.5 text-[8px] bg-emerald-100 text-emerald-808 border border-emerald-200 px-1 py-0.2 rounded font-semibold whitespace-nowrap">
                          <ShieldCheck className="w-2.5 h-2.5" /> HSM-Signed
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">
                        +{tx.amount.toFixed(2)} {tx.token}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-450 font-mono">
                    <span className="truncate max-w-[150px] text-slate-500 hover:text-slate-805 transition" title={tx.toAddress}>
                      {truncateAddress(tx.toAddress)}
                    </span>
                    <span>
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {tx.note && (
                    <div className="text-[10px] italic text-slate-605 border-l border-slate-250 pl-1.5 mt-0.5 truncate">
                      "{tx.note}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-0.5 text-[9px] font-mono uppercase">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tx.status === "success" 
                          ? "bg-emerald-500" 
                          : tx.status === "failed" 
                          ? "bg-rose-500" 
                          : "bg-blue-500 animate-pulse"
                      }`} />
                      <span className="text-slate-450">{tx.status}</span>
                    </div>
                    {tx.txHash ? (
                      <a
                        href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[8px] text-slate-550 bg-white hover:bg-slate-50 border border-slate-200 rounded px-1.5 py-0.2 hover:text-slate-950 transition font-mono"
                      >
                        <span>Hash: {tx.txHash.slice(0, 8)}</span>
                        <ExternalLink className="w-22 h-2.5 text-slate-400" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-1 text-[8px] text-slate-400 bg-white/80 border border-slate-300/40 rounded px-1 py-0.2 select-none">
                        <span>Hash: Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-300">
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Dual HSM-Signatures Active
          </span>
          <span>Blocks synchronized</span>
        </div>
      </div>
    </div>
  );
}
