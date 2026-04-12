"use client";

import { useState, useEffect, useCallback } from "react";

interface Person { id: number; first_name: string; last_name: string }
interface Org { id: number; name: string }
interface NamedEntity { id: number; name: string }

interface Interaction {
  id: number;
  interaction_type_id: number;
  interaction_type_name: string;
  medium_id: number | null;
  medium_name: string | null;
  date: string;
  notes: string;
  people: Person[];
  organizations: Org[];
  created_at: string;
  updated_at: string;
}

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [types, setTypes] = useState<NamedEntity[]>([]);
  const [mediums, setMediums] = useState<NamedEntity[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterType, setFilterType] = useState<number | "">("");

  const load = useCallback(async () => {
    const params = filterType ? `?type_id=${filterType}` : "";
    const [intRes, typesRes, medRes, peopleRes, orgsRes] = await Promise.all([
      fetch(`/api/interactions${params}`),
      fetch("/api/interactions/types"),
      fetch("/api/interactions/mediums"),
      fetch("/api/people"),
      fetch("/api/organizations"),
    ]);
    setInteractions(await intRes.json());
    setTypes(await typesRes.json());
    setMediums(await medRes.json());
    setAllPeople(await peopleRes.json());
    setAllOrgs(await orgsRes.json());
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const selected = interactions.find((i) => i.id === selectedId) || null;

  async function handleDelete(id: number) {
    if (!confirm("Delete this interaction?")) return;
    await fetch(`/api/interactions?id=${id}`, { method: "DELETE" });
    setSelectedId(null);
    load();
  }

  return (
    <div className="crm-layout">
      <div className="crm-list-panel">
        <div className="crm-list-header">
          <h1>Interactions</h1>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : "")}
              className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
            >
              <option value="">All types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={() => setShowNewForm(true)} className="crm-btn crm-btn-primary">+ Add</button>
          </div>
          {showNewForm && (
            <NewInteractionForm
              types={types}
              mediums={mediums}
              allPeople={allPeople}
              allOrgs={allOrgs}
              onCreated={(id) => { setShowNewForm(false); load().then(() => setSelectedId(id)); }}
              onCancel={() => setShowNewForm(false)}
            />
          )}
        </div>
        <div className="crm-list-scroll">
          {interactions.map((inter) => (
            <div
              key={inter.id}
              className={`crm-list-item${selectedId === inter.id ? " selected" : ""}`}
              onClick={() => setSelectedId(inter.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{inter.interaction_type_name}</span>
                  <span className="text-xs text-gray-400">{inter.date}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {inter.people.map(p => `${p.first_name} ${p.last_name}`).join(", ")}
                  {inter.people.length > 0 && inter.organizations.length > 0 && " / "}
                  {inter.organizations.map(o => o.name).join(", ")}
                </div>
              </div>
            </div>
          ))}
          {interactions.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">No interactions found</div>
          )}
        </div>
      </div>

      {selected ? (
        <InteractionDetail
          interaction={selected}
          types={types}
          mediums={mediums}
          allPeople={allPeople}
          allOrgs={allOrgs}
          onUpdate={load}
          onDelete={() => handleDelete(selected.id)}
        />
      ) : (
        <div className="crm-empty-detail">Select an interaction to view details</div>
      )}
    </div>
  );
}

function NewInteractionForm({ types, mediums, allPeople, allOrgs, onCreated, onCancel }: {
  types: NamedEntity[];
  mediums: NamedEntity[];
  allPeople: Person[];
  allOrgs: Org[];
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  const [typeId, setTypeId] = useState<number>(types[0]?.id || 0);
  const [mediumId, setMediumId] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [personIds, setPersonIds] = useState<number[]>([]);
  const [orgIds, setOrgIds] = useState<number[]>([]);

  async function handleSubmit() {
    if (!typeId || !date) return;
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interaction_type_id: typeId,
        medium_id: mediumId || null,
        date,
        notes,
        person_ids: personIds,
        organization_ids: orgIds,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onCreated(data.id);
    }
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
      </div>
      <select value={mediumId} onChange={(e) => setMediumId(e.target.value ? Number(e.target.value) : "")} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
        <option value="">-- Medium --</option>
        {mediums.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select
        multiple
        value={personIds.map(String)}
        onChange={(e) => setPersonIds(Array.from(e.target.selectedOptions, o => Number(o.value)))}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm h-20"
      >
        {allPeople.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
      </select>
      <select
        multiple
        value={orgIds.map(String)}
        onChange={(e) => setOrgIds(Array.from(e.target.selectedOptions, o => Number(o.value)))}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm h-20"
      >
        {allOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
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

function InteractionDetail({ interaction, types, mediums, allPeople, allOrgs, onUpdate, onDelete }: {
  interaction: Interaction;
  types: NamedEntity[];
  mediums: NamedEntity[];
  allPeople: Person[];
  allOrgs: Org[];
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    interaction_type_id: interaction.interaction_type_id,
    medium_id: interaction.medium_id,
    date: interaction.date,
    notes: interaction.notes,
    person_ids: interaction.people.map(p => p.id),
    organization_ids: interaction.organizations.map(o => o.id),
  });

  useEffect(() => {
    setForm({
      interaction_type_id: interaction.interaction_type_id,
      medium_id: interaction.medium_id,
      date: interaction.date,
      notes: interaction.notes,
      person_ids: interaction.people.map(p => p.id),
      organization_ids: interaction.organizations.map(o => o.id),
    });
  }, [interaction]);

  async function save(data: Record<string, unknown>) {
    await fetch(`/api/interactions/${interaction.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    onUpdate();
  }

  return (
    <div className="crm-detail-panel">
      <div className="flex items-center justify-between mb-4">
        <h2>{interaction.interaction_type_name} &mdash; {interaction.date}</h2>
        <button onClick={onDelete} className="crm-btn crm-btn-danger">Delete</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="crm-field">
          <label>Type</label>
          <select
            value={form.interaction_type_id}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm({ ...form, interaction_type_id: val });
              save({ interaction_type_id: val });
            }}
          >
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => save({ notes: form.notes })}
        />
      </div>

      <div className="crm-field">
        <label>People</label>
        <select
          multiple
          value={form.person_ids.map(String)}
          onChange={(e) => {
            const ids = Array.from(e.target.selectedOptions, o => Number(o.value));
            setForm({ ...form, person_ids: ids });
            save({ person_ids: ids });
          }}
          className="h-24"
        >
          {allPeople.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
      </div>

      <div className="crm-field">
        <label>Organizations</label>
        <select
          multiple
          value={form.organization_ids.map(String)}
          onChange={(e) => {
            const ids = Array.from(e.target.selectedOptions, o => Number(o.value));
            setForm({ ...form, organization_ids: ids });
            save({ organization_ids: ids });
          }}
          className="h-24"
        >
          {allOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
    </div>
  );
}
