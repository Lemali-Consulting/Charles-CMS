"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyStat {
  month: string;
  founder: number;
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

export default function TrendChart({ data }: { data: MonthlyStat[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        Not enough data to show trends yet. Keep logging introductions!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Introduction Trends</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#111827"
            strokeWidth={2}
            name="Total"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="founder"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            name="Founders"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="investor"
            stroke="#3b82f6"
            strokeWidth={1.5}
            name="Investors"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="talent"
            stroke="#10b981"
            strokeWidth={1.5}
            name="Talent"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="customer"
            stroke="#f59e0b"
            strokeWidth={1.5}
            name="Customers"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
