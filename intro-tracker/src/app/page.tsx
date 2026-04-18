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

interface Introduction {
  id: number;
  date: string;
  notes: string;
  medium_name: string | null;
  people: { id: number; first_name: string; last_name: string }[];
}

interface DrillFilter {
  category?: string;
  month: string;
  label: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleCt, setPeopleCt] = useState(0);
  const [orgsCt, setOrgsCt] = useState(0);
  const [drill, setDrill] = useState<DrillFilter | null>(null);

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
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-600">Your introduction activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="People" value={peopleCt} colorHex="#3b82f6" />
        <StatCard label="Organizations" value={orgsCt} colorHex="#8b5cf6" />
        <StatCard
          label="This Month"
          value={current?.total ?? 0}
          colorHex="#111827"
          onClick={() => setDrill({ month: currentMonth, label: "Introductions this month" })}
        />
        <StatCard
          label="Investor Intros"
          value={current?.by_category["Investor"] ?? 0}
          colorHex="#10b981"
          onClick={() => setDrill({ category: "Investor", month: currentMonth, label: "Investor intros this month" })}
        />
        <StatCard
          label="Customer Intros"
          value={current?.by_category["Customer"] ?? 0}
          colorHex="#f59e0b"
          onClick={() => setDrill({ category: "Customer", month: currentMonth, label: "Customer intros this month" })}
        />
        <StatCard
          label="Talent Intros"
          value={current?.by_category["Talent"] ?? 0}
          colorHex="#ec4899"
          onClick={() => setDrill({ category: "Talent", month: currentMonth, label: "Talent intros this month" })}
        />
      </div>

      <MonthlySummary data={stats?.monthly ?? []} typeNames={[]} />

      {drill && <IntroDrilldownModal filter={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function StatCard({ label, value, colorHex, onClick }: {
  label: string;
  value: number;
  colorHex: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`bg-white rounded-lg border border-gray-200 p-5 text-left ${
        clickable ? "hover:border-gray-400 hover:shadow-sm cursor-pointer" : "cursor-default"
      }`}
    >
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: colorHex }}
        />
        <span className="text-3xl font-bold">{value}</span>
      </div>
    </button>
  );
}

function IntroDrilldownModal({ filter, onClose }: { filter: DrillFilter; onClose: () => void }) {
  const [intros, setIntros] = useState<Introduction[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ month: filter.month });
    if (filter.category) params.set("category", filter.category);
    fetch(`/api/interactions?${params}`)
      .then(r => r.json())
      .then(setIntros)
      .catch(() => setIntros([]));
  }, [filter.category, filter.month]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{filter.label}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto p-4">
          {intros === null ? (
            <div className="text-gray-500">Loading...</div>
          ) : intros.length === 0 ? (
            <div className="text-gray-500">No introductions found.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {intros.map((intro) => (
                <li key={intro.id} className="py-3">
                  <a
                    href={`/interactions?id=${intro.id}`}
                    className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium text-sm truncate">
                        {intro.people.map(p => `${p.first_name} ${p.last_name}`).join(" → ")}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{intro.date}</div>
                    </div>
                    {intro.notes && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{intro.notes}</div>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
          {intros && `${intros.length} ${intros.length === 1 ? "introduction" : "introductions"}`}
        </div>
      </div>
    </div>
  );
}
