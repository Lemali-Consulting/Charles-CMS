"use client";

import { useState, useEffect, useCallback } from "react";

interface Organization {
  id: number;
  name: string;
  org_type_id: number | null;
  org_type_name: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface OrgType {
  id: number;
  name: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgTypes, setOrgTypes] = useState<OrgType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const [orgsRes, typesRes] = await Promise.all([
      fetch(`/api/organizations${params}`),
      fetch("/api/organizations/types"),
    ]);
    setOrgs(await orgsRes.json());
    setOrgTypes(await typesRes.json());
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const selected = orgs.find((o) => o.id === selectedId) || null;

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const org = await res.json();
      setNewName("");
      setShowNewForm(false);
      await load();
      setSelectedId(org.id);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this organization?")) return;
    await fetch(`/api/organizations?id=${id}`, { method: "DELETE" });
    setSelectedId(null);
    load();
  }

  return (
    <div className="crm-layout">
      <div className="crm-list-panel">
        <div className="crm-list-header">
          <h1>Organizations</h1>
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
              <input
                type="text"
                placeholder="Organization name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="crm-btn crm-btn-primary">Create</button>
                <button onClick={() => { setShowNewForm(false); setNewName(""); }} className="crm-btn">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="crm-list-scroll">
          {orgs.map((org) => (
            <div
              key={org.id}
              className={`crm-list-item${selectedId === org.id ? " selected" : ""}`}
              onClick={() => setSelectedId(org.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{org.name}</div>
                {org.org_type_name && <div className="text-xs text-gray-500">{org.org_type_name}</div>}
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">No organizations found</div>
          )}
        </div>
      </div>

      {selected ? (
        <OrgDetail org={selected} orgTypes={orgTypes} onUpdate={load} onDelete={() => handleDelete(selected.id)} />
      ) : (
        <div className="crm-empty-detail">Select an organization to view details</div>
      )}
    </div>
  );
}

function OrgDetail({ org, orgTypes, onUpdate, onDelete }: {
  org: Organization;
  orgTypes: OrgType[];
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: org.name,
    org_type_id: org.org_type_id,
    notes: org.notes,
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [relationships, setRelationships] = useState<{
    people: Array<{ id: number; person_name: string; relationship_type_name: string | null }>;
    orgs: Array<{ id: number; org_1_id: number; org_1_name: string; org_2_id: number; org_2_name: string; relationship_type_name: string | null }>;
  }>({ people: [], orgs: [] });

  useEffect(() => {
    setForm({ name: org.name, org_type_id: org.org_type_id, notes: org.notes });
    Promise.all([
      fetch("/api/relationships/org-person").then(r => r.json()),
      fetch("/api/relationships/org-org").then(r => r.json()),
    ]).then(([op, oo]) => {
      setRelationships({
        people: op.filter((r: { organization_id: number }) => r.organization_id === org.id),
        orgs: oo.filter((r: { org_1_id: number; org_2_id: number }) => r.org_1_id === org.id || r.org_2_id === org.id),
      });
    });
  }, [org]);

  async function save(field: string, value: unknown) {
    await fetch(`/api/organizations/${org.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdate();
  }

  async function createType() {
    if (!newTypeName.trim()) return;
    const res = await fetch("/api/organizations/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName.trim() }),
    });
    if (res.ok) {
      const newType = await res.json();
      setNewTypeName("");
      await save("org_type_id", newType.id);
    }
  }

  return (
    <div className="crm-detail-panel">
      <div className="flex items-center justify-between mb-4">
        <h2>{org.name}</h2>
        <button onClick={onDelete} className="crm-btn crm-btn-danger">Delete</button>
      </div>

      <div className="crm-field">
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onBlur={() => save("name", form.name)}
        />
      </div>

      <div className="crm-field">
        <label>Type</label>
        <select
          value={form.org_type_id ?? ""}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            setForm({ ...form, org_type_id: val });
            save("org_type_id", val);
          }}
        >
          <option value="">-- None --</option>
          {orgTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            placeholder="New type..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createType()}
            className="flex-1 text-xs"
          />
          <button onClick={createType} className="crm-btn text-xs">Add Type</button>
        </div>
      </div>

      <div className="crm-field">
        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => save("notes", form.notes)}
        />
      </div>

      <div className="crm-section-title">People</div>
      {relationships.people.length === 0 ? (
        <p className="text-sm text-gray-400">No people linked</p>
      ) : (
        <div className="space-y-1">
          {relationships.people.map((r) => (
            <div key={r.id} className="text-sm flex gap-2">
              <span className="font-medium">{r.person_name}</span>
              {r.relationship_type_name && <span className="text-gray-500">({r.relationship_type_name})</span>}
            </div>
          ))}
        </div>
      )}

      <div className="crm-section-title">Related Organizations</div>
      {relationships.orgs.length === 0 ? (
        <p className="text-sm text-gray-400">No related organizations</p>
      ) : (
        <div className="space-y-1">
          {relationships.orgs.map((r) => {
            const otherName = r.org_1_id === org.id ? r.org_2_name : r.org_1_name;
            return (
              <div key={r.id} className="text-sm flex gap-2">
                <span className="font-medium">{otherName}</span>
                {r.relationship_type_name && <span className="text-gray-500">({r.relationship_type_name})</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
