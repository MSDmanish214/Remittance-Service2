"use client";

import { useState, useCallback } from "react";
import {
  sendRemittance,
  claimRemittance,
  cancelRemittance,
  getRemittance,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ClaimIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" | "danger" }> = {
  Pending: { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", dot: "bg-[#fbbf24]", variant: "warning" },
  Claimed: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  Cancelled: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "danger" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "send" | "claim" | "cancel" | "lookup";

interface RemittanceData {
  amount: string;
  claimed: string;
  expiry: string;
  is_claimed: boolean;
  is_cancelled: boolean;
  sender: string;
  recipient: string;
  secret: string;
}

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Send state
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendSecret, setSendSecret] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendExpiry, setSendExpiry] = useState("3600");
  const [isSending, setIsSending] = useState(false);

  // Claim state
  const [claimSender, setClaimSender] = useState("");
  const [claimSecret, setClaimSecret] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // Cancel state
  const [cancelRecipient, setCancelRecipient] = useState("");
  const [cancelSecret, setCancelSecret] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Lookup state
  const [lookupSender, setLookupSender] = useState("");
  const [lookupRecipient, setLookupRecipient] = useState("");
  const [lookupSecret, setLookupSecret] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupData, setLookupData] = useState<RemittanceData | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleSend = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!sendRecipient.trim() || !sendSecret.trim() || !sendAmount.trim() || !sendExpiry.trim())
      return setError("Fill in all fields");
    const amount = BigInt(Math.floor(parseFloat(sendAmount) * 1e7));
    if (amount <= BigInt(0)) return setError("Amount must be greater than 0");
    const expiry = Math.floor(parseFloat(sendExpiry));
    if (expiry <= 0) return setError("Expiry must be greater than 0");

    setError(null);
    setIsSending(true);
    setTxStatus("Awaiting signature...");
    try {
      await sendRemittance(walletAddress, sendRecipient.trim(), sendSecret.trim(), amount, expiry);
      setTxStatus("Remittance sent on-chain!");
      setSendRecipient("");
      setSendSecret("");
      setSendAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsSending(false);
    }
  }, [walletAddress, sendRecipient, sendSecret, sendAmount, sendExpiry]);

  const handleClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!claimSender.trim() || !claimSecret.trim() || !claimAmount.trim())
      return setError("Fill in all fields");
    const claimed = BigInt(Math.floor(parseFloat(claimAmount) * 1e7));
    if (claimed <= BigInt(0)) return setError("Amount must be greater than 0");

    setError(null);
    setIsClaiming(true);
    setTxStatus("Awaiting signature...");
    try {
      await claimRemittance(walletAddress, claimSecret.trim(), claimSender.trim(), claimed);
      setTxStatus("Remittance claimed on-chain!");
      setClaimSender("");
      setClaimSecret("");
      setClaimAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, claimSender, claimSecret, claimAmount]);

  const handleCancel = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!cancelRecipient.trim() || !cancelSecret.trim())
      return setError("Fill in all fields");

    setError(null);
    setIsCancelling(true);
    setTxStatus("Awaiting signature...");
    try {
      await cancelRemittance(walletAddress, cancelRecipient.trim(), cancelSecret.trim());
      setTxStatus("Remittance cancelled on-chain!");
      setCancelRecipient("");
      setCancelSecret("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCancelling(false);
    }
  }, [walletAddress, cancelRecipient, cancelSecret]);

  const handleLookup = useCallback(async () => {
    if (!lookupSender.trim() || !lookupRecipient.trim() || !lookupSecret.trim())
      return setError("Fill in all fields (sender, recipient, secret)");
    setError(null);
    setIsLookingUp(true);
    setLookupData(null);
    try {
      const result = await getRemittance(
        lookupSender.trim(),
        lookupRecipient.trim(),
        lookupSecret.trim(),
        walletAddress || undefined
      );
      if (result) {
        setLookupData(result as RemittanceData);
      } else {
        setError("Remittance not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLookingUp(false);
    }
  }, [lookupSender, lookupRecipient, lookupSecret, walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "send", label: "Send", icon: <SendIcon />, color: "#7c6cf0" },
    { key: "claim", label: "Claim", icon: <ClaimIcon />, color: "#34d399" },
    { key: "cancel", label: "Cancel", icon: <CancelIcon />, color: "#f87171" },
    { key: "lookup", label: "Lookup", icon: <SearchIcon />, color: "#4fc3f7" },
  ];

  const formatXLM = (raw: string | number | bigint) => {
    const n = typeof raw === "bigint" ? Number(raw) / 1e7 : Number(raw);
    return n.toFixed(7).replace(/\.?0+$/, "") + " XLM";
  };

  const getRemittanceStatus = (data: RemittanceData) => {
    if (data.is_claimed) return "Claimed";
    if (data.is_cancelled) return "Cancelled";
    return "Pending";
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#34d399]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Remittance Service</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setTxStatus(null); setLookupData(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Send */}
            {activeTab === "send" && (
              <div className="space-y-5">
                <MethodSignature name="send" params="(sender, recipient, secret, amount, expiry_seconds)" color="#7c6cf0" />
                <Input label="Recipient Address" value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} placeholder="G... (recipient's wallet)" />
                <Input label="Secret PIN / Code" value={sendSecret} onChange={(e) => setSendSecret(e.target.value)} placeholder="Share this secretly with recipient" />
                <Input label="Amount (XLM)" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="e.g. 10" type="number" />
                <Input label="Expiry (seconds)" value={sendExpiry} onChange={(e) => setSendExpiry(e.target.value)} placeholder="3600" type="number" />

                <div className="rounded-xl border border-[#7c6cf0]/10 bg-[#7c6cf0]/[0.03] px-4 py-3">
                  <p className="text-[10px] text-[#7c6cf0]/50 uppercase tracking-wider font-medium">Share these with the recipient</p>
                  <p className="text-xs text-white/40 mt-1">
                    <span className="font-mono text-white/60">Secret:</span> {sendSecret || "—"} &nbsp;
                    <span className="font-mono text-white/60">Amount:</span> {sendAmount || "—"} XLM
                  </p>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleSend} disabled={isSending} shimmerColor="#7c6cf0" className="w-full">
                    {isSending ? <><SpinnerIcon /> Sending...</> : <><SendIcon /> Send Remittance</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    <WalletIcon /> Connect wallet to send
                  </button>
                )}
              </div>
            )}

            {/* Claim */}
            {activeTab === "claim" && (
              <div className="space-y-5">
                <MethodSignature name="claim" params="(recipient, secret, sender, claimed_amount)" returns="-> bool" color="#34d399" />
                <Input label="Your Address (Recipient)" value={claimSender} onChange={(e) => setClaimSender(e.target.value)} placeholder="G... (your wallet, same as recipient)" />
                <Input label="Secret PIN / Code" value={claimSecret} onChange={(e) => setClaimSecret(e.target.value)} placeholder="Enter the secret shared by sender" />
                <Input label="Claimed Amount (XLM)" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} placeholder="Must match the sent amount" type="number" />

                <div className="rounded-xl border border-[#34d399]/10 bg-[#34d399]/[0.03] px-4 py-3">
                  <p className="text-[10px] text-[#34d399]/50 uppercase tracking-wider font-medium">Permissionless claim</p>
                  <p className="text-xs text-white/40 mt-1">Only the recipient can claim. Requires the correct secret PIN and sender address.</p>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleClaim} disabled={isClaiming} shimmerColor="#34d399" className="w-full">
                    {isClaiming ? <><SpinnerIcon /> Claiming...</> : <><ClaimIcon /> Claim Remittance</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    <WalletIcon /> Connect wallet to claim
                  </button>
                )}
              </div>
            )}

            {/* Cancel */}
            {activeTab === "cancel" && (
              <div className="space-y-5">
                <MethodSignature name="cancel" params="(sender, recipient, secret)" returns="-> bool" color="#f87171" />
                <Input label="Your Address (Sender)" value={cancelRecipient} onChange={(e) => setCancelRecipient(e.target.value)} placeholder="G... (your wallet)" />
                <Input label="Secret PIN / Code" value={cancelSecret} onChange={(e) => setCancelSecret(e.target.value)} placeholder="The secret you used when sending" />

                <div className="rounded-xl border border-[#f87171]/10 bg-[#f87171]/[0.03] px-4 py-3">
                  <p className="text-[10px] text-[#f87171]/50 uppercase tracking-wider font-medium">Auto-expiry</p>
                  <p className="text-xs text-white/40 mt-1">Remittances auto-expire based on the expiry time set during send. Unclaimed expired remittances can be cancelled by the sender to reclaim funds.</p>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleCancel} disabled={isCancelling} shimmerColor="#f87171" className="w-full">
                    {isCancelling ? <><SpinnerIcon /> Cancelling...</> : <><CancelIcon /> Cancel Expired Remittance</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#f87171]/20 bg-[#f87171]/[0.03] py-4 text-sm text-[#f87171]/60 hover:border-[#f87171]/30 hover:text-[#f87171]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    <WalletIcon /> Connect wallet to cancel
                  </button>
                )}
              </div>
            )}

            {/* Lookup */}
            {activeTab === "lookup" && (
              <div className="space-y-5">
                <MethodSignature name="get_remittance" params="(sender, recipient, secret)" returns="-> Remittance" color="#4fc3f7" />
                <Input label="Sender Address" value={lookupSender} onChange={(e) => setLookupSender(e.target.value)} placeholder="G... (sender's wallet)" />
                <Input label="Recipient Address" value={lookupRecipient} onChange={(e) => setLookupRecipient(e.target.value)} placeholder="G... (recipient's wallet)" />
                <Input label="Secret PIN / Code" value={lookupSecret} onChange={(e) => setLookupSecret(e.target.value)} placeholder="The secret PIN" />

                <ShimmerButton onClick={handleLookup} disabled={isLookingUp} shimmerColor="#4fc3f7" className="w-full">
                  {isLookingUp ? <><SpinnerIcon /> Querying...</> : <><SearchIcon /> Lookup Remittance</>}
                </ShimmerButton>

                {lookupData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Remittance Details</span>
                      {(() => {
                        const status = getRemittanceStatus(lookupData);
                        const cfg = STATUS_CONFIG[status];
                        return cfg ? (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {status}
                          </Badge>
                        ) : (
                          <Badge>{status}</Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      {[
                        ["Sender", truncate(lookupData.sender)],
                        ["Recipient", truncate(lookupData.recipient)],
                        ["Amount", formatXLM(lookupData.amount)],
                        ["Claimed", formatXLM(lookupData.claimed)],
                        ["Expiry (ledger ts)", lookupData.expiry],
                      ].map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-white/35">{key}</span>
                          <span className="font-mono text-sm text-white/80">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Remittance Service &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Pending", "Claimed", "Cancelled"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", STATUS_CONFIG[s]?.dot ?? "bg-white/20")} />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
