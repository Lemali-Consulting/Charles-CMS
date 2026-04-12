"use client";

import { useState, useEffect } from "react";

interface NamedEntity { id: number; name: string }
interface Person { id: number; first_name: string; last_name: string }
interface Org { id: number; name: string }

interface PPRel {
  id: number;
  person_1_id: number; person_1_name: string;
  person_2_id: number; person_2_name: string;
  relationship_type_name: string | null;
  notes: string;
}

interface OPRel {
  id: number;
  organization_id: number; organization_name: string;
  person_id: number; person_name: string;
  relationship_type_name: string | null;
  notes: string;
}

interface OORel {
  id: number;
  org_1_id: number; org_1_name: string;
  org_2_id: number; org_2_name: string;
  relationship_type_name: string | null;
  notes: string;
}

type Tab = "person-person" | "org-person" | "org-org";

export default function RelationshipsPage() {
  const [tab, setTab] = useState<Tab>("person-person");
  const [ppRels, setPpRels] = useState<PPRel[]>([]);
  const [opRels, setOpRels] = useState<OPRel[]>([]);
  const [ooRels, setOoRels] = useState<OORel[]>([]);
  const [ppTypes, setPpTypes] = useState<NamedEntity[]>([]);
  const [opTypes, setOpTypes] = useState<NamedEntity[]>([]);
  const [ooTypes, setOoTypes] = useState<NamedEntity[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const [pp, op, oo, ppt, opt, oot, ppl, org] = await Promise.all([
      fetch("/api/relationships/person-person").then(r => r.json()),
      fetch("/api/relationships/org-person").then(r => r.json()),
      fetch("/api/relationships/org-org").then(r => r.json()),
      fetch("/api/relationships/types/person-person").then(r => r.json()),
      fetch("/api/relationships/types/org-person").then(r => r.json()),
      fetch("/api/relationships/types/org-org").then(r => r.json()),
      fetch("/api/people").then(r => r.json()),
      fetch("/api/organizations").then(r => r.json()),
    ]);
    setPpRels(pp); setOpRels(op); setOoRels(oo);
    setPpTypes(ppt); setOpTypes(opt); setOoTypes(oot);
    setPeople(ppl); setOrgs(org);
  }

  useEffect(() => { load(); }, []);

  async function handleDeletePP(id: number) {
    await fetch(`/api/relationships/person-person?id=${id}`, { method: "DELETE" });
    load();
  }
  async function handleDeleteOP(id: number) {
    await fetch(`/api/relationships/org-person?id=${id}`, { method: "DELETE" });
    load();
  }
  async function handleDeleteOO(id: number) {
    await fetch(`/api/relationships/org-org?id=${id}`, { method: "DELETE" });
    load();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "person-person", label: "Person \u2194 Person" },
    { key: "org-person", label: "Org \u2194 Person" },
    { key: "org-org", label: "Org \u2194 Org" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Relationships</h1>
        <button onClick={() => setShowNew(true)} className="crm-btn crm-btn-primary">+ Add Relationship</button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowNew(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showNew && (
        <NewRelationshipForm
          tab={tab}
          people={people}
          orgs={orgs}
          ppTypes={ppTypes}
          opTypes={opTypes}
          ooTypes={ooTypes}
          onCreated={() => { setShowNew(false); load(); }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {tab === "person-person" && (
        <div className="space-y-2">
          {ppRels.length === 0 ? <p className="text-gray-400 text-sm">No person-person relationships</p> : ppRels.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-sm">{r.person_1_name}</span>
              <span className="text-gray-400">&harr;</span>
              <span className="font-medium text-sm">{r.person_2_name}</span>
              {r.relationship_type_name && <span className="crm-tag">{r.relationship_type_name}</span>}
              {r.notes && <span className="text-xs text-gray-500 flex-1 truncate">{r.notes}</span>}
              <button onClick={() => handleDeletePP(r.id)} className="crm-btn crm-btn-danger text-xs">&times;</button>
            </div>
          ))}
        </div>
      )}

      {tab === "org-person" && (
        <div className="space-y-2">
          {opRels.length === 0 ? <p className="text-gray-400 text-sm">No org-person relationships</p> : opRels.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-sm">{r.organization_name}</span>
              <span className="text-gray-400">&harr;</span>
              <span className="font-medium text-sm">{r.person_name}</span>
              {r.relationship_type_name && <span className="crm-tag">{r.relationship_type_name}</span>}
              {r.notes && <span className="text-xs text-gray-500 flex-1 truncate">{r.notes}</span>}
              <button onClick={() => handleDeleteOP(r.id)} className="crm-btn crm-btn-danger text-xs">&times;</button>
            </div>
          ))}
        </div>
      )}

      {tab === "org-org" && (
        <div className="space-y-2">
          {ooRels.length === 0 ? <p className="text-gray-400 text-sm">No org-org relationships</p> : ooRels.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-sm">{r.org_1_name}</span>
              <span className="text-gray-400">&harr;</span>
              <span className="font-medium text-sm">{r.org_2_name}</span>
              {r.relationship_type_name && <span className="crm-tag">{r.relationship_type_name}</span>}
              {r.notes && <span className="text-xs text-gray-500 flex-1 truncate">{r.notes}</span>}
              <button onClick={() => handleDeleteOO(r.id)} className="crm-btn crm-btn-danger text-xs">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewRelationshipForm({ tab, people, orgs, ppTypes, opTypes, ooTypes, onCreated, onCancel }: {
  tab: Tab;
  people: Person[];
  orgs: Org[];
  ppTypes: NamedEntity[];
  opTypes: NamedEntity[];
  ooTypes: NamedEntity[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [entity1, setEntity1] = useState<number>(0);
  const [entity2, setEntity2] = useState<number>(0);
  const [typeId, setTypeId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [newTypeName, setNewTypeName] = useState("");

  const typesList = tab === "person-person" ? ppTypes : tab === "org-person" ? opTypes : ooTypes;

  async function handleSubmit() {
    if (!entity1 || !entity2) return;
    const endpoint = `/api/relationships/${tab}`;
    let body: Record<string, unknown>;
    if (tab === "person-person") {
      body = { person_1_id: entity1, person_2_id: entity2, relationship_type_id: typeId || null, notes };
    } else if (tab === "org-person") {
      body = { organization_id: entity1, person_id: entity2, relationship_type_id: typeId || null, notes };
    } else {
      body = { org_1_id: entity1, org_2_id: entity2, relationship_type_id: typeId || null, notes };
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) onCreated();
  }

  async function handleCreateType() {
    if (!newTypeName.trim()) return;
    const endpoint = `/api/relationships/types/${tab}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName.trim() }),
    });
    if (res.ok) {
      const newType = await res.json();
      setTypeId(newType.id);
      setNewTypeName("");
      onCreated(); // reload to get new type in list
    }
  }

  return (
    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="crm-field">
          <label>{tab === "org-person" ? "Organization" : tab === "org-org" ? "Org 1" : "Person 1"}</label>
          <select value={entity1} onChange={(e) => setEntity1(Number(e.target.value))}>
            <option value={0}>-- Select --</option>
            {(tab === "person-person" ? people : orgs).map((e) => (
              <option key={e.id} value={e.id}>{"first_name" in e ? `${e.first_name} ${e.last_name}` : e.name}</option>
            ))}
          </select>
        </div>
        <div className="crm-field">
          <label>{tab === "org-person" ? "Person" : tab === "org-org" ? "Org 2" : "Person 2"}</label>
          <select value={entity2} onChange={(e) => setEntity2(Number(e.target.value))}>
            <option value={0}>-- Select --</option>
            {(tab === "org-org" ? orgs : people).map((e) => (
              <option key={e.id} value={e.id}>{"first_name" in e ? `${e.first_name} ${e.last_name}` : e.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="crm-field">
        <label>Type</label>
        <div className="flex gap-2">
          <select value={typeId} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")} className="flex-1">
            <option value="">-- None --</option>
            {typesList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            placeholder="New type..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
            className="flex-1 text-sm"
          />
          {newTypeName && <button onClick={handleCreateType} className="crm-btn text-xs">Add</button>}
        </div>
      </div>
      <div className="crm-field">
        <label>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="crm-btn crm-btn-primary">Create</button>
        <button onClick={onCancel} className="crm-btn">Cancel</button>
      </div>
    </div>
  );
}
