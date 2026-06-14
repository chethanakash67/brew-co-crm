"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerTable } from "@/components/CustomerTable";
import type { Customer } from "@/lib/api";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AddCustomerModal, ImportCsvModal } from "@/components/CustomerIngestion";

const LIMIT = 25;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [tier, setTier] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
  }, [search, city, tier]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      api
        .getCustomers({ search, city, tier, page, limit: LIMIT })
        .then((data) => {
          setCustomers(data.customers);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to load customers."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, city, tier, page, refreshTrigger]);

  const cities = useMemo(() => ["all", "Chennai", "Mumbai", "Bangalore", "Delhi", "Hyderabad"], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fff0df]">Customers</h1>
          <p className="mt-1 text-sm text-[#ffd1ae]/78">Search, filter, and inspect Brew &amp; Co. customer behavior.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            Import CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            + Add Customer
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffd1ae]/50" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone" />
          </div>
          <Select value={city} onChange={(event) => setCity(event.target.value)}>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All cities" : item}
              </option>
            ))}
          </Select>
          <Select value={tier} onChange={(event) => setTier(event.target.value)}>
            <option value="all">All tiers</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </Select>
        </div>
      </Card>

      {error ? <Card className="border-red-400/30 bg-red-500/15 p-4 text-sm text-red-300">{error}</Card> : null}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-[12px] bg-white/6" />
          ))}
        </div>
      ) : (
        <CustomerTable customers={customers} />
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#ffd1ae]/78">
          <p>
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} customers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-9 w-9 px-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-[#fff0df]">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              className="h-9 w-9 px-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AddCustomerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={() => setRefreshTrigger((prev) => prev + 1)}
      />
      <ImportCsvModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
