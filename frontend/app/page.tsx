"use client";

import { ArrowRight, Bot, Megaphone, TrendingUp, Users, Zap, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { DashboardData, CampaignRecommendation } from "@/lib/api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { titleCase } from "@/lib/utils";

function RecommendationCard({ rec, index }: { rec: CampaignRecommendation; index: number }) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelTone: Record<string, "green" | "blue" | "amber"> = {
    whatsapp: "green",
    sms: "blue",
    email: "amber"
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      const result = await api.quickLaunchCampaign({
        segmentQuery: rec.suggestedSegmentQuery,
        segmentName: rec.title,
        segmentDescription: rec.description,
        channel: rec.suggestedChannel,
        goal: rec.suggestedGoal
      });
      setLaunched(true);
      setTimeout(() => router.push(`/campaigns/${result.campaign.id}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card className="glass-card-hover relative flex h-full flex-col overflow-hidden">
        <span className="surface-shine" />
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-400">
                <Bot className="h-4 w-4" />
              </div>
              <Badge tone={channelTone[rec.suggestedChannel] ?? "zinc"}>
                {titleCase(rec.suggestedChannel)}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-[#fff0df]">{rec.title}</p>
            <p className="mt-1.5 text-xs leading-5 text-[#ffd9ba]/80">{rec.description}</p>
          </div>

          <div>
            {rec.estimatedAudience !== undefined && (
              <p className="mb-3 text-xs text-[#ffd1ae]/60">
                ~{rec.estimatedAudience} customers in this segment
              </p>
            )}

            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

            <Button
              className="w-full"
              onClick={handleLaunch}
              disabled={launching || launched}
            >
              {launched ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Launched! Redirecting…
                </>
              ) : launching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Launch Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard."));
  }, []);

  const kpis = [
    { label: "Total Customers", value: dashboard?.totalCustomers ?? 0, icon: Users },
    { label: "Active Segments", value: dashboard?.activeSegments ?? 0, icon: Bot },
    { label: "Campaigns This Month", value: dashboard?.campaignsThisMonth ?? 0, icon: Megaphone },
    { label: "Avg Open Rate", value: `${dashboard?.avgOpenRate ?? 0}%`, icon: TrendingUp }
  ];

  const recommendations = dashboard?.aiRecommendations ?? [];
  const isLoading = dashboard === null && error === null;

  return (
    <div className="space-y-6">
      <div className="section-shell-crisp relative overflow-hidden rounded-[16px] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_55%)] lg:block" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge tone="blue">AI Mini CRM</Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#fff0df] sm:text-3xl">CRM Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-[#ffd1ae]/78">
              Monitor customers, segments, and campaigns — or let AI recommend what to run next.
            </p>
          </div>
          <Link href="/campaigns" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              Create Campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {error ? <Card className="border-red-400/30 bg-red-500/15 p-4 text-sm text-red-300">{error}</Card> : null}

      {/* AI-native Recommendation Cards */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold text-[#fff0df]">AI Campaign Recommendations</p>
          <p className="text-xs text-[#ffd1ae]/60">— Click Launch Now to execute end-to-end</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {isLoading
            ? [0, 1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="space-y-3">
                    <div className="h-9 w-9 rounded-md bg-white/8" />
                    <div className="h-4 w-3/4 rounded bg-white/8" />
                    <div className="h-3 w-full rounded bg-white/8" />
                    <div className="h-3 w-2/3 rounded bg-white/8" />
                    <div className="mt-4 h-10 rounded-[12px] bg-white/8" />
                  </CardContent>
                </Card>
              ))
            : recommendations.map((rec, i) => (
                <RecommendationCard key={rec.title} rec={rec} index={i} />
              ))}
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="glass-card-hover">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#ffd1ae]/78">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#fff0df]">{kpi.value}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-500/12 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Recent Campaigns Table */}
      <Card className="relative overflow-hidden">
        <div className="surface-scan-line pointer-events-none absolute inset-0 z-10" />
        <CardHeader>
          <p className="text-sm font-semibold text-[#fff0df]">Recent campaigns</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#ffd1ae]/78">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {(dashboard?.recentCampaigns ?? []).map((campaign) => (
                <tr key={campaign.id} className="bg-transparent">
                  <td className="px-4 py-3 font-medium text-[#fff0df]">{campaign.name}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{campaign.segment.name}</td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{titleCase(campaign.channel)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={campaign.status === "launched" ? "green" : "zinc"}>{titleCase(campaign.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#ffd9ba]">{campaign.stats.sent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
