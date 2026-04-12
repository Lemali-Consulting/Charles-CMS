"use client";

import { useState, useEffect, useCallback } from "react";

interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  linkedin_url: string;
  notes: string;
  tags: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  const load = useCallback(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/people${params}`);
    setPeople(await res.json());
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const selected = people.find((p) => p.id === selectedId) || null;

  async function handleCreate() {
    if (!newFirst.trim() || !newLast.trim()) return;
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: newFirst.trim(), last_name: newLast.trim() }),
    });
    if (res.ok) {
      const person = await res.json();
      setNewFirst("");
      setNewLast("");
      setShowNewForm(false);
      await load();
      setSelectedId(person.id);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this person?")) return;
    await fetch(`/api/people?id=${id}`, { method: "DELETE" });
    setSelectedId(null);
    load();
  }

  return (
    <div className="crm-layout">
      <div className="crm-list-panel">
        <div className="crm-list-header">
          <h1>People</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
            />
            <button onClick={() => setShowNewForm(true)} className="crm-btn crm-btn-primary">+ Add</button>
          </div>
          {showNewForm && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="crm-btn crm-btn-primary">Create</button>
                <button onClick={() => { setShowNewForm(false); setNewFirst(""); setNewLast(""); }} className="crm-btn">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="crm-list-scroll">
          {people.map((person) => (
            <div
              key={person.id}
              className={`crm-list-item${selectedId === person.id ? " selected" : ""}`}
              onClick={() => setSelectedId(person.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{person.first_name} {person.last_name}</div>
                {person.email && <div className="text-xs text-gray-500 truncate">{person.email}</div>}
              </div>
              {person.tags.length > 0 && (
                <div className="flex gap-1 flex-shrink-0">
                  {person.tags.slice(0, 2).map((t) => (
                    <span key={t.id} className="crm-tag">{t.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {people.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">No people found</div>
          )}
        </div>
      </div>

      {selected ? (
        <PersonDetail
          person={selected}
          onUpdate={load}
          onDelete={() => handleDelete(selected.id)}
        />
      ) : (
        <div className="crm-empty-detail">Select a person to view details</div>
      )}
    </div>
  );
}

function PersonDetail({ person, onUpdate, onDelete }: {
  person: Person;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    linkedin_url: person.linkedin_url,
    notes: person.notes,
  });
  const [tagInput, setTagInput] = useState("");
  const [interactions, setInteractions] = useState<Array<{
    id: number;
    date: string;
    interaction_type_name: string;
    notes: string;
    people: { id: number; first_name: string; last_name: string }[];
  }>>([]);
  const [relationships, setRelationships] = useState<{
    people: Array<{ id: number; person_1_id: number; person_1_name: string; person_2_id: number; person_2_name: string; relationship_type_name: string | null }>;
    organizations: Array<{ id: number; organization_name: string; relationship_type_name: string | null }>;
  }>({ people: [], organizations: [] });

  useEffect(() => {
    setForm({
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      linkedin_url: person.linkedin_url,
      notes: person.notes,
    });
    fetch(`/api/interactions?person_id=${person.id}`).then(r => r.json()).then(setInteractions);
    // Load relationships for this person
    Promise.all([
      fetch("/api/relationships/person-person").then(r => r.json()),
      fetch("/api/relationships/org-person").then(r => r.json()),
    ]).then(([pp, op]) => {
      setRelationships({
        people: pp.filter((r: { person_1_id: number; person_2_id: number }) => r.person_1_id === person.id || r.person_2_id === person.id),
        organizations: op.filter((r: { person_id: number }) => r.person_id === person.id),
      });
    });
  }, [person]);

  async function save(field: string, value: string) {
    await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdate();
  }

  async function addTag() {
    if (!tagInput.trim()) return;
    const newTags = [...person.tags.map(t => t.name), tagInput.trim()];
    await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    setTagInput("");
    onUpdate();
  }

  async function removeTag(tagName: string) {
    const newTags = person.tags.filter(t => t.name !== tagName).map(t => t.name);
    await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    onUpdate();
  }

  return (
    <div className="crm-detail-panel">
      <div className="flex items-center justify-between mb-4">
        <h2>{person.first_name} {person.last_name}</h2>
        <button onClick={onDelete} className="crm-btn crm-btn-danger">Delete</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="crm-field">
          <label>First Name</label>
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            onBlur={() => save("first_name", form.first_name)}
          />
        </div>
        <div className="crm-field">
          <label>Last Name</label>
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            onBlur={() => save("last_name", form.last_name)}
          />
        </div>
      </div>

      <div className="crm-field">
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onBlur={() => save("email", form.email)}
        />
      </div>

      <div className="crm-field">
        <label>LinkedIn</label>
        <input
          value={form.linkedin_url}
          onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
          onBlur={() => save("linkedin_url", form.linkedin_url)}
        />
      </div>

      <div className="crm-field">
        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => save("notes", form.notes)}
        />
      </div>

      <div className="crm-field">
        <label>Tags</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {person.tags.map((tag) => (
            <span key={tag.id} className="crm-tag">
              {tag.name}
              <button onClick={() => removeTag(tag.name)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="flex-1"
          />
          <button onClick={addTag} className="crm-btn">Add</button>
        </div>
      </div>

      <div className="crm-section-title">Relationships</div>
      {relationships.people.length === 0 && relationships.organizations.length === 0 ? (
        <p className="text-sm text-gray-400">No relationships yet</p>
      ) : (
        <div className="space-y-1">
          {relationships.people.map((r) => {
            const otherName = r.person_1_id === person.id ? r.person_2_name : r.person_1_name;
            return (
              <div key={r.id} className="text-sm flex gap-2">
                <span className="font-medium">{otherName}</span>
                {r.relationship_type_name && <span className="text-gray-500">({r.relationship_type_name})</span>}
              </div>
            );
          })}
          {relationships.organizations.map((r) => (
            <div key={r.id} className="text-sm flex gap-2">
              <span className="font-medium">{r.organization_name}</span>
              {r.relationship_type_name && <span className="text-gray-500">({r.relationship_type_name})</span>}
            </div>
          ))}
        </div>
      )}

      <div className="crm-section-title">Recent Interactions</div>
      {interactions.length === 0 ? (
        <p className="text-sm text-gray-400">No interactions yet</p>
      ) : (
        <div className="space-y-2">
          {interactions.slice(0, 10).map((i) => (
            <div key={i.id} className="text-sm border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{i.interaction_type_name}</span>
                <span className="text-gray-400">{i.date}</span>
              </div>
              {i.notes && <p className="text-gray-600 mt-0.5 text-xs">{i.notes}</p>}
              {i.people.length > 1 && (
                <div className="text-xs text-gray-500 mt-0.5">
                  with {i.people.filter(p => p.id !== person.id).map(p => `${p.first_name} ${p.last_name}`).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
