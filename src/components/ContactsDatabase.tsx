import React, { useState } from "react";
import { User, UserPlus, Shield, HelpCircle, Activity, ChevronRight, Check } from "lucide-react";
import { Contact } from "../types";

interface ContactsDatabaseProps {
  contacts: any[];
  onAddContact: (name: string, address: string, note: string) => Promise<void>;
  onSelectContact: (name: string) => void;
}

export default function ContactsDatabase({ contacts, onAddContact, onSelectContact }: ContactsDatabaseProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Name and blockchain address are required.");
      return;
    }
    if (!address.startsWith("0x") || address.length < 30) {
      setError("Please provide a valid 0x standard Blockchain address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onAddContact(name.trim(), address.trim(), note.trim());
      setName("");
      setAddress("");
      setNote("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save contact.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAddress = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div id="contacts-db-section" className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs relative overflow-hidden text-slate-900 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-200 text-slate-800 rounded-lg border border-slate-350">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-bold tracking-wider text-slate-900 font-display uppercase">Contact Memory</h2>
            <p className="text-[9px] text-slate-500 font-mono text-left uppercase">Arc Address Resolvers</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium font-display transition duration-150 cursor-pointer ${
            showAddForm
              ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-250"
              : "bg-slate-200 text-slate-800 hover:bg-slate-250 border border-slate-300"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showAddForm ? "Cancel" : "Add Target"}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 bg-slate-100 rounded-xl border border-slate-300 space-y-3">
          <div className="text-xs font-semibold text-slate-900 font-display text-left">Create Encrypted Record</div>
          
          {error && <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{error}</div>}

          <div className="space-y-1">
            <label className="block text-[10px] font-mono tracking-widest text-slate-500 uppercase text-left">Recipient Name</label>
            <input
              type="text"
              placeholder="e.g. Musa, Alice, Bob"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded bg-slate-50 text-slate-900 border border-slate-300 focus:outline-none focus:border-slate-800 font-display"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono tracking-widest text-slate-500 uppercase text-left">Arc Wallet Address (0x)</label>
            <input
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded bg-slate-50 text-slate-900 border border-slate-300 focus:outline-none focus:border-slate-800 font-mono"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono tracking-widest text-slate-500 uppercase text-left">Context Note</label>
            <input
              type="text"
              placeholder="e.g. Best Developer friend"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded bg-slate-50 text-slate-900 border border-slate-300 focus:outline-none focus:border-slate-800"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold font-display shadow"
          >
            {submitting ? "Encrypting Memory..." : "Publish Memory to Arc resolver"}
          </button>
        </form>
      )}

      {/* Directory List */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 text-left my-2">
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-none">
            <p className="text-slate-500 text-xs">No memories recorded yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop List Table */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-mono uppercase tracking-widest text-slate-450">
                    <th className="pb-2 font-bold">Recipient Name</th>
                    <th className="pb-2 font-bold">Arc Wallet Address</th>
                    <th className="pb-2 font-bold">Context Note</th>
                    <th className="pb-2 font-bold">Security State</th>
                    <th className="pb-2 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/75 transition duration-150">
                      <td className="py-2.5 font-bold text-slate-900 font-display text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{contact.name}</span>
                          {contact.secureMetadata && (
                            <span className="text-[8px] font-mono bg-slate-200 text-slate-650 px-1 py-0.2 rounded font-bold uppercase tracking-widest">AES SECURED</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <button 
                          onClick={() => copyAddress(contact.id, contact.address)}
                          className="font-mono text-[10.5px] text-slate-600 hover:text-slate-950 transition font-semibold"
                          title="Click to copy address"
                        >
                          {copiedId === contact.id ? (
                            <span className="text-emerald-600 font-bold">Copied address</span>
                          ) : (
                            truncateAddress(contact.address)
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 text-slate-600 italic text-[11px] truncate max-w-[160px]">{contact.note || "—"}</td>
                      <td className="py-2.5">
                        <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold">Enclave Confirmed</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onSelectContact(contact.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold font-display transition cursor-pointer"
                        >
                          <span>Draft TX</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View fallback */}
            <div className="md:hidden space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/90 transition duration-150 flex items-center justify-between relative group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 font-display">{contact.name}</span>
                      {contact.secureMetadata && (
                        <span 
                          className="text-[8px] font-mono bg-slate-300 text-slate-700 px-1 py-0.2 rounded font-semibold"
                          title={`Encrypted ID: ${contact.secureMetadata.encryptedName}`}
                        >
                          AES secured
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <button 
                        onClick={() => copyAddress(contact.id, contact.address)}
                        className="font-mono text-[10px] text-slate-600 hover:text-slate-900 transition"
                        title="Click to copy address"
                      >
                        {copiedId === contact.id ? "Copied!" : truncateAddress(contact.address)}
                      </button>
                      <span className="text-slate-400 text-[10px]">•</span>
                      <span className="text-[10px] text-slate-600 truncate block max-w-[120px]">{contact.note}</span>
                    </div>
                  </div>

                  {/* Quick Trigger Button */}
                  <button
                    onClick={() => onSelectContact(contact.name)}
                    className="opacity-100 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 hover:bg-slate-900 hover:text-white text-slate-800 text-[10px] font-medium font-display transition duration-150"
                    title={`Draft text for ${contact.name}`}
                  >
                    <span>Draft TX</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-300/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" /> AES-256 Memory Guard Enabled
        </span>
        <span>Local Database synced</span>
      </div>
    </div>
  );
}
