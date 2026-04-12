"use client";

import { useEffect, useState } from "react";
import MonthlySummary from "@/components/MonthlySummary";

interface NamedEntity { id: number; name: string }
interface MonthlyStat {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

interface StatsResponse {
  monthly: MonthlyStat[];
  current: { total: number; by_type: Record<string, number> };
  types: NamedEntity[];
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
  const typeNames = stats?.types.map(t => t.name) ?? [];

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-600">Your CRM activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="People" value={peopleCt} color="bg-blue-600" />
        <StatCard label="Organizations" value={orgsCt} color="bg-purple-600" />
        <StatCard label="This Month" value={current?.total ?? 0} color="bg-gray-900" />
        {typeNames.slice(0, 5).map((name, i) => (
          <StatCard
            key={name}
            label={name}
            value={current?.by_type[name] ?? 0}
            color={`bg-[${COLORS[i % COLORS.length]}]`}
            colorHex={COLORS[i % COLORS.length]}
          />
        ))}
      </div>

      <MonthlySummary data={stats?.monthly ?? []} typeNames={typeNames} />
    </div>
  );
}

function StatCard({ label, value, color, colorHex }: {
  label: string;
  value: number;
  color: string;
  colorHex?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${colorHex ? "" : color}`}
          style={colorHex ? { backgroundColor: colorHex } : undefined}
        />
        <span className="text-3xl font-bold">{value}</span>
      </div>
    </div>
  );
}
