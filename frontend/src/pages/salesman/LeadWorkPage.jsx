import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchLeadById, changeStatus as apiChangeStatus, addNote as apiAddNote } from "../../api/leadsApi";
import { emitLeadUpdate, onLeadUpdate } from "../../utils/leadEvents";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import { fmtDate, fmtTime, acolor,  } from "../../utils/leadsUtils";
import { Spinner } from "../../components/UI";
import "../../styles/leads.css";
import "../../styles/SalesmanLeads.css";

const POLL_MS = 30_000;

export default function LeadWorkPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab,          setTab]          = useState(searchParams.get("tab") || "overview");
  const [lead,         setLead]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [noteText,     setNoteText]     = useState("");
  const [noteSaving,   setNoteSaving]   = useState(false);
  const [noteError,    setNoteError]    = useState("");
  const [toast,        setToast]        = useState(null);
  const noteRef = useRef(null);
  const loadRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── loader ───────────────────────────────────────────────────────────── */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setLead(await fetchLeadById(id)); }
    catch (e) { setError(e?.response?.data?.message || e.message || "Failed to load"); }
    finally   { if (!silent) setLoading(false); }
  }, [id]);

  // Keep ref updated with latest callback
  loadRef.current = load;

  useEffect(() => { load(); }, [load]);

  /* ── listen to ANY lead update → reload silently ────────────────────── */
  useEffect(() => {
    const unsub = onLeadUpdate(() => {
      if (loadRef.current) loadRef.current(true);
    });
    return unsub;
  }, []);

  /* ── poll every 30s ──────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (tab === "notes") setTimeout(() => noteRef.current?.focus(), 100);
  }, [tab]);

  /* ── status change ────────────────────────────────────────────────────── */
  async function handleStatusChange(newStatus) {
    if (newStatus === lead.status || statusSaving) return;
    setStatusSaving(true);
    try {
      await apiChangeStatus(lead._id, newStatus);
      emitLeadUpdate(); // ✅ triggers reload everywhere
      showToast(`Status → ${STATUS_CFG[newStatus]?.label}`);
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to update status", "error");
    } finally { setStatusSaving(false); }
  }

  /* ── add note ─────────────────────────────────────────────────────────── */
  async function handleAddNote() {
    if (!noteText.trim()) { setNoteError("Note cannot be empty."); return; }
    setNoteSaving(true); setNoteError("");
    try {
      await apiAddNote(lead._id, noteText.trim());
      setNoteText("");
      emitLeadUpdate(); // ✅ triggers reload everywhere
      showToast("Note added ✓");
    } catch (e) {
      setNoteError(e?.response?.data?.message || "Failed to add note");
    } finally { setNoteSaving(false); }
  }

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const heroColor = lead ? acolor(lead._id) : "#10b981";
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
              <div className="lw-hero__id">{lead.leadNumber || ""}</div>
              <h1 className="lw-hero__name">{lead.firstName} {lead.lastName}</h1>
              <div className="lw-hero__meta">{lead.email} · {lead.phone}</div>
              {lead.city && <div className="lw-hero__meta">📍 {lead.city}{lead.country ? `, ${lead.country}` : ""}</div>}
              <div className="lw-hero__badges">
                <span className="lw-pill" style={{ borderColor: sourceCfg.color + "66", color: sourceCfg.color }}>
                  {sourceCfg.icon} {sourceCfg.label}
                </span>
                <span className="lw-pill lw-pill--notes">✎ {lead.notes?.length || 0} note(s)</span>
              </div>
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
              <div>
                <h2 className="lw-notes__title">Notes</h2>
                <p className="lw-notes__sub">{lead.notes?.length ? `${lead.notes.length} note(s)` : "No notes yet"}</p>
              </div>
            </div>

            <div className="lw-note-form">
              <div className="lw-note-form__label">✎ Add a note</div>
              <textarea ref={noteRef} className="lw-note-textarea"
                placeholder="Write your note here…"
                value={noteText} rows={4} disabled={noteSaving}
                onChange={(e) => { setNoteText(e.target.value); setNoteError(""); }} />
              {noteError && <p className="lw-note-error">{noteError}</p>}
              <div className="lw-note-form__footer">
                <span className="lw-note-form__chars">{noteText.length} chars</span>
                <button className="lw-btn-add-note" onClick={handleAddNote}
                  disabled={noteSaving || !noteText.trim()} style={{ opacity: noteSaving ? .65 : 1 }}>
                  {noteSaving ? "Saving…" : "✎ Add note"}
                </button>
              </div>
            </div>

            {(!lead.notes || lead.notes.length === 0) && (
              <div className="lw-notes__empty">
                <div className="lw-notes__empty-icon">📝</div>
                <p className="lw-notes__empty-title">No notes yet</p>
                <p className="lw-notes__empty-sub">Write your first note above.</p>
              </div>
            )}

            {lead.notes?.length > 0 && (
              <div className="lw-notes__list">
                {[...lead.notes].reverse().map((note, i) => (
                  <div key={i} className="lw-note-card" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="lw-note-card__header">
                      <span className="lw-note-card__dot" />
                      <span className="lw-note-card__num">Note {lead.notes.length - i}</span>
                      <span className="lw-note-card__time">{fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}</span>
                    </div>
                    <p className="lw-note-card__body">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
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