"use client";

import { useEffect, useState } from "react";

interface Introduction {
  id: number;
  date: string;
  founder_name: string;
  contact_name: string;
  contact_types: string[];
  company: string | null;
  website: string | null;
}

export default function ExportPage() {
  const [founders, setFounders] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/introductions")
      .then((res) => res.json())
      .then((data: Introduction[]) => {
        setFounders(data.filter((i) => i.contact_types.includes("founder")));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dealroom Export</h1>
        <p className="text-gray-500">
          Export founder contacts as an Excel file for Dealroom.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Founder Contacts</h2>
            <p className="text-sm text-gray-500">
              {founders.length} founder{founders.length !== 1 ? "s" : ""} will
              be included
            </p>
          </div>
          <a
            href="/api/introductions/export"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Download Excel
          </a>
        </div>

        {founders.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No founder contacts logged yet. Log introductions with the
            &ldquo;founder&rdquo; type to populate this export.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">
                    Company
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-700">
                    Website
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {founders.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{f.contact_name}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {f.company || "\u2014"}
                    </td>
                    <td className="py-2 pr-4 text-blue-600 truncate max-w-[200px]">
                      {f.website ? (
                        <a
                          href={f.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {f.website}
                        </a>
                      ) : (
                        <span className="text-gray-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{f.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
