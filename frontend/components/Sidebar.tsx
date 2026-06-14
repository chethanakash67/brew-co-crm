"use client";

import { Activity, BarChart3, Bot, Database, Megaphone, Send, Users, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { api, type Store } from "@/lib/api";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/segments", label: "Segments", icon: Bot },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone }
];

const crmStatusItems = [
  { label: "API", icon: Activity },
  { label: "Data", icon: Database },
  { label: "AI", icon: Bot },
  { label: "Send", icon: Send }
];

export function Sidebar() {
  const pathname = usePathname();
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newStoreName, setNewStoreName] = useState("");
  const [showNewStoreInput, setShowNewStoreInput] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [creatingStore, setCreatingStore] = useState(false);

  useEffect(() => {
    api.getStores()
      .then((data) => {
        setStores(data);
        const savedId = localStorage.getItem("activeStoreId");
        const exists = data.some(s => s.id === savedId);
        if (savedId && exists) {
          setActiveStoreId(savedId);
        } else if (data.length > 0) {
          setActiveStoreId(data[0].id);
          localStorage.setItem("activeStoreId", data[0].id);
        }
      })
      .catch(err => console.error("Failed to load stores:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleStoreChange = (id: string) => {
    setActiveStoreId(id);
    localStorage.setItem("activeStoreId", id);
    window.location.reload();
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    setCreatingStore(true);
    setStoreError(null);
    try {
      const newStore = await api.createStore(newStoreName.trim());
      setStores((prev) => [...prev, newStore]);
      setNewStoreName("");
      setShowNewStoreInput(false);
      handleStoreChange(newStore.id);
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : "Failed to create store.");
    } finally {
      setCreatingStore(false);
    }
  };

  const activeStoreName = stores.find(s => s.id === activeStoreId)?.name ?? "Brew & Co.";
  const activeInitial = activeStoreName.slice(0, 1).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-white/5 backdrop-blur-xl border-r border-white/10 px-4 py-5 md:flex">
      <div className="flex flex-col gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="sparkle-outline grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-amber-700/80 to-amber-600/80 text-sm font-semibold text-white">
            {activeInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#fff0df] truncate">{activeStoreName}</p>
            <p className="text-xs text-[#ffd1ae]/78">Active Store</p>
          </div>
        </div>

        <div className="flex gap-1.5 mt-1">
          <select
            value={activeStoreId}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="h-8 flex-1 rounded-[8px] border border-white/15 bg-white/8 px-2 text-xs text-[#fff0df] outline-none backdrop-blur-sm transition focus:border-amber-500/40"
          >
            {loading ? (
              <option>Loading...</option>
            ) : (
              stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#1a0d08] text-[#fff0df]">
                  {s.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => { setShowNewStoreInput((v) => !v); setStoreError(null); }}
            title="Create New Store"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/15 bg-white/8 text-[#ffd9ba] hover:bg-white/14 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {showNewStoreInput && (
          <div className="mt-2 space-y-1.5">
            <input
              autoFocus
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateStore(); if (e.key === "Escape") { setShowNewStoreInput(false); setNewStoreName(""); } }}
              placeholder="New store name…"
              className="h-8 w-full rounded-[8px] border border-white/15 bg-white/8 px-2 text-xs text-[#fff0df] outline-none backdrop-blur-sm placeholder:text-[#ffd1ae]/40 focus:border-amber-500/40"
            />
            {storeError && <p className="text-[11px] text-red-400">{storeError}</p>}
            <div className="flex gap-1">
              <button
                onClick={handleCreateStore}
                disabled={creatingStore || !newStoreName.trim()}
                className="flex-1 rounded-[8px] border border-amber-500/30 bg-amber-600/20 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-600/30 transition disabled:opacity-50"
              >
                {creatingStore ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowNewStoreInput(false); setNewStoreName(""); setStoreError(null); }}
                className="rounded-[8px] border border-white/15 bg-white/8 px-2 py-1 text-[11px] text-[#ffd1ae]/60 hover:bg-white/14 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active ? "bg-white/12 text-[#fff0df]" : "text-[#ffd1ae] hover:bg-white/8 hover:text-[#fff0df]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto mb-3 grid grid-cols-2 gap-2 px-2">
        {crmStatusItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-white/12 bg-white/6 p-3">
              <div className="flex items-center gap-2 text-[#ffd9ba]">
                <Icon className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-[#ffd1ae]/60">Online</p>
            </div>
          );
        })}
      </div>

      <div className="mx-0 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">CRM Native</p>
        <p className="mt-1 text-sm text-amber-300/80">Turn natural language segments into launched campaigns.</p>
      </div>
    </aside>
  );
}
