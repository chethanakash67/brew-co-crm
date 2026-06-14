"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { Customer, CustomerDetail } from "@/lib/api";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function tierTone(tier: string) {
  if (tier === "gold") return "amber";
  if (tier === "silver") return "blue";
  return "zinc";
}

function renderItems(items: unknown) {
  if (!Array.isArray(items)) return "Menu items";
  return items.map((item) => `${item.quantity ?? 1}x ${item.name ?? "Item"}`).join(", ");
}

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openCustomer = async (id: string) => {
    setLoadingId(id);
    try {
      setSelected(await api.getCustomer(id));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#ffd1ae]/78">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Total Spend</th>
                <th className="px-4 py-3">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => openCustomer(customer.id)}
                  className="cursor-pointer bg-transparent transition hover:bg-white/6"
                >
                  <td className="px-4 py-3 font-medium text-[#fff0df]">
                    {customer.name}
                    {loadingId === customer.id ? <span className="ml-2 text-xs text-[#ffd1ae]/50">Loading...</span> : null}
                  </td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{customer.email}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{customer.city}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tierTone(customer.tier)}>{titleCase(customer.tier)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{formatCurrency(customer.totalSpend)}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{formatDate(customer.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#1a0d08]/95 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(8,4,2,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#fff0df]">{selected.name}</h2>
                <p className="mt-1 text-sm text-[#ffd1ae]/78">{selected.email}</p>
              </div>
              <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => setSelected(null)} aria-label="Close drawer">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-white/12 bg-white/6 p-4">
                <p className="text-xs uppercase text-[#ffd1ae]/78">Lifetime value</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(selected.lifetimeValue)}</p>
              </div>
              <div className="rounded-[12px] border border-white/12 bg-white/6 p-4">
                <p className="text-xs uppercase text-[#ffd1ae]/78">Total orders</p>
                <p className="mt-2 text-xl font-semibold">{selected.totalOrders}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[12px] border border-white/12 bg-white/6 p-4">
              <p className="text-sm font-semibold text-[#fff0df]">Customer details</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[#ffd1ae]/78">Phone</dt>
                  <dd className="font-medium text-[#ffd9ba]">{selected.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#ffd1ae]/78">City</dt>
                  <dd className="font-medium text-[#ffd9ba]">{selected.city}</dd>
                </div>
                <div>
                  <dt className="text-[#ffd1ae]/78">Tier</dt>
                  <dd>
                    <Badge tone={tierTone(selected.tier)}>{titleCase(selected.tier)}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-[#ffd1ae]/78">Joined</dt>
                  <dd className="font-medium text-[#ffd9ba]">{formatDate(selected.createdAt)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-[#fff0df]">Order history</p>
              <div className="mt-3 overflow-hidden rounded-[12px] border border-white/12">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase text-[#ffd1ae]/78">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Items</th>
                      <th className="px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {selected.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-[#ffd9ba]">{formatDate(order.orderedAt)}</td>
                        <td className="px-3 py-2 text-[#ffd9ba]">{renderItems(order.items)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{formatCurrency(order.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
