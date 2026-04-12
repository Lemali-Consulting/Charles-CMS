"use client";

import { useState, useEffect, useCallback } from "react";
import PersonTypeahead from "@/components/PersonTypeahead";

interface Person { id: number; first_name: string; last_name: string }
interface NamedEntity { id: number; name: string }

interface Introduction {
  id: number;
  interaction_type_id: number;
  interaction_type_name: string;
  medium_id: number | null;
  medium_name: string | null;
  date: string;
  notes: string;
  people: Person[];
  organizations: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export default function IntroductionsPage() {
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [mediums, setMediums] = useState<NamedEntity[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const load = useCallback(async () => {
    const [intRes, medRes, peopleRes] = await Promise.all([
      fetch("/api/interactions"),
      fetch("/api/interactions/mediums"),
      fetch("/api/people"),
    ]);
    setIntroductions(await intRes.json());
    setMediums(await medRes.json());
    setAllPeople(await peopleRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = introductions.find((i) => i.id === selectedId) || null;

  async function handleDelete(id: number) {
    if (!confirm("Delete this introduction?")) return;
    await fetch(`/api/interactions?id=${id}`, { method: "DELETE" });
    setSelectedId(null);
    load();
  }

  return (
    <div className="crm-layout">
      <div className="crm-list-panel">
        <div className="crm-list-header">
          <h1>Introductions</h1>
          <button onClick={() => setShowNewForm(true)} className="crm-btn crm-btn-primary">+ Add</button>
          {showNewForm && (
            <NewIntroductionForm
              mediums={mediums}
              allPeople={allPeople}
              onCreated={(id) => { setShowNewForm(false); load().then(() => setSelectedId(id)); }}
              onCancel={() => setShowNewForm(false)}
            />
          )}
        </div>
        <div className="crm-list-scroll">
          {introductions.map((intro) => {
            const firstPerson = intro.people[0];
            const others = intro.people.slice(1);
            return (
              <div
                key={intro.id}
                className={`crm-list-item${selectedId === intro.id ? " selected" : ""}`}
                onClick={() => setSelectedId(intro.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {firstPerson
                        ? `${firstPerson.first_name} ${firstPerson.last_name}`
                        : "Unknown"}
                      {others.length > 0 && (
                        <span className="text-gray-500">
                          {" \u2192 "}
                          {others.map(p => `${p.first_name} ${p.last_name}`).join(", ")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex gap-2">
                    <span>{intro.date}</span>
                    {intro.medium_name && <span>via {intro.medium_name}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {introductions.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">No introductions yet</div>
          )}
        </div>
      </div>

      {selected ? (
        <IntroductionDetail
          introduction={selected}
          mediums={mediums}
          allPeople={allPeople}
          onUpdate={load}
          onDelete={() => handleDelete(selected.id)}
        />
      ) : (
        <div className="crm-empty-detail">Select an introduction to view details</div>
      )}
    </div>
  );
}

function NewIntroductionForm({ mediums, allPeople, onCreated, onCancel }: {
  mediums: NamedEntity[];
  allPeople: Person[];
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  const [person1Id, setPerson1Id] = useState<number | "">("");
  const [otherPersonIds, setOtherPersonIds] = useState<number[]>([]);
  const emailMedium = mediums.find(m => m.name === "Email");
  const [mediumId, setMediumId] = useState<number>(emailMedium?.id || mediums[0]?.id || 0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (emailMedium) setMediumId(emailMedium.id);
  }, [emailMedium]);

  const availableForOthers = allPeople.filter(p => p.id !== person1Id);

  async function handleSubmit() {
    if (!person1Id || otherPersonIds.length === 0 || !date) return;
    const person_ids = [person1Id as number, ...otherPersonIds];
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medium_id: mediumId || null,
        date,
        notes,
        person_ids,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onCreated(data.id);
    }
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
      <div className="crm-field">
        <label className="text-xs font-medium text-gray-600">Person 1</label>
        {person1Id ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {allPeople.find(p => p.id === person1Id)?.first_name}{" "}
              {allPeople.find(p => p.id === person1Id)?.last_name}
            </span>
            <button
              type="button"
              onClick={() => { setPerson1Id(""); setOtherPersonIds([]); }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >&times;</button>
          </div>
        ) : (
          <PersonTypeahead
            people={allPeople}
            excludeIds={otherPersonIds}
            placeholder="Type a name..."
            onSelect={(p) => setPerson1Id(p.id)}
          />
        )}
      </div>
      <div className="crm-field">
        <label className="text-xs font-medium text-gray-600">Introduced to</label>
        {otherPersonIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {otherPersonIds.map(id => {
              const p = allPeople.find(x => x.id === id);
              return p ? (
                <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {p.first_name} {p.last_name}
                  <button
                    type="button"
                    onClick={() => setOtherPersonIds(ids => ids.filter(x => x !== id))}
                    className="hover:text-blue-900"
                  >&times;</button>
                </span>
              ) : null;
            })}
          </div>
        )}
        <PersonTypeahead
          people={allPeople}
          excludeIds={[...(person1Id ? [person1Id as number] : []), ...otherPersonIds]}
          placeholder="Type a name to add..."
          onSelect={(p) => setOtherPersonIds(ids => [...ids, p.id])}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">Medium</label>
          <select value={mediumId} onChange={(e) => setMediumId(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
            {mediums.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>
      <textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        rows={2}
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="crm-btn crm-btn-primary">Create</button>
        <button onClick={onCancel} className="crm-btn">Cancel</button>
      </div>
    </div>
  );
}

function IntroductionDetail({ introduction, mediums, allPeople, onUpdate, onDelete }: {
  introduction: Introduction;
  mediums: NamedEntity[];
  allPeople: Person[];
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    medium_id: introduction.medium_id,
    date: introduction.date,
    notes: introduction.notes,
    person_ids: introduction.people.map(p => p.id),
  });

  useEffect(() => {
    setForm({
      medium_id: introduction.medium_id,
      date: introduction.date,
      notes: introduction.notes,
      person_ids: introduction.people.map(p => p.id),
    });
  }, [introduction]);

  async function save(data: Record<string, unknown>) {
    await fetch(`/api/interactions/${introduction.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    onUpdate();
  }

  const firstPerson = introduction.people[0];
  const others = introduction.people.slice(1);

  return (
    <div className="crm-detail-panel">
      <div className="flex items-center justify-between mb-4">
        <h2>
          {firstPerson
            ? `${firstPerson.first_name} ${firstPerson.last_name}`
            : "Introduction"}
          {others.length > 0 && (
            <span className="text-gray-500 font-normal">
              {" \u2192 "}
              {others.map(p => `${p.first_name} ${p.last_name}`).join(", ")}
            </span>
          )}
        </h2>
        <button onClick={onDelete} className="crm-btn crm-btn-danger">Delete</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="crm-field">
          <label>Medium</label>
          <select
            value={form.medium_id ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setForm({ ...form, medium_id: val });
              save({ medium_id: val });
            }}
          >
            <option value="">-- None --</option>
            {mediums.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="crm-field">
          <label>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            onBlur={() => save({ date: form.date })}
          />
        </div>
      </div>

      <div className="crm-field">
        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => save({ notes: form.notes })}
        />
      </div>

      <div className="crm-field">
        <label>People</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {form.person_ids.map(id => {
            const p = allPeople.find(x => x.id === id);
            return p ? (
              <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {p.first_name} {p.last_name}
                <button
                  type="button"
                  onClick={() => {
                    const ids = form.person_ids.filter(x => x !== id);
                    setForm({ ...form, person_ids: ids });
                    save({ person_ids: ids });
                  }}
                  className="hover:text-blue-900"
                >&times;</button>
              </span>
            ) : null;
          })}
        </div>
        <PersonTypeahead
          people={allPeople}
          excludeIds={form.person_ids}
          placeholder="Add a person..."
          onSelect={(p) => {
            const ids = [...form.person_ids, p.id];
            setForm({ ...form, person_ids: ids });
            save({ person_ids: ids });
          }}
        />
      </div>
    </div>
  );
}
