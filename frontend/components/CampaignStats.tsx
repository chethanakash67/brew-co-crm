"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart as RechartsArea, Bar, BarChart, CartesianGrid,
  Cell, Legend, Pie, PieChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { CampaignStatsData } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChartType = "donut" | "bar" | "area" | "radial";

const chartOptions: { key: ChartType; label: string }[] = [
  { key: "donut", label: "Donut" },
  { key: "bar", label: "Stacked Bar" },
  { key: "area", label: "Area" },
  { key: "radial", label: "Radial" }
];

const funnelSteps = [
  { key: "sent", label: "Sent", hint: "Audience queued", suffix: "" },
  { key: "delivered", label: "Delivered", hint: "deliveryRate", suffix: "% of sent" },
  { key: "opened", label: "Opened", hint: "openRate", suffix: "% of delivered" },
  { key: "clicked", label: "Clicked", hint: "clickRate", suffix: "% of opened" }
] as const;

const COLORS: Record<string, string> = {
  delivered: "#059669",
  opened: "#2563eb",
  clicked: "#7c3aed",
  failed: "#dc2626"
};

const tooltipBg = {
  background: "rgba(26,13,8,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  backdropFilter: "blur(12px)",
  fontSize: "13px"
};

// ── Sub-components ─────────────────────────────────────────────

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function ChartLegend({ formatter }: { formatter: (v: string) => React.ReactNode }) {
  return (
    <Legend
      verticalAlign="bottom" height={28}
      iconType="circle" iconSize={8}
      formatter={(value: string) => formatter(value)}
    />
  );
}

// ── Chart variants ────────────────────────────────────────────

