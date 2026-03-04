import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchLeadById, updateLead, deleteLead } from "../../api/leadsApi";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import { fullName, fmtDate, fmtTime, acolor, av2 } from "../../utils/leadsUtils";
import { Spinner } from "../../components/UI";
import "../../styles/leads.css";
import "../../styles/LeadDetail.css";

const NOTES_PREVIEW = 2;
const NOTE_TRUNCATE = 120;

export default function LeadDetailPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab,           setTab]           = useState(searchParams.get("tab") || "overview");
  const [lead,          setLead]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Edit state
  const [editData,  setEditData]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Notes state
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNote,  setExpandedNote]  = useState(null);

  /* ── load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeadById(id);
      setLead(data);
      setEditData({
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        phone:     data.phone,
        city:      data.city    || "",
        country:   data.country || "",
        source:    data.source,
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── edit submit ──────────────────────────────────────────────────────── */
  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateLead(id, editData);
      setLead(updated?.data || updated);
      setTab("overview");
    } catch (e) {
      setSaveError(e?.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  /* ── delete ───────────────────────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLead(id);
      navigate("/sales-leader/team", { replace: true });
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      setError(e?.response?.data?.message || "Failed to delete lead");
    }
  }

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const heroColor = lead ? acolor(lead._id) : "#6366f1";
  const statusCfg = lead ? (STATUS_CFG[lead.status] || STATUS_CFG.New)   : null;
  const sourceCfg = lead ? (SOURCE_CFG[lead.source] || SOURCE_CFG.Other) : null;

  const visibleNotes = lead?.notes
    ? notesExpanded ? lead.notes : lead.notes.slice(-NOTES_PREVIEW)
    : [];

  /* ── loading / error ──────────────────────────────────────────────────── */
  if (loading) return (
    <div className="ld-loading"><Spinner size={36} /><span>Loading lead…</span></div>
  );
  if (error) return (
    <div className="ld-error">
      <span className="ld-error__icon">⚠</span>
      <p>{error}</p>
      <button className="btn-primary" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );
  if (!lead) return null;

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="ld-root">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <div className="ld-hero" style={{ "--hero": heroColor }}>
        <div className="ld-hero__blob ld-hero__blob--1" style={{ background: heroColor }} />
        <div className="ld-hero__blob ld-hero__blob--2" style={{ background: heroColor }} />

        <div className="ld-hero__inner">

          {/* Back + Delete row */}
          <div className="ld-hero__topbar">
            <button className="ld-hero__back" onClick={() => navigate(-1)}>
              ← Back to leads
            </button>
            <button className="ld-hero__delete-btn" onClick={() => setConfirmDelete(true)}>
              🗑 Delete lead
            </button>
          </div>

          {/* Profile */}
          <div className="ld-hero__profile">
            <div className="ld-hero__avatar" style={{ background: heroColor }}>
              {`${lead.firstName?.[0]||""}${lead.lastName?.[0]||""}`.toUpperCase()}
            </div>

            <div className="ld-hero__identity">
              <div className="ld-hero__id">{lead.leadNumber || ""}</div>
              <h1 className="ld-hero__name">{lead.firstName} {lead.lastName}</h1>
              <div className="ld-hero__meta">{lead.email} · {lead.phone}</div>
              {lead.city && (
                <div className="ld-hero__meta">
                  📍 {lead.city}{lead.country ? `, ${lead.country}` : ""}
                </div>
              )}
              <div className="ld-hero__badges">
                <span className="ld-pill"
                  style={{ borderColor: statusCfg.color, color: statusCfg.color, background: statusCfg.light + "22" }}>
                  <span className="ld-pill__dot" style={{ background: statusCfg.color }} />
                  {statusCfg.label}
                </span>
                <span className="ld-pill"
                  style={{ borderColor: sourceCfg.color + "66", color: sourceCfg.color }}>
                  {sourceCfg.icon} {sourceCfg.label}
                </span>
              </div>
            </div>

            {/* Assigned agent */}
            <div className="ld-hero__agent">
              {lead.assignedTo ? (
                <>
                  <div className="ld-hero__agent-av" style={{ background: acolor(lead.assignedTo._id) }}>
                    {av2(lead.assignedTo)}
                  </div>
                  <div className="ld-hero__agent-info">
                    <span className="ld-hero__agent-label">Assigned to</span>
                    <span className="ld-hero__agent-name">{fullName(lead.assignedTo)}</span>
                  </div>
                </>
              ) : (
                <div className="ld-hero__agent-empty">Unassigned</div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="ld-tabs">
            {[
              { k: "overview", icon: "◈", label: "Overview" },
              { k: "notes",    icon: "✎", label: `Notes (${lead.notes?.length || 0})` },
              { k: "edit",     icon: "✦", label: "Edit" },
            ].map((t) => (
              <button key={t.k}
                className={`ld-tab${tab === t.k ? " ld-tab--active" : ""}`}
                onClick={() => { setTab(t.k); setSaveError(""); }}>
                <span className="ld-tab__icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT
      ══════════════════════════════════════ */}
      <div className="ld-content">

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="ld-bento">

            <div className="ld-card ld-card--wide">
              <div className="ld-card__label">📋 Contact details</div>
              <div className="ld-contacts-grid">
                {[
                  { icon: "✉",  label: "Email",   value: lead.email || "—" },
                  { icon: "📞", label: "Phone",   value: lead.phone   || "—" },
                  { icon: "🏙", label: "City",    value: lead.city    || "—" },
                  { icon: "🌍", label: "Country", value: lead.country || "—" },
                  { icon: "📅", label: "Created", value: fmtDate(lead.createdAt) },
                  { icon: "✎",  label: "Notes",   value: `${lead.notes?.length || 0} note(s)` },
                ].map((row) => (
                  <div key={row.label} className="ld-contact-item">
                    <span className="ld-contact-item__icon">{row.icon}</span>
                    <div>
                      <div className="ld-contact-item__label">{row.label}</div>
                      <div className="ld-contact-item__value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ld-card">
              <div className="ld-card__label">📊 Status</div>
              <div className="ld-status-display"
                style={{ background: statusCfg.light, borderColor: statusCfg.color + "44" }}>
                <span className="ld-status-display__dot" style={{ background: statusCfg.color }} />
                <span className="ld-status-display__label" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="ld-readonly-hint">Only salesmen can change the status.</p>
            </div>

            <div className="ld-card">
              <div className="ld-card__label">👤 Assigned salesman</div>
              {lead.assignedTo ? (
                <div className="ld-agent">
                  <div className="ld-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>
                    {av2(lead.assignedTo)}
                  </div>
                  <div className="ld-agent__info">
                    <div className="ld-agent__name">{fullName(lead.assignedTo)}</div>
                    <div className="ld-agent__role">Salesman</div>
                  </div>
                </div>
              ) : (
                <div className="ld-agent--empty">
                  <div className="ld-agent--empty__icon">+</div>
                  <span>No salesman assigned yet</span>
                </div>
              )}
            </div>

            {/* Notes preview */}
            {lead.notes?.length > 0 && (
              <div className="ld-card ld-card--accent ld-card--wide">
                <div className="ld-card__label">✎ Notes preview</div>
                <div className="ld-overview-notes">
                  {lead.notes.slice(-2).map((note, i) => (
                    <div key={i} className="ld-overview-note">
                      <span className="ld-overview-note__dot" />
                      <div className="ld-overview-note__body">
                        <p className="ld-overview-note__text">
                          {note.content?.slice(0, NOTE_TRUNCATE)}
                          {note.content?.length > NOTE_TRUNCATE && "…"}
                        </p>
                        <span className="ld-overview-note__date">
                          {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="ld-link-btn" style={{ marginTop: 12 }}
                  onClick={() => setTab("notes")}>
                  See all {lead.notes.length} notes →
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── NOTES ─────────────────────────────────────────── */}
        {tab === "notes" && (
          <div className="ld-notes">
            <div className="ld-notes__header">
              <div>
                <h2 className="ld-notes__title">Notes</h2>
                <p className="ld-notes__sub">
                  {lead.notes?.length
                    ? `${lead.notes.length} note(s) — written by salesmen`
                    : "No notes yet"}
                </p>
              </div>
              <span className="ld-readonly-badge">👁 Read only</span>
            </div>

            {(!lead.notes || lead.notes.length === 0) && (
              <div className="ld-notes__empty">
                <div className="ld-notes__empty-icon">📝</div>
                <p className="ld-notes__empty-title">No notes yet</p>
                <p className="ld-notes__empty-sub">Salesmen write notes when they contact a lead.</p>
              </div>
            )}

            {lead.notes?.length > 0 && (
              <>
                <div className="ld-notes__list">
                  {visibleNotes.map((note, i) => {
                    const isExpanded = expandedNote === i;
                    const isLong     = note.content?.length > NOTE_TRUNCATE;
                    return (
                      <div key={i} className="ld-note-card" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="ld-note-card__header">
                          <span className="ld-note-card__dot" />
                          <span className="ld-note-card__index">
                            Note {lead.notes.length - (visibleNotes.length - 1 - i)}
                          </span>
                          <span className="ld-note-card__time">
                            {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="ld-note-card__body">
                          {isExpanded || !isLong
                            ? note.content
                            : note.content?.slice(0, NOTE_TRUNCATE) + "…"}
                        </p>
                        {isLong && (
                          <button className="ld-link-btn"
                            onClick={() => setExpandedNote(isExpanded ? null : i)}>
                            {isExpanded ? "Show less ↑" : "Read more ↓"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {lead.notes.length > NOTES_PREVIEW && (
                  <button className="ld-notes__toggle"
                    onClick={() => { setNotesExpanded(!notesExpanded); setExpandedNote(null); }}>
                    {notesExpanded
                      ? `↑ Show less (${NOTES_PREVIEW} most recent)`
                      : `↓ Show all ${lead.notes.length} notes`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── EDIT ──────────────────────────────────────────── */}
        {tab === "edit" && (
          <div className="ld-edit">

            <div className="ld-edit__header">
              <h2 className="ld-edit__title">Edit Lead</h2>
              <p className="ld-edit__sub">Update contact information and source.</p>
            </div>

            {saveError && (
              <div className="ld-edit__error">⚠ {saveError}</div>
            )}

            <div className="ld-edit__grid">

              {/* First name */}
              <div className="ld-field">
                <label className="ld-field__label">First name *</label>
                <input className="ld-field__input"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  placeholder="First name"
                  disabled={saving}
                />
              </div>

              {/* Last name */}
              <div className="ld-field">
                <label className="ld-field__label">Last name *</label>
                <input className="ld-field__input"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  placeholder="Last name"
                  disabled={saving}
                />
              </div>

              {/* Email */}
              <div className="ld-field">
                <label className="ld-field__label">Email </label>
                <input className="ld-field__input" type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="email@example.com"
                  disabled={saving}
                />
              </div>

              {/* Phone */}
              <div className="ld-field">
                <label className="ld-field__label">Phone *</label>
                <input className="ld-field__input"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="+216 xx xxx xxx"
                  disabled={saving}
                />
              </div>

              {/* City */}
              <div className="ld-field">
                <label className="ld-field__label">City</label>
                <input className="ld-field__input"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  placeholder="City"
                  disabled={saving}
                />
              </div>

              {/* Country */}
              <div className="ld-field">
                <label className="ld-field__label">Country</label>
                <input className="ld-field__input"
                  value={editData.country}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  placeholder="Country"
                  disabled={saving}
                />
              </div>

              {/* Source */}
              <div className="ld-field ld-field--full">
                <label className="ld-field__label">Source</label>
                <select className="ld-field__input"
                  value={editData.source}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                  disabled={saving}
                >
                  {Object.entries(SOURCE_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Actions */}
            <div className="ld-edit__actions">
              <button className="ld-btn-cancel"
                onClick={() => { setTab("overview"); setSaveError(""); }}
                disabled={saving}>
                Cancel
              </button>
              <button className="ld-btn-save"
                onClick={handleSave}
                disabled={saving || !editData.firstName || !editData.lastName || !editData.phone}
                style={{ opacity: saving ? .65 : 1 }}>
                {saving ? "Saving…" : "💾 Save changes"}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ══════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ══════════════════════════════════════ */}
      {confirmDelete && (
        <div className="ld-modal-overlay" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal__icon">🗑</div>
            <h3 className="ld-modal__title">Delete this lead?</h3>
            <p className="ld-modal__desc">
              <strong>{lead.firstName} {lead.lastName}</strong> will be permanently removed.
              This action cannot be undone.
            </p>
            <div className="ld-modal__actions">
              <button className="ld-btn-cancel"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}>
                Cancel
              </button>
              <button className="ld-btn-delete"
                onClick={handleDelete}
                disabled={deleting}
                style={{ opacity: deleting ? .65 : 1 }}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}