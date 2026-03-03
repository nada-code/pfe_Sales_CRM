import { useState } from "react";
import { createLead } from "../../api/leadsApi";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";

const DEFAULT_FORM = {
  firstName: "", lastName: "", email: "", phone: "",
  city: "", country: "Tunisie", status: "New", source: "Other",
};

export default function NewLeadModal({ onClose, onCreated }) {
  const [form,   setForm]   = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    setErr("");
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setErr("First name, last name, email and phone are required.");
      return;
    }
    setSaving(true);
    try { onCreated(await createLead(form)); onClose(); }
    catch (e) { setErr(e.message); }
    finally   { setSaving(false); }
  }

  const FIELDS = [
    { f: "firstName", l: "First Name *" },
    { f: "lastName",  l: "Last Name *"  },
    { f: "email",     l: "Email *",   span: 2 },
    { f: "phone",     l: "Phone *",   span: 2 },
    { f: "city",      l: "City"       },
    { f: "country",   l: "Country"    },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--md">
        <div className="modal__header">
          <div className="modal__title">New Lead</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <div className="form-grid">
            {FIELDS.map(({ f, l, span }) => (
              <div key={f} className={span === 2 ? "form-grid__full" : ""}>
                <label className="form-label">{l}</label>
                <input className="form-input" value={form[f]} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.keys(STATUS_CFG).map((s) => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={(e) => set("source", e.target.value)}>
                {Object.keys(SOURCE_CFG).map((s) => <option key={s} value={s}>{SOURCE_CFG[s].label}</option>)}
              </select>
            </div>
            {err && <div className="form-error">{err}</div>}
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }} onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}