"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageDraftModal } from "@/components/MessageDraftModal";
import type { Campaign, Segment } from "@/lib/api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDate, titleCase } from "@/lib/utils";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [campaignList, segmentList] = await Promise.all([api.getCampaigns(), api.getSegments()]);
      setCampaigns(campaignList);
      setSegments(segmentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaigns.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fff0df]">Campaigns</h1>
          <p className="mt-1 text-sm text-[#ffd1ae]/78">Create AI-drafted campaigns and track delivery outcomes.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {error ? <Card className="border-red-400/30 bg-red-500/15 p-4 text-sm text-red-300">{error}</Card> : null}

      <Card className="overflow-hidden">
        <CardHeader>
          <p className="text-sm font-semibold text-[#fff0df]">All campaigns</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#ffd1ae]/78">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Open Rate</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="bg-transparent transition hover:bg-white/6">
                  <td className="px-4 py-3 font-medium text-[#fff0df]">
                    <Link href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{campaign.segment.name}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{titleCase(campaign.channel)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={campaign.status === "launched" ? "green" : "zinc"}>{titleCase(campaign.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">{campaign.stats.sent}</td>
                  <td className="px-4 py-3">{campaign.stats.openRate}%</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{formatDate(campaign.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <MessageDraftModal open={modalOpen} onClose={() => setModalOpen(false)} segments={segments} onLaunched={load} />
    </div>
  );
}
