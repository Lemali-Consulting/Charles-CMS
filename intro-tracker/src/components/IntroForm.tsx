"use client";

import { useState } from "react";

const CONTACT_TYPES = ["investor", "talent", "customer"] as const;

export default function IntroForm() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    founder_name: "",
    contact_name: "",
    contact_type: "investor" as (typeof CONTACT_TYPES)[number],
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/introductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      setStatus("saved");
      setFormData({
        date: new Date().toISOString().split("T")[0],
        founder_name: "",
        contact_name: "",
        contact_type: "investor",
        notes: "",
      });
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Founder Name</label>
        <input
          type="text"
          required
          placeholder="Who made the introduction?"
          value={formData.founder_name}
          onChange={(e) => setFormData({ ...formData, founder_name: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
        <input
          type="text"
          required
          placeholder="Who were they introduced to?"
          value={formData.contact_name}
          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
        <div className="flex gap-3">
          {CONTACT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, contact_type: type })}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                formData.contact_type === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          placeholder="Any context about this introduction..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
          ? "Saved!"
          : status === "error"
          ? "Error - try again"
          : "Log Introduction"}
      </button>
    </form>
  );
}
