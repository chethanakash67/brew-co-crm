"use client";

import { Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { DraftPreviewCustomer, Segment } from "@/lib/api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const channels = ["whatsapp", "sms", "email"];

/** Substitutes personalisation variables with a specific sample customer for preview */
function previewMessage(template: string, customer: DraftPreviewCustomer): string {
  return template
    .replace(/\{\{name\}\}/gi, customer.name)
    .replace(/\{\{city\}\}/gi, customer.city)
    .replace(/\{\{tier\}\}/gi, customer.tier)
    .replace(/\{\{totalSpend\}\}/gi, String(Math.round(customer.totalSpend)))
    .replace(/\{\{totalOrders\}\}/gi, String(customer.totalOrders))
    .replace(/\{\{favoriteItem\}\}/gi, customer.favoriteItem)
    .replace(/\{\{lastItem\}\}/gi, customer.lastItem)
    .replace(/\{\{lastOrderDaysAgo\}\}/gi, customer.lastOrderDaysAgo === null ? "a few" : String(customer.lastOrderDaysAgo));
}

export function MessageDraftModal({
  open,
  onClose,
  segments,
  onLaunched
}: {
  open: boolean;
  onClose: () => void;
  segments: Segment[];
  onLaunched: () => Promise<void> | void;
}) {
  const [step, setStep] = useState(1);
  const [segmentId, setSegmentId] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [goal, setGoal] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [previewCustomers, setPreviewCustomers] = useState<DraftPreviewCustomer[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedAi, setUsedAi] = useState(true);
  const [channelsList, setChannelsList] = useState<string[]>(["whatsapp", "sms", "email"]);

  useEffect(() => {
    if (!open) return;
    api.getStores()
      .then((storesList) => {
        const activeId = localStorage.getItem("activeStoreId");
        const activeStore = storesList.find(s => s.id === activeId);
        if (activeStore && activeStore.name !== "Brew & Co.") {
          setChannelsList(["email"]);
          setChannel("email");
        } else {
          setChannelsList(["whatsapp", "sms", "email"]);
          setChannel("whatsapp");
        }
      })
      .catch(err => console.error("Failed to load stores for channel validation:", err));
  }, [open]);

  if (!open) return null;

  const selectedSegment = segments.find((segment) => segment.id === segmentId);

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await api.draftMessages({ segmentId, goal, channel });
      setVariants(result.variants);
      setPreviewCustomers(result.previewCustomers);
      setUsedAi(result.usedAi);
      setMessage(result.variants[0] ?? "");
      setStep(4);
      if (!name) {
        const dateStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const segmentName = selectedSegment ? selectedSegment.name : "Campaign";
        setName(`${segmentName} - ${dateStr}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate messages.");
    } finally {
      setLoading(false);
    }
  };

  const launch = async () => {
    setError(null);
    setLoading(true);
    try {
      const campaign = await api.createCampaign({ name, segmentId, channel, message });
      await api.launchCampaign(campaign.id);
      await onLaunched();
      onClose();
      setStep(1);
      setSegmentId("");
      setChannel("whatsapp");
      setGoal("");
      setVariants([]);
      setPreviewCustomers([]);
      setMessage("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to launch campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[20px] bg-[#1a0d08]/95 backdrop-blur-xl border border-white/12 shadow-[0_20px_60px_rgba(8,4,2,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#fff0df]">New campaign</h2>
            <p className="text-sm text-[#ffd1ae]/78">Build, draft, and launch with AI assistance.</p>
          </div>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-white/10 px-5 py-3">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className={cn("h-1.5 rounded-full", item <= step ? "bg-amber-500" : "bg-white/15")} />
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {step === 1 ? (
            <div>
              <p className="text-sm font-semibold text-[#fff0df]">Step 1: Pick segment</p>
              <Select className="mt-3" value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>
                <option value="">Choose a saved segment</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name} ({segment.customerCount ?? 0})
                  </option>
                ))}
              </Select>
              {selectedSegment ? <p className="mt-2 text-sm text-[#ffd1ae]/78">{selectedSegment.description}</p> : null}
              <div className="mt-5 flex justify-end">
                <Button disabled={!segmentId} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-sm font-semibold text-[#fff0df]">Step 2: Pick channel</p>
              <div className={cn("mt-4 grid gap-3", channelsList.length === 1 ? "grid-cols-1" : "sm:grid-cols-3")}>
                {channelsList.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setChannel(item)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      channel === item ? "border-amber-500/50 bg-amber-500/15 text-[#fff0df]" : "border-white/15 bg-white/6 hover:bg-white/10"
                    )}
                  >
                    <p className="font-semibold capitalize">{item}</p>
                    <p className={cn("mt-1 text-sm", channel === item ? "text-amber-200/70" : "text-[#ffd1ae]/78")}>
                      {item === "sms" ? "160 chars, plain text, high open rate" : item === "email" ? "Subject + body, richer copy" : "Rich, warm & conversational"}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="text-sm font-semibold text-[#fff0df]">Step 3: Campaign goal</p>
              <p className="mt-1 text-xs text-[#ffd1ae]/60">Describe your goal casually. AI will fix spelling, improve sentence formation, and write variants using each customer&apos;s tier and purchase history.</p>
              <Textarea
                className="mt-3"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="comr back there are offers for high value customers"
              />
              <div className="mt-5 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button disabled={!goal.trim() || loading} onClick={generate}>
                  {loading ? "Generating..." : "Generate Messages"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p className="text-sm font-semibold text-[#fff0df]">Step 4: Choose message and launch</p>

              {/* Warn when Gemini did not produce valid variants quickly enough */}
              {!usedAi && (
                <div className="mt-2 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  ⚠️ <strong>Using fast fallback drafts</strong> — Gemini did not return valid variants quickly for this request, or the backend was started without <code className="font-mono text-amber-200">GEMINI_API_KEY</code>.
                  The fallback still uses your offer, customer tier, and purchase history.
                </div>
              )}

              <div className="mt-3 grid gap-3">
                {variants.map((variant, i) => {
                  const previewCustomer =
                    previewCustomers[i % Math.max(previewCustomers.length, 1)] ?? {
                      name: "Customer",
                      city: "your city",
                      tier: "loyal",
                      totalSpend: 0,
                      totalOrders: 0,
                      favoriteItem: "coffee",
                      lastItem: "coffee",
                      lastOrderDaysAgo: null
                    };
                  return (
                <Card
                  key={variant}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMessage(variant)}
                  className={cn("cursor-pointer p-4 transition", message === variant ? "border-amber-500/40 ring-2 ring-amber-500/20" : "hover:bg-white/6")}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", message === variant ? "border-amber-500 bg-amber-500 text-white" : "border-white/25")}>
                      {message === variant ? <Check className="h-3 w-3" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Personalised preview for this sample customer */}
                      <p className="text-xs font-medium text-[#ffd1ae]/50 mb-1">
                        Preview for: <span className="text-amber-400">{previewCustomer.name}</span> · {previewCustomer.city} · {previewCustomer.tier} · {previewCustomer.favoriteItem}
                      </p>
                      <p className="text-sm leading-6 text-[#ffd9ba]">{previewMessage(variant, previewCustomer)}</p>
                      {/* Show the raw template so it's clear {{name}} is a variable */}
                      <p className="mt-1.5 text-[11px] text-[#ffd1ae]/40 font-mono">{variant.length > 80 ? variant.slice(0, 80) + "…" : variant}</p>
                      <p className="mt-1 text-[11px] text-[#ffd1ae]/40">Each customer receives a stored final message with their own name, city, tier, and purchase history.</p>
                    </div>
                  </div>
                </Card>
                  );
                })}
              </div>
              <Input className="mt-4" value={name} onChange={(event: any) => setName(event.target.value)} placeholder="Campaign name" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="blue">{channel}</Badge>
                {selectedSegment ? <Badge tone="amber">{selectedSegment.name}</Badge> : null}
              </div>
              <div className="mt-5 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button disabled={!name.trim() || !message || loading} onClick={launch}>
                  {loading ? "Launching..." : "Launch"}
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
