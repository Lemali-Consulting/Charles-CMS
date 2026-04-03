"use client";

import { useState } from "react";

interface MonthlyStat {
  month: string;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

function formatMonthLong(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ShareStat({ stat }: { stat: MonthlyStat | null }) {
  const [copied, setCopied] = useState(false);

  if (!stat) return null;

  const text = `This month I made ${stat.total} introduction${stat.total !== 1 ? "s" : ""} — ${stat.investor} to investors, ${stat.talent} to talent, ${stat.customer} to customers. #networking #introductions`;

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-2">Share Your Stats</h2>
      <p className="text-sm text-gray-500 mb-3">
        {formatMonthLong(stat.month)} — copy and paste to social media
      </p>
      <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-800 mb-3 leading-relaxed">
        {text}
      </div>
      <button
        onClick={handleCopy}
        className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
