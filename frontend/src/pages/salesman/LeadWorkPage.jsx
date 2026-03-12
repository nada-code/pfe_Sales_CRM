import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import {
  fetchLeadById,
  updateLead,
  changeStatus as apiChangeStatus,
  addNote as apiAddNote,
} from "../../api/leadsApi";
import { useSocket } from "../../context/SocketContext";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import { fmtDate, fmtTime, acolor } from "../../utils/leadsUtils";
import { Spinner } from "../../components/UI";
import "../../styles/leads.css";
import "../../styles/SalesmanLeads.css";




export default function LeadWorkPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const socket         = useSocket();

  const [tab,          setTab]          = useState(searchParams.get("tab") || "overview");
  const [lead,         setLead]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [noteText,     setNoteText]     = useState("");
  const [noteSaving,   setNoteSaving]   = useState(false);
  const [noteError,    setNoteError]    = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNote,  setExpandedNote]  = useState(null);

  const [toast,        setToast]        = useState(null);

  // Edit tab state
  const [editData,  setEditData]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");


  const noteRef = useRef(null);
const NOTES_PREVIEW = 2;
const NOTE_TRUNCATE = 120;
const visibleNotes = lead?.notes
    ? notesExpanded ? lead.notes : lead.notes.slice(-NOTES_PREVIEW)
    : [];
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Loader ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchLeadById(id);
      setLead(data);
      setEditData({
        firstName: data.firstName || "",
        lastName:  data.lastName  || "",
        email:     data.email     || "",
        phone:     data.phone     || "",
        city:      data.city      || "",
        country:   data.country   || "",
        source:    data.source    || "Other",
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Socket: update this lead in real-time ────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (updatedLead) => {
      if (updatedLead._id === id) {
        setLead(updatedLead);
        setEditData({
          firstName: updatedLead.firstName || "",
          lastName:  updatedLead.lastName  || "",
          email:     updatedLead.email     || "",
          phone:     updatedLead.phone     || "",
          city:      updatedLead.city      || "",
          country:   updatedLead.country   || "",
          source:    updatedLead.source    || "Other",
        });
      }
    };
    socket.on("lead:updated", handler);
    return () => socket.off("lead:updated", handler);
  }, [socket, id]);

  useEffect(() => {
    if (tab === "notes") setTimeout(() => noteRef.current?.focus(), 100);
    if (tab !== "edit")  setSaveError("");
  }, [tab]);

  // ── Status change ──────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus) {
    if (newStatus === lead.status || statusSaving) return;
    setStatusSaving(true);
    try {
      await apiChangeStatus(lead._id, newStatus);
      showToast(`Status → ${STATUS_CFG[newStatus]?.label}`);
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to update status", "error");
    } finally { setStatusSaving(false); }
  }

  // ── Add note ───────────────────────────────────────────────────────────────
  async function handleAddNote() {
    if (!noteText.trim()) { setNoteError("Note cannot be empty."); return; }
    setNoteSaving(true); setNoteError("");
    try {
      await apiAddNote(lead._id, noteText.trim());
      setNoteText("");
      showToast("Note added ✓");
    } catch (e) {
      setNoteError(e?.response?.data?.message || "Failed to add note");
    } finally { setNoteSaving(false); }
  }

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editData.firstName || !editData.lastName || !editData.email) {
      setSaveError("First name, last name and email are required.");
      return;
    }
    setSaving(true); setSaveError("");
    try {
      // Server will broadcast lead:updated via socket — state updates automatically
      await updateLead(lead._id, editData);
      setTab("overview");
      showToast("Lead updated ✓");
    } catch (e) {
      setSaveError(e?.response?.data?.message || "Failed to save changes");
    } finally { setSaving(false); }
  }

  const heroColor = lead ? acolor(lead._id)                          : '#10b981';
  const statusCfg = lead ? (STATUS_CFG[lead.status] || STATUS_CFG.New)   : null;
  const sourceCfg = lead ? (SOURCE_CFG[lead.source] || SOURCE_CFG.Other) : null;

  if (loading) return <div className="ld-loading"><Spinner size={36} /><span>Loading lead…</span></div>;
  if (error)   return (
    <div className="ld-error">
      <span className="ld-error__icon">⚠</span><p>{error}</p>
      <button className="btn-primary" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );
  if (!lead) return null;

  return (
    <div className="lw-root">

      {/* ══════════ HERO ══════════ */}
      <div className="lw-hero" style={{ "--hero": heroColor }}>
        <div className="lw-hero__blob lw-hero__blob--1" style={{ background: heroColor }} />
        <div className="lw-hero__blob lw-hero__blob--2" style={{ background: heroColor }} />
        <div className="lw-hero__inner">
          <button className="lw-hero__back" onClick={() => navigate(-1)}>← My Leads</button>

          <div className="lw-hero__profile">
            <div className="lw-hero__avatar" style={{ background: heroColor }}>
              {`${lead.firstName?.[0]||""}${lead.lastName?.[0]||""}`.toUpperCase()}
            </div>
            <div className="lw-hero__identity">
              <div className="lw-hero__id">{lead._id?.slice(-6).toUpperCase() || "—"}</div>
              <h1 className="lw-hero__name">{lead.firstName} {lead.lastName}</h1>
              <div className="lw-hero__meta">{lead.email} · {lead.phone}</div>
              {lead.city && <div className="lw-hero__meta">📍 {lead.city}{lead.country ? `, ${lead.country}` : ""}</div>}
              <div className="lw-hero__badges">
                <span className="lw-pill" style={{ color: statusCfg.color, borderColor: statusCfg.color + "55", background: statusCfg.light + "22" }}>
                  {statusCfg.label}
                </span>
                <span className="lw-pill lw-pill--notes">
                  {sourceCfg?.icon} {sourceCfg?.label}
                </span>  </div>
            </div>

            {/* Status panel */}
            <div className="lw-hero__status-panel">
              <div className="lw-hero__status-label">Current Status</div>
              <div className="lw-hero__status-badge" style={{ background: statusCfg.light, borderColor: statusCfg.color + "55" }}>
                <span className="lw-hero__status-dot" style={{ background: statusCfg.color }} />
                <span style={{ color: statusCfg.color, fontWeight: 800 }}>{statusCfg.label}</span>
              </div>
              <div className="lw-hero__status-label" style={{ marginTop: 10 }}>Change to</div>
              <div className="lw-status-grid">
                {Object.entries(STATUS_CFG).map(([k, v]) => {
                  const active = lead.status === k;
                  return (
                    <button key={k}
                      className={`lw-status-btn${active ? " lw-status-btn--active" : ""}`}
                      style={{
                        borderColor: active ? v.color : "transparent",
                        background:  active ? v.light : "rgba(255,255,255,.06)",
                        color:       active ? v.color : "rgba(240,246,252,.6)",
                      }}
                      disabled={statusSaving}
                      onClick={() => handleStatusChange(k)}>
                      <span className="lw-status-btn__dot" style={{ background: v.color }} />
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lw-tabs">
            {[
              { k: "overview", icon: "◈", label: "Overview" },
              { k: "notes",    icon: "✎", label: `Notes (${lead.notes?.length || 0})` },
              { k: "edit",     icon: "✦", label: "Edit" },

            ].map((t) => (
              <button key={t.k} className={`lw-tab${tab === t.k ? " lw-tab--active" : ""}`}
                onClick={() => setTab(t.k)}>
                <span className="lw-tab__icon">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="lw-content">

        {tab === "overview" && (
          <div className="lw-bento">
            <div className="lw-card lw-card--wide">
              <div className="lw-card__label">📋 Contact details</div>
              <div className="lw-contacts-grid">
                {[
                  { icon: "✉",  label: "Email",   value: lead.email },
                  { icon: "📞", label: "Phone",   value: lead.phone   || "—" },
                  { icon: "🏙", label: "City",    value: lead.city    || "—" },
                  { icon: "🌍", label: "Country", value: lead.country || "—" },
                  { icon: "📅", label: "Created", value: fmtDate(lead.createdAt) },
                  { icon: "🔄", label: "Updated", value: fmtDate(lead.updatedAt) },
                ].map((row) => (
                  <div key={row.label} className="lw-contact-item">
                    <span className="lw-contact-item__icon">{row.icon}</span>
                    <div>
                      <div className="lw-contact-item__label">{row.label}</div>
                      <div className="lw-contact-item__value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lw-card lw-card--accent">
              <div className="lw-card__label">✎ Quick note</div>
              <textarea className="lw-quick-textarea" placeholder="Type a quick note…"
                value={noteText} rows={3} disabled={noteSaving}
                onChange={(e) => { setNoteText(e.target.value); setNoteError(""); }} />
              {noteError && <p className="lw-note-error">{noteError}</p>}
              <button className="lw-btn-add-note" onClick={handleAddNote}
                disabled={noteSaving || !noteText.trim()} style={{ opacity: noteSaving ? .65 : 1 }}>
                {noteSaving ? "Saving…" : "✎ Save note"}
              </button>
            </div>

            {lead.notes?.length > 0 && (
              <div className="lw-card">
                <div className="lw-card__label">📌 Last note</div>
                <p className="lw-note-preview-text">
                  {lead.notes[lead.notes.length - 1].content?.slice(0, 160)}
                  {lead.notes[lead.notes.length - 1].content?.length > 160 && "…"}
                </p>
                <div className="lw-note-preview-footer">
                  <span className="lw-note-preview-date">
                    {fmtDate(lead.notes[lead.notes.length - 1].createdAt)} · {fmtTime(lead.notes[lead.notes.length - 1].createdAt)}
                  </span>
                  <button className="lw-link-btn" onClick={() => setTab("notes")}>
                    See all {lead.notes.length} →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="lw-notes">
            <div className="lw-notes__header">
              <div className="lw-notes__title-block">
                <p className="lw-notes__eyebrow">Lead activity</p>
                <h2 className="lw-notes__title">Notes</h2>
                <p className="lw-notes__sub">
                  {lead.notes?.length
                    ? `${lead.notes.length} note${lead.notes.length > 1 ? 's' : ''} on this lead`
                    : "No notes yet"}
                </p>
              </div>
            </div>

            {/* ── Add note form ── */}
            <div className="lw-note-form">
              <div className="lw-note-form__label">💬 Add a note</div>
              <textarea ref={noteRef} className="lw-note-textarea"
                placeholder="Write your observations, follow-up details, or any relevant info…"
                value={noteText} rows={4} disabled={noteSaving}
                onChange={(e) => { setNoteText(e.target.value); setNoteError(""); }} />
              {noteError && <p className="lw-note-error">⚠ {noteError}</p>}
              <div className="lw-note-form__footer">
                <span className="lw-note-form__chars">{noteText.length} chars</span>
                <button className="lw-btn-add-note" onClick={handleAddNote}
                  disabled={noteSaving || !noteText.trim()}>
                  {noteSaving ? "Saving…" : "✎ Save note"}
                </button>
              </div>
            </div>

            {(!lead.notes || lead.notes.length === 0) && (
              <div className="lw-notes__empty">
                <div className="lw-notes__empty-icon">📝</div>
                <p className="lw-notes__empty-title">No notes yet</p>
                <p className="lw-notes__empty-sub">Write your first note using the form above.</p>
              </div>
            )}

             {lead.notes?.length > 0 && (
                          <>
                            <div className="ld-timeline">
                             {visibleNotes.map((note, i) => {
                                const isExp  = expandedNote === i;
                                const isLong = note.content?.length > NOTE_TRUNCATE;
                                const noteNum = lead.notes.length - (visibleNotes.length - 1 - i);
                                return (
                                  <div key={i} className="ld-note-entry" style={{ animationDelay: `${i * 60}ms` }}>
                                    <span className="ld-note-entry__dot" />
                                    <div className="ld-note-entry__card">
                                      <div className="ld-note-entry__header">
                                        <span className="ld-note-entry__num">Note #{noteNum}</span>
                                        <span className="ld-note-entry__date">
                                          <span className="ld-note-entry__date-icon">📅</span>
                                          {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                                        </span>
                                      </div>
                                      <p className="ld-note-entry__body">
                                        {isExp || !isLong
                                          ? note.content
                                          : note.content?.slice(0, NOTE_TRUNCATE) + "…"}
                                      </p>
                                      {isLong && (
                                        <button className="ld-note-entry__expand"
                                          onClick={() => setExpandedNote(isExp ? null : i)}>
                                          {isExp ? "↑ Show less" : "↓ Read more"}
                                        </button>
                                      )}
                                    </div>
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
{/* ── Edit tab ── */}
        {tab === "edit" && (
          <div className="ld-edit">
            <div className="ld-edit__header">
              <h2 className="ld-edit__title">Edit Lead</h2>
              <p className="ld-edit__sub">Update contact information for this lead.</p>
            </div>

            {saveError && <div className="ld-edit__error">⚠ {saveError}</div>}

            <div className="ld-edit__grid">
              {[
                { f: "firstName", l: "First name *", p: "First name" },
                { f: "lastName",  l: "Last name *",  p: "Last name"  },
                { f: "email",     l: "Email *",      p: "email@example.com", t: "email" },
                { f: "phone",     l: "Phone",        p: "+216 xx xxx xxx" },
                { f: "city",      l: "City",         p: "City"    },
                { f: "country",   l: "Country",      p: "Country" },
              ].map(({ f, l, p, t }) => (
                <div key={f} className="ld-field">
                  <label className="ld-field__label">{l}</label>
                  <input
                    className="ld-field__input"
                    type={t || "text"}
                    value={editData[f]}
                    placeholder={p}
                    disabled={saving}
                    onChange={(e) => setEditData({ ...editData, [f]: e.target.value })}
                  />
                </div>
              ))}

              <div className="ld-field ld-field--full">
                <label className="ld-field__label">Source</label>
                <select
                  className="ld-field__input"
                  value={editData.source}
                  disabled={saving}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                >
                  {Object.entries(SOURCE_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ld-edit__actions">
              <button
                className="ld-btn-cancel"
                onClick={() => { setTab("overview"); setSaveError(""); }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="ld-btn-save"
                onClick={handleSaveEdit}
                disabled={saving || !editData?.firstName || !editData?.lastName || !editData?.email}
              >
                {saving ? "Saving…" : "✓ Save changes"}
              </button>
            </div>
          </div>
        )}
        {tab === "history" && (
          <div className="lw-history">
            <div className="lw-history__header">
              <div>
                <h2 className="lw-history__title">History</h2>
                <p className="lw-history__sub">View the history of this lead.</p>
              </div>
            </div>

            <div className="lw-history__list">
              {lead.history?.map((h, i) => (
                <div key={i} className="lw-history-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="lw-history-item__header">
                    <span className="lw-history-item__dot" />
                    <span className="lw-history-item__time">{fmtDate(h.createdAt)} · {fmtTime(h.createdAt)}</span>
                  </div>
                  <p className="lw-history-item__body">{h.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`lw-toast lw-toast--${toast.type}`}>
          {toast.type === "success" ? "✓" : "⚠"} {toast.msg}
        </div>
      )}
    </div>
  );
}