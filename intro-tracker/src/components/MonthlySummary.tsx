"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyStat {
  month: string;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function MonthlySummary({ data }: { data: MonthlyStat[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No introductions logged yet. Start by logging your first one!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Monthly Introductions</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="investor" fill="#3b82f6" name="Investors" radius={[2, 2, 0, 0]} />
          <Bar dataKey="talent" fill="#10b981" name="Talent" radius={[2, 2, 0, 0]} />
          <Bar dataKey="customer" fill="#f59e0b" name="Customers" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
