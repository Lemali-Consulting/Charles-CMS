"use client";

import { useEffect, useState } from "react";

interface Person { id: number; first_name: string; last_name: string }
interface Introduction {
  id: number;
  date: string;
  interaction_type_name: string;
  medium_name: string | null;
  notes: string;
  people: Person[];
  organizations: { id: number; name: string }[];
}

export default function ExportPage() {
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interactions")
      .then((res) => res.json())
      .then((data) => {
        setIntroductions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  function downloadCsv() {
    const headers = ["Date", "Medium", "People", "Notes"];
    const rows = introductions.map((i) => [
      i.date,
      i.medium_name || "",
      i.people.map(p => `${p.first_name} ${p.last_name}`).join("; "),
      i.notes.replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `introductions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Export</h1>
        <p className="text-gray-600">Export your introductions data as CSV.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">All Introductions</h2>
            <p className="text-sm text-gray-600">
              {introductions.length} introduction{introductions.length !== 1 ? "s" : ""} will be included
            </p>
          </div>
          <button
            onClick={downloadCsv}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Download CSV
          </button>
        </div>

        {introductions.length === 0 ? (
          <p className="text-sm text-gray-600 py-4">
            No introductions logged yet. Go to Introductions to log your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">Medium</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">People</th>
                  <th className="text-left py-2 font-medium text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {introductions.slice(0, 50).map((i) => (
                  <tr key={i.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{i.date}</td>
                    <td className="py-2 pr-4">{i.medium_name || "\u2014"}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {i.people.map(p => `${p.first_name} ${p.last_name}`).join(", ") || "\u2014"}
                    </td>
                    <td className="py-2 text-gray-600 truncate max-w-[200px]">{i.notes || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {introductions.length > 50 && (
              <p className="text-xs text-gray-400 mt-2">Showing first 50 of {introductions.length}. Download CSV for full data.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
