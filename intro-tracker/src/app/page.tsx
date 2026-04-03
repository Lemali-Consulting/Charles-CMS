"use client";

import { useEffect, useState } from "react";
import MonthlySummary from "@/components/MonthlySummary";
import ShareStat from "@/components/ShareStat";

interface MonthlyStat {
  month: string;
  founder: number;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

interface TagBreakdown {
  label: string;
  count: number;
  percentage: number;
}

interface StatsResponse {
  monthly: MonthlyStat[];
  currentMonth: MonthlyStat | null;
  tagBreakdown: {
    industries: TagBreakdown[];
    universities: TagBreakdown[];
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/introductions/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const current = stats?.currentMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-500">Your introduction activity at a glance.</p>
      </div>

      {/* Current month stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="This Month" value={current?.total ?? 0} color="bg-gray-900" />
        <StatCard label="Founders" value={current?.founder ?? 0} color="bg-purple-600" />
        <StatCard label="Investors" value={current?.investor ?? 0} color="bg-blue-600" />
        <StatCard label="Talent" value={current?.talent ?? 0} color="bg-emerald-600" />
        <StatCard label="Customers" value={current?.customer ?? 0} color="bg-amber-500" />
      </div>

      {/* Monthly bar chart */}
      <MonthlySummary data={stats?.monthly ?? []} />

      {/* Tag breakdowns */}
      {stats?.tagBreakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BreakdownCard title="By Industry" items={stats.tagBreakdown.industries} />
          <BreakdownCard title="By University" items={stats.tagBreakdown.universities} />
        </div>
      )}

      {/* Share stat */}
      <ShareStat stat={current ?? null} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-3xl font-bold">{value}</span>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: TagBreakdown[];
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="text-gray-500">
              {item.count} ({item.percentage}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
