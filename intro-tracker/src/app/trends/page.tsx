"use client";

import { useEffect, useState } from "react";
import TrendChart from "@/components/TrendChart";

interface MonthlyStat {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

const TABS = ["All", "Investor", "Customer", "Talent"] as const;

export default function TrendsPage() {
  const [monthlyAll, setMonthlyAll] = useState<MonthlyStat[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, MonthlyStat[]>>({});
  const [activeTab, setActiveTab] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((res) => {
        setMonthlyAll(res.monthly);
        setByCategory(res.by_category || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  const data = activeTab === "All" ? monthlyAll : (byCategory[activeTab] || []);
  const totalAll = data.reduce((sum, d) => sum + d.total, 0);
  const avgPerMonth = data.length > 0 ? Math.round(totalAll / data.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Trends</h1>
        <p className="text-gray-600">Track your introduction activity over time.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Total Introductions</p>
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

      <TrendChart data={data} label={activeTab === "All" ? "All Introductions" : `${activeTab} Introductions`} />
    </div>
  );
}
