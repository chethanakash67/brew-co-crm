"use client";

import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { FormEvent, useState } from "react";
import type { SegmentPreview } from "@/lib/api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";

export function SegmentChat({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.previewSegment(prompt);
      setPreview(result);
      setPage(1);
      setName(prompt.length > 54 ? `${prompt.slice(0, 54)}...` : prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview segment.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    setError(null);
    setSaving(true);
    try {
      await api.createSegment({ name, description: prompt, sqlQuery: preview.sql });
      setPreview(null);
      setPrompt("");
      setName("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save segment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent>
        <span className="surface-shine" />
        <div className="surface-scan-line pointer-events-none absolute inset-0" />
        <form onSubmit={submit}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#fff0df]">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Natural language segment builder
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-4 min-h-[124px]"
            placeholder="e.g. Gold customers in Chennai who haven't ordered in 30 days"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!prompt.trim() || loading}>
              {loading ? "Previewing..." : "Preview Segment"}
            </Button>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </form>

        {preview ? (() => {
          const totalPages = Math.ceil(preview.customers.length / 10);
          const displayedCustomers = preview.customers.slice((page - 1) * 10, page * 10);
          return (
            <div className="mt-6 rounded-[12px] border border-white/12 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#fff0df]">{preview.count} customers matched</p>
                  <p className="mt-1 text-xs text-[#ffd1ae]/78">Showing first {preview.customers.length} customers from the generated SQL.</p>
                </div>
                <div className="flex gap-2">
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Segment name" />
                  <Button type="button" onClick={save} disabled={!name.trim() || saving}>
                    {saving ? "Saving..." : "Save as Segment"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[12px] border border-white/12 bg-transparent">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase text-[#ffd1ae]/78">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">City</th>
                      <th className="px-3 py-2">Tier</th>
                      <th className="px-3 py-2">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {displayedCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-3 py-2 font-medium">{customer.name}</td>
                        <td className="px-3 py-2">{customer.city}</td>
                        <td className="px-3 py-2">{customer.tier}</td>
                        <td className="px-3 py-2">{formatCurrency(customer.totalSpend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-[#ffd1ae]/60">
                    Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, preview.customers.length)} of {preview.customers.length} previewed
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-[#fff0df]">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })() : null}
      </CardContent>
    </Card>
  );
}
