"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

export function AddCustomerModal({
  open,
  onClose,
  onAdded
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Chennai");
  const [tier, setTier] = useState("bronze");
  const [totalSpend, setTotalSpend] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = phone.trim().startsWith("+") ? phone.trim() : `+91${phone.trim().replace(/[^\d]/g, "")}`;
      await api.createCustomer({
        name,
        email,
        phone: formattedPhone,
        city,
        tier,
        totalSpend: Number(totalSpend || 0)
      });
      onAdded();
      onClose();
      setName("");
      setEmail("");
      setPhone("");
      setCity("Chennai");
      setTier("bronze");
      setTotalSpend("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[20px] bg-[#1a0d08]/95 backdrop-blur-xl border border-white/12 shadow-[0_20px_60px_rgba(8,4,2,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#fff0df]">Add Manual Customer</h2>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[#ffd1ae]/78">Full Name</label>
            <Input className="mt-1" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#ffd1ae]/78">Email address</label>
            <Input className="mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#ffd1ae]/78">Phone (with country code)</label>
            <Input className="mt-1" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#ffd1ae]/78">City</label>
              <Select className="mt-1" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="Chennai">Chennai</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi</option>
                <option value="Hyderabad">Hyderabad</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#ffd1ae]/78">Tier</label>
              <Select className="mt-1" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#ffd1ae]/78">Total Spend (INR)</label>
            <Input className="mt-1" type="number" min="0" value={totalSpend} onChange={(e) => setTotalSpend(e.target.value)} placeholder="0" />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ImportCsvModal({
  open,
  onClose,
  onImported
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const parseAndImport = async () => {
    setError(null);
    setLoading(true);

    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        throw new Error("CSV must contain headers and at least one row of data.");
      }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
      const nameIndex = headers.indexOf("name");
      const emailIndex = headers.indexOf("email");
      const phoneIndex = headers.indexOf("phone");
      const cityIndex = headers.indexOf("city");
      const tierIndex = headers.indexOf("tier");
      const spendIndex = headers.indexOf("totalspend");

      if (nameIndex === -1 || emailIndex === -1 || phoneIndex === -1 || cityIndex === -1) {
        throw new Error("CSV must contain 'name', 'email', 'phone', and 'city' headers.");
      }

      const customersList = lines.slice(1).map((line, idx) => {
        const values = line.split(",").map(v => v.trim());
        if (values.length < 4) return null;

        const name = values[nameIndex];
        const email = values[emailIndex];
        const phone = values[phoneIndex];
        const city = values[cityIndex];
        const tier = tierIndex !== -1 ? values[tierIndex] : "bronze";
        const totalSpend = spendIndex !== -1 ? Number(values[spendIndex] || 0) : 0;

        const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/[^\d]/g, "")}`;

        return { name, email, phone: formattedPhone, city, tier, totalSpend };
      }).filter(c => c !== null) as any[];

      if (customersList.length === 0) {
        throw new Error("No valid customer records parsed from the CSV.");
      }

      const res = await api.bulkCreateCustomers(customersList);
      setSuccess(`Imported ${res.count} new customers. (Skipped ${res.skipped} duplicate emails).`);
      onImported();
      setCsvText("");
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to parse CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[20px] bg-[#1a0d08]/95 backdrop-blur-xl border border-white/12 shadow-[0_20px_60px_rgba(8,4,2,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#fff0df]">Import Customers via CSV</h2>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs text-[#ffd1ae]/78 leading-relaxed">
            Paste your comma-separated list below. The first row must be headers.
            <br />
            Required headers: <code className="text-amber-300">name, email, phone, city</code>
            <br />
            Optional headers: <code className="text-amber-300">tier, totalspend</code>
          </div>

          <Textarea
            className="font-mono text-xs min-h-[160px]"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`name,email,phone,city,tier,totalspend
Chethan,chethan@gmail.com,+919999999999,Bangalore,gold,8000
Akash,akash@gmail.com,+918888888888,Chennai,silver,4500`}
          />

          {success ? (
            <p className="text-sm font-medium text-emerald-400">{success}</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={loading || !csvText.trim()} onClick={parseAndImport}>
              {loading ? "Importing..." : "Parse & Import"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
