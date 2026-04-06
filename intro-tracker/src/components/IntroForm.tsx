"use client";

import { useState, useEffect, useRef } from "react";

const CONTACT_TYPES = ["founder", "investor", "talent", "customer"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const TYPE_COLORS: Record<ContactType, { active: string; inactive: string }> = {
  founder: { active: "bg-purple-600 text-white", inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  investor: { active: "bg-blue-600 text-white", inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  talent: { active: "bg-emerald-600 text-white", inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  customer: { active: "bg-amber-500 text-white", inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
};

interface Tags {
  industries: string[];
  companies: string[];
  universities: string[];
}

export default function IntroForm() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    founder_name: "",
    contact_name: "",
    contact_types: [] as ContactType[],
    industry: "",
    company: "",
    website: "",
    university: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tags, setTags] = useState<Tags>({ industries: [], companies: [], universities: [] });

  useEffect(() => {
    fetch("/api/introductions/tags")
      .then((res) => res.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  function toggleType(type: ContactType) {
    setFormData((prev) => ({
      ...prev,
      contact_types: prev.contact_types.includes(type)
        ? prev.contact_types.filter((t) => t !== type)
        : [...prev.contact_types, type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.contact_types.length === 0) {
      return;
    }

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
        contact_types: [],
        industry: "",
        company: "",
        website: "",
        university: "",
        notes: "",
      });

      // Refresh tags for autocomplete
      fetch("/api/introductions/tags")
        .then((res) => res.json())
        .then(setTags)
        .catch(() => {});

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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Type(s) <span className="text-gray-600 font-normal">— select all that apply</span>
        </label>
        <div className="flex gap-3">
          {CONTACT_TYPES.map((type) => {
            const isActive = formData.contact_types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  isActive ? TYPE_COLORS[type].active : TYPE_COLORS[type].inactive
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
        {formData.contact_types.length === 0 && status === "idle" && (
          <p className="text-xs text-gray-600 mt-1">Select at least one type</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Industry (optional)</label>
        <AutocompleteInput
          value={formData.industry}
          onChange={(v) => setFormData({ ...formData, industry: v })}
          suggestions={tags.industries}
          placeholder="e.g. Fintech, Healthcare, SaaS"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
        <AutocompleteInput
          value={formData.company}
          onChange={(v) => setFormData({ ...formData, company: v })}
          suggestions={tags.companies}
          placeholder="e.g. Acme Corp"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
        <input
          type="url"
          placeholder="e.g. https://example.com"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">University (optional)</label>
        <AutocompleteInput
          value={formData.university}
          onChange={(v) => setFormData({ ...formData, university: v })}
          suggestions={tags.universities}
          placeholder="e.g. MIT, Stanford"
        />
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
        disabled={status === "saving" || formData.contact_types.length === 0}
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

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
          {filtered.map((s) => (
            <li
              key={s}
              className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
