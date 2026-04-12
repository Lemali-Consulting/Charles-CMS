"use client";

import { useEffect, useState } from "react";
import MonthlySummary from "@/components/MonthlySummary";

interface MonthlyStat {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

interface StatsResponse {
  monthly: MonthlyStat[];
  current: { total: number; by_category: Record<string, number> };
  by_category: Record<string, MonthlyStat[]>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleCt, setPeopleCt] = useState(0);
  const [orgsCt, setOrgsCt] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/people").then(r => r.json()),
      fetch("/api/organizations").then(r => r.json()),
    ]).then(([s, p, o]) => {
      setStats(s);
      setPeopleCt(p.length);
      setOrgsCt(o.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  const current = stats?.current;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-600">Your introduction activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="People" value={peopleCt} colorHex="#3b82f6" />
        <StatCard label="Organizations" value={orgsCt} colorHex="#8b5cf6" />
        <StatCard label="This Month" value={current?.total ?? 0} colorHex="#111827" />
        <StatCard label="Investor Intros" value={current?.by_category["Investor"] ?? 0} colorHex="#10b981" />
        <StatCard label="Customer Intros" value={current?.by_category["Customer"] ?? 0} colorHex="#f59e0b" />
        <StatCard label="Talent Intros" value={current?.by_category["Talent"] ?? 0} colorHex="#ec4899" />
      </div>

      <MonthlySummary data={stats?.monthly ?? []} typeNames={[]} />
    </div>
  );
}

function StatCard({ label, value, colorHex }: {
  label: string;
  value: number;
  colorHex: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: colorHex }}
        />
        <span className="text-3xl font-bold">{value}</span>
      </div>
    </div>
  );
}
