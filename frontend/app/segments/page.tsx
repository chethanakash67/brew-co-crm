"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SegmentChat } from "@/components/SegmentChat";
import type { Segment } from "@/lib/api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setSegments(await api.getSegments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load segments.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#fff0df]">Segments</h1>
        <p className="mt-1 text-sm text-[#ffd1ae]/78">Ask for an audience in plain English, preview it, then save it.</p>
      </div>

      <SegmentChat onSaved={load} />
      {error ? <Card className="border-red-400/30 bg-red-500/15 p-4 text-sm text-red-300">{error}</Card> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {segments.map((segment, index) => (
          <motion.div key={segment.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08, duration: 0.35 }}>
            <Card className="relative overflow-hidden">
              <CardContent>
                <span className="surface-shine" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#fff0df]">{segment.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#ffd9ba]">{segment.description}</p>
                  </div>
                  <Badge tone="blue">{segment.customerCount ?? 0}</Badge>
                </div>
                <p className="mt-4 text-xs text-[#ffd1ae]/78">Created {formatDate(segment.createdAt)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
