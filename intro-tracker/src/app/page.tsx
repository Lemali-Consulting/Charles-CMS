"use client";

import { useEffect, useState } from "react";
import MonthlySummary from "@/components/MonthlySummary";
import ShareStat from "@/components/ShareStat";

interface MonthlyStat {
  month: string;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

interface StatsResponse {
  monthly: MonthlyStat[];
  currentMonth: MonthlyStat | null;
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="This Month" value={current?.total ?? 0} color="bg-gray-900" />
        <StatCard label="Investors" value={current?.investor ?? 0} color="bg-blue-600" />
        <StatCard label="Talent" value={current?.talent ?? 0} color="bg-emerald-600" />
        <StatCard label="Customers" value={current?.customer ?? 0} color="bg-amber-500" />
      </div>

      {/* Monthly bar chart */}
      <MonthlySummary data={stats?.monthly ?? []} />

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