function DonutChart({ stats }: { stats: CampaignStatsData }) {
  const data = [
    { name: "Delivered", value: Math.max(stats.delivered, 0), color: COLORS.delivered },
    { name: "Opened", value: Math.max(stats.opened, 0), color: COLORS.opened },
    { name: "Clicked", value: Math.max(stats.clicked, 0), color: COLORS.clicked },
    { name: "Failed", value: Math.max(stats.failed, 0), color: COLORS.failed }
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="text-center text-sm text-[#ffd1ae]/50">No delivery data yet</p>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <text x="50%" y="48%" textAnchor="middle" fill="#fff0df" fontSize="22" fontWeight={700}>{total}</text>
        <text x="50%" y="58%" textAnchor="middle" fill="#ffd1ae" fontSize="11" opacity={0.7}>Events</text>
        <Tooltip contentStyle={tooltipBg}
          formatter={(value: number, name: string) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
        />
        <ChartLegend formatter={(v) => <span style={{ color: "rgba(255,209,174,0.78)", fontSize: "12px" }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function StackedBarChart({ timeline }: {
  timeline: Array<{ date: string; delivered?: number; failed?: number; opened?: number; clicked?: number }>;
}) {
  if (timeline.length === 0) {
    return <p className="text-center text-sm text-[#ffd1ae]/50">No timeline events yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={timeline} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,240,225,0.06)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,209,174,0.5)" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgba(255,209,174,0.5)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipBg} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend verticalAlign="top" height={24} iconType="rect" iconSize={10}
          formatter={(v: string) => <span style={{ color: "rgba(255,209,174,0.78)", fontSize: "12px" }}>{v}</span>}
        />
        <Bar dataKey="delivered" stackId="events" fill={COLORS.delivered} radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="opened" stackId="events" fill={COLORS.opened} radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="clicked" stackId="events" fill={COLORS.clicked} radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="failed" stackId="events" fill={COLORS.failed} radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CumulativeAreaChart({ timeline }: {
  timeline: Array<{ date: string; delivered?: number; failed?: number; opened?: number; clicked?: number }>;
}) {
  if (timeline.length === 0) {
    return <p className="text-center text-sm text-[#ffd1ae]/50">No timeline events yet</p>;
  }

  const cumulative: Array<Record<string, number | string>> = [];
  let prev = { delivered: 0, opened: 0, clicked: 0, failed: 0 };
  for (const day of timeline) {
    prev = {
      delivered: prev.delivered + (day.delivered ?? 0),
      opened: prev.opened + (day.opened ?? 0),
      clicked: prev.clicked + (day.clicked ?? 0),
      failed: prev.failed + (day.failed ?? 0)
    };
    cumulative.push({ date: day.date, ...prev });
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsArea data={cumulative} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,240,225,0.06)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,209,174,0.5)" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgba(255,209,174,0.5)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipBg} />
        <Legend verticalAlign="top" height={24} iconType="line" iconSize={12}
          formatter={(v: string) => <span style={{ color: "rgba(255,209,174,0.78)", fontSize: "12px" }}>{v}</span>}
        />
        <Area type="monotone" dataKey="delivered" stroke={COLORS.delivered} fill={COLORS.delivered} fillOpacity={0.15} strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="opened" stroke={COLORS.opened} fill={COLORS.opened} fillOpacity={0.15} strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="clicked" stroke={COLORS.clicked} fill={COLORS.clicked} fillOpacity={0.15} strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="failed" stroke={COLORS.failed} fill={COLORS.failed} fillOpacity={0.15} strokeWidth={2} dot={false} />
      </RechartsArea>
    </ResponsiveContainer>
  );
}

function RadialRateChart({ stats }: { stats: CampaignStatsData }) {
  const items = [
    { name: "Delivered", value: stats.deliveryRate ?? 0, fill: COLORS.delivered },
    { name: "Opened", value: stats.openRate ?? 0, fill: COLORS.opened },
    { name: "Clicked", value: stats.clickRate ?? 0, fill: COLORS.clicked }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart innerRadius="20%" outerRadius="90%" data={items} startAngle={180} endAngle={0} barSize={20}>
        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "rgba(255,255,255,0.06)" }}>
          {items.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </RadialBar>
        <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8}
          formatter={(v: string) => <span style={{ color: "rgba(255,209,174,0.78)", fontSize: "12px" }}>{v}</span>}
        />
        <Tooltip contentStyle={tooltipBg} formatter={(value: number) => [`${Math.round(value)}%`, ""]} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

// ── Chart switcher tabs ───────────────────────────────────────

function ChartTabs({ active, onChange }: { active: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/10 bg-white/6 p-0.5">
      {chartOptions.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            active === opt.key
              ? "bg-amber-500/20 text-amber-300 shadow-sm"
              : "text-[#ffd1ae]/50 hover:text-[#ffd1ae]/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function CampaignStats({
  stats,
  timeline
}: {
  stats: CampaignStatsData;
  timeline: Array<{ date: string; delivered?: number; failed?: number; opened?: number; clicked?: number }>;
}) {
  const [chartType, setChartType] = useState<ChartType>("donut");

  if (!stats) return null;

  const hasEvents = (stats.sent ?? 0) > 0 || (stats.delivered ?? 0) > 0 || (stats.opened ?? 0) > 0 || (stats.clicked ?? 0) > 0;

  function rateColor(key: string) {
    if (key === "delivered") return COLORS.delivered;
    if (key === "opened") return COLORS.opened;
    if (key === "clicked") return COLORS.clicked;
    return "#a3a3a3";
  }

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {funnelSteps.map((item) => {
          const count = (stats[item.key as keyof CampaignStatsData] as number) ?? 0;
          const rateValue = item.key !== "sent" ? ((stats[item.hint as keyof CampaignStatsData] as number) ?? 0) : null;

          return (
            <motion.div
              key={item.key}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            >
              <Card className="h-full">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-[#ffd1ae]/60">{item.label}</p>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rateColor(item.key) }} />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#fff0df]">{count}</p>
                  {rateValue !== null ? (
                    <div>
                      <div className="mt-0.5 flex items-center justify-between text-xs">
                        <span className="text-[#ffd1ae]/50">{item.suffix}</span>
                        <span className="font-medium text-[#ffd1ae]/80">{rateValue}%</span>
                      </div>
                      <RateBar value={rateValue} color={rateColor(item.key)} />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#ffd1ae]/50">{item.hint}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#fff0df]">Campaign visualisation</p>
              <p className="text-xs text-[#ffd1ae]/60">Switch between chart types to explore your data.</p>
            </div>
            <ChartTabs active={chartType} onChange={setChartType} />
          </div>
          <div className="h-80">
            {chartType === "donut" ? (
              <DonutChart stats={stats} />
            ) : chartType === "bar" ? (
              <StackedBarChart timeline={timeline} />
            ) : chartType === "area" ? (
              <CumulativeAreaChart timeline={timeline} />
            ) : (
              <RadialRateChart stats={stats} />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
