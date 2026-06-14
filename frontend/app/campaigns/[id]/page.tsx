"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AIInsightCard } from "@/components/AIInsightCard";
import { CampaignStats } from "@/components/CampaignStats";
import type { CampaignDetail } from "@/lib/api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, titleCase } from "@/lib/utils";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    try {
      setCampaign(await api.getCampaign(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaign.");
    }
  }, [params.id]);

  useEffect(() => {
    loadCampaign();
    setLoadingInsight(true);
    api
      .getCampaignInsights(params.id)
      .then((result) => setInsight(result.insight))
      .catch((err) => setInsight(err instanceof Error ? err.message : "Unable to generate insight."))
      .finally(() => setLoadingInsight(false));
  }, [loadCampaign, params.id]);

  useEffect(() => {
    if (campaign?.status !== "launched") return;
    const timer = window.setInterval(loadCampaign, 5000);
    return () => window.clearInterval(timer);
  }, [campaign?.status, loadCampaign, params.id]);

  if (error) return <Card className="border-red-400/30 bg-red-500/15 p-4 text-sm text-red-300">{error}</Card>;
  if (!campaign) return <p className="text-sm text-[#ffd1ae]/60">Loading campaign...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#fff0df]">{campaign.name}</h1>
            <Badge tone={campaign.status === "launched" ? "green" : "zinc"}>{titleCase(campaign.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#ffd1ae]/78">
            {campaign.segment.name} • {titleCase(campaign.channel)} • Created {formatDate(campaign.createdAt)}
          </p>
        </div>
        <Button variant="secondary" onClick={loadCampaign}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <CampaignStats stats={campaign.stats} timeline={campaign.timeline} />
      <AIInsightCard insight={insight} loading={loadingInsight} />

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-sm font-semibold text-[#fff0df]">Recent communications</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#ffd1ae]/78">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Message sent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Sent</th>
                <th className="px-4 py-3">Latest Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {campaign.communications.map((communication) => (
                <tr key={communication.id} className="bg-transparent">
                  <td className="px-4 py-3 font-medium text-[#fff0df]">{communication.customer.name}</td>
                  <td className="max-w-[360px] px-4 py-3 text-[#ffd9ba]">
                    <p className="line-clamp-3 whitespace-normal break-words text-xs leading-5">{communication.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={communication.status === "failed" ? "red" : communication.status === "queued" ? "amber" : "green"}>
                      {titleCase(communication.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{formatDate(communication.sentAt)}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">
                    {communication.receipts.length
                      ? communication.receipts.map((receipt) => titleCase(receipt.eventType)).join(", ")
                      : "No receipts yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
