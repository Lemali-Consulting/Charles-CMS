"use client";

import { useEffect, useState } from "react";
import TrendChart from "@/components/TrendChart";

interface NamedEntity { id: number; name: string }
interface MonthlyStat {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

export default function TrendsPage() {
  const [data, setData] = useState<MonthlyStat[]>([]);
  const [typeNames, setTypeNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((res) => {
        setData(res.monthly);
        setTypeNames(res.types.map((t: NamedEntity) => t.name));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  const totalAll = data.reduce((sum, d) => sum + d.total, 0);
  const avgPerMonth = data.length > 0 ? Math.round(totalAll / data.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Trends</h1>
        <p className="text-gray-600">Track your interaction activity over time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Total Interactions</p>
          <span className="text-3xl font-bold">{totalAll}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Avg / Month</p>
          <span className="text-3xl font-bold">{avgPerMonth}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Months Tracked</p>
          <span className="text-3xl font-bold">{data.length}</span>
        </div>
      </div>

      <TrendChart data={data} typeNames={typeNames} />
    </div>
  );
}
