import "../../styles/leads.css";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  fetchLeadById, updateLead, assignLead,
  changeStatus as apiChangeStatus, addNote as apiAddNote,
  fetchSalesmen,
} from "../../api/leadsApi";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import { initials, fullName, fmtDate, fmtTime, av2, acolor } from "../../utils/leadsUtils";
import { Spinner } from "../UI";

export default function LeadPage({ leadId, onClose, onRefresh, showToast }) {
  /* ── lead state ─────────────────────────────────────────────────────────── */
  const [lead,     setLead]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editData, setEditData] = useState(null);
  const [visible,  setVisible]  = useState(false);

  /* ── assign panel state ─────────────────────────────────────────────────── */
  const [assignOpen,    setAssignOpen]    = useState(false);
  const [assignVisible, setAssignVisible] = useState(false);
  const [salesmen,      setSalesmen]      = useState([]);
  const [smLoading,     setSmLoading]     = useState(false);
  const [smSaving,      setSmSaving]      = useState(false);
  const [smSelected,    setSmSelected]    = useState(null);
  const [smQuery,       setSmQuery]       = useState("");
  const smInputRef = useRef(null);

  /* ── load lead ──────────────────────────────────────────────────────────── */
  const loadLead = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLeadById(leadId);
      setLead(data);
      setEditData({
        firstName: data.firstName, lastName: data.lastName,
        email: data.email,         phone: data.phone,
        city: data.city || "",     country: data.country || "",
        status: data.status,       source: data.source,
      });
    } catch (e) { showToast(e.message, "error"); onClose(); }
    finally     { setLoading(false); }
  }, [leadId , onClose, showToast]);

  useEffect(() => { loadLead(); }, [loadLead]);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 20); return () => clearTimeout(t); }, []);

  /* ── open assign panel ──────────────────────────────────────────────────── */
  function openAssign() {
    setSmSelected(lead.assignedTo?._id || null);
    setSmQuery("");
    setAssignOpen(true);
    setSmLoading(true);
    fetchSalesmen()
      .then((res) => setSalesmen(res.data || res))
      .catch(() => setSalesmen([]))
      .finally(() => {
        setSmLoading(false);
        setTimeout(() => {
          setAssignVisible(true);
          setTimeout(() => smInputRef.current?.focus(), 200);
        }, 20);
      });
  }

  function closeAssign() {
    setAssignVisible(false);
    setTimeout(() => { setAssignOpen(false); setSmQuery(""); }, 300);
  }

  async function confirmAssign() {
    setSmSaving(true);
    try {
      await assignLead(lead._id, smSelected || null);
      const updated = await fetchLeadById(lead._id);
      setLead(updated);
      onRefresh();
      showToast(smSelected ? "Lead assigné ✓" : "Assignation retirée");
      closeAssign();
    } catch (e) { showToast(e.message, "error"); }
    finally    { setSmSaving(false); }
  }

  const smList = salesmen.filter(
    (u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(smQuery.toLowerCase())
  );

  /* ── lead actions ───────────────────────────────────────────────────────── */
  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const updated = await apiAddNote(lead._id, noteText.trim());
      setLead(updated.data || updated); setNoteText(""); showToast("Note ajoutée");
    } catch (e) { showToast(e.message, "error"); }
    finally    { setSaving(false); }
  }

  async function handleStatusChange(status) {
    if (status === lead.status) return;
    try {
      setLead(await apiChangeStatus(lead._id, status));
      onRefresh(); showToast(`Statut → ${STATUS_CFG[status].label}`);
    } catch (e) { showToast(e.message, "error"); }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      setLead(await updateLead(lead._id, editData));
      onRefresh(); setTab("overview"); showToast("Lead mis à jour");
    } catch (e) { showToast(e.message, "error"); }
    finally    { setSaving(false); }
  }

  const handleClose = () => { setVisible(false); setTimeout(onClose, 320); };

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="lp-shell">
      <div className="lp-loading"><Spinner size={40} /><span className="lp-loading__text">Chargement…</span></div>
    </div>
  );
  if (!lead) return null;

  const statusCfg   = STATUS_CFG[lead.status]    || STATUS_CFG.New;
  const sourceCfg   = SOURCE_CFG[lead.source]    || SOURCE_CFG.Other;
  const heroColor   = acolor(lead._id);

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className={`lp-shell${visible ? " lp-shell--visible" : ""}`}>
      <div className={`lp-page${visible ? " lp-page--visible" : ""}`}>


        {/* ══════════════  HERO HEADER  ══════════════ */}
        <div className="lp-hero" style={{ "--hero-color": heroColor }}>
          <button className="lp-hero__close" onClick={onClose}>✕</button>

          <div className="lp-hero__blob lp-hero__blob--1" style={{ background: heroColor }} />
          <div className="lp-hero__blob lp-hero__blob--2" style={{ background: heroColor }} />

          <div className="lp-hero__inner">
            <button className="lp-hero__back" onClick={handleClose}>
              <span className="lp-hero__back-arrow">←</span> Retour aux leads
            </button>


            <div className="lp-hero__profile">
              <div className="lp-hero__avatar" style={{ background: heroColor }}>{initials(lead)}</div>

              <div className="lp-hero__identity">
                <div className="lp-hero__name">{lead.firstName} {lead.lastName}</div>
                <div className="lp-hero__meta">{lead.email}</div>
                <div className="lp-hero__meta">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</div>
                <div className="lp-hero__badges">
                  <span className="lp-status-pill" style={{ borderColor: statusCfg.color, color: statusCfg.color }}>
                    <span className="lp-status-pill__dot" style={{ background: statusCfg.color }} />
                    {statusCfg.label}
                  </span>
                  <span className="lp-priority-pill" style={{ color: sourceCfg.color }}>
                    {sourceCfg.icon} {lead.source}
                  </span>
                </div>
              </div>

              {/* assign trigger button */}

              <button className={`lp-btn-assign${assignOpen ? " lp-btn-assign--open" : ""}`} onClick={assignOpen ? closeAssign : openAssign}>

                {lead.assignedTo ? (
                  <>
                    <div className="lp-btn-assign__av" style={{ background: acolor(lead.assignedTo._id) }}>
                      {av2(lead.assignedTo)}
                    </div>
                    <div className="lp-btn-assign__text">
                      <span className="lp-btn-assign__sublabel">Assigné à</span>
                      <span className="lp-btn-assign__name">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
                    </div>
                  </>
                ) : (
                  <>
                  
                    <div className="lp-btn-assign__av lp-btn-assign__av--empty">+</div>
                    <div className="lp-btn-assign__text">
                      <span className="lp-btn-assign__sublabel">Non assigné</span>
                      <span className="lp-btn-assign__name">Choisir un commercial</span>

                    </div>
                  </>
                )}
                <span className={`lp-btn-assign__chevron${assignOpen ? " lp-btn-assign__chevron--open" : ""}`}>›</span>
              </button>
            </div>

            <div className="lp-tabs">
              {[
                { k: "overview", icon: "◈", l: "Vue d'ensemble" },
                { k: "notes",    icon: "✎", l: `Notes${lead.notes?.length ? ` (${lead.notes.length})` : ""}` },
                { k: "edit",     icon: "✦", l: "Modifier" },
              ].map((t) => (
                <button key={t.k} className={`lp-tab${tab === t.k ? " lp-tab--active" : ""}`} onClick={() => setTab(t.k)}>
                  <span className="lp-tab__icon">{t.icon}</span>{t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════  BODY  (content + assign panel side by side)  ══════════════ */}
        <div className="lp-body">

          {/* ── main content ── */}
          <div className={`lp-content${assignOpen ? " lp-content--shrunk" : ""}`}>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="lp-bento">
                <div className="lp-bento__card lp-bento__card--wide">
                  <div className="lp-bento__label">📋 Coordonnées</div>
                  <div className="lp-contacts-grid">
                    {[
                      {   label: "Email",     value: lead.email },
                      {  label: "Téléphone", value: lead.phone },
                      { label: "Ville",     value: lead.city    || "—" },
                      { label: "Pays",      value: lead.country || "—" },
                      { label: "Créé le",   value: fmtDate(lead.createdAt) },
                      { icon: "✎",  label: "Notes",     value: `${lead.notes?.length || 0} note${lead.notes?.length !== 1 ? "s" : ""}` },
                    ].map((row) => (
                      <div key={row.label} className="lp-contact-item">
                        <span className="lp-contact-item__icon">{row.icon}</span>
                        <div>
                          <div className="lp-contact-item__label">{row.label}</div>
                          <div className="lp-contact-item__value">{row.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lp-bento__card">
                  <div className="lp-bento__label">👤 Commercial assigné</div>
                  {lead.assignedTo ? (
                    <div className="lp-agent">
                      <div className="lp-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>{av2(lead.assignedTo)}</div>
                      <div className="lp-agent__info">
                        <div className="lp-agent__name">{fullName(lead.assignedTo)}</div>
                        <div className="lp-agent__role">{lead.assignedTo.role || "Sales Rep"}</div>
                      </div>
                      <button className="lp-btn-sm" onClick={openAssign}>Réassigner</button>
                    </div>
                  ) : (
                    <div className="lp-agent--empty">
                      <div className="lp-agent--empty__icon">?</div>
                      <div>
                        <div className="lp-agent__name" style={{ color: "#ef4444" }}>Non assigné</div>
                        <div className="lp-agent__role">Aucun commercial</div>
                      </div>
                      <button className="lp-btn-primary" onClick={openAssign}>Assigner →</button>
                    </div>
                  )}
                </div>

                <div className="lp-bento__card">
                  <div className="lp-bento__label">⚡ Changer le statut</div>
                  <div className="lp-status-grid">
                    {Object.keys(STATUS_CFG).map((s) => {
                      const active = s === lead.status;
                      const c = STATUS_CFG[s];
                      return (
                        <button key={s}
                          className={`lp-status-btn${active ? " lp-status-btn--active" : ""}`}
                          style={{ borderColor: active ? c.color : "transparent", background: active ? c.light : "var(--lp-surface)", color: active ? c.color : "var(--lp-text-muted)" }}
                          onClick={() => handleStatusChange(s)}>
                          <span className="lp-status-btn__dot" style={{ background: c.dot }} />{c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {lead.notes?.length > 0 && (
                  <div className="lp-bento__card lp-bento__card--accent">
                    <div className="lp-bento__label">✎ Dernière note</div>
                    <p className="lp-note-preview">{lead.notes[lead.notes.length - 1].content}</p>
                    <div className="lp-note-preview__date">
                      {fmtDate(lead.notes[lead.notes.length - 1].createdAt)}
                      <button className="lp-link-btn" onClick={() => setTab("notes")}>Voir tout →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NOTES */}
            {tab === "notes" && (
              <div className="lp-notes-layout">
                <div className="lp-notes-list">
                  {(!lead.notes || lead.notes.length === 0) ? (
                    <div className="lp-notes-empty">
                      <div className="lp-notes-empty__icon">✎</div>
                      <div className="lp-notes-empty__title">Aucune note</div>
                      <div className="lp-notes-empty__hint">Ajoutez la première note ci-dessous.</div>
                    </div>
                  ) : (
                    [...lead.notes].reverse().map((n, i) => (
                      <div key={n._id || i} className="lp-note-card" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="lp-note-card__header">
                          <div className="lp-note-card__dot" />
                          <span className="lp-note-card__time">{fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}</span>
                        </div>
                        <p className="lp-note-card__body">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="lp-note-input-card">
                  <div className="lp-note-input-card__label">Nouvelle note</div>
                  <textarea className="lp-note-input-card__textarea"
                    placeholder="Rédigez une note… (Shift+Entrée pour envoyer)"
                    value={noteText} onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleAddNote(); } }} />
                  <div className="lp-note-input-card__footer">
                    <span className="lp-note-input-card__hint">Shift + Entrée</span>
                    <button className="lp-btn-primary" style={{ opacity: !noteText.trim() || saving ? 0.45 : 1 }}
                      disabled={!noteText.trim() || saving} onClick={handleAddNote}>
                      {saving ? "Envoi…" : "Ajouter"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT */}
            {tab === "edit" && editData && (
              <div className="lp-edit-grid">
                {[
                  { f: "firstName", l: "Prénom",    col: 1 },
                  { f: "lastName",  l: "Nom",        col: 1 },
                  { f: "email",     l: "Email",      col: 2 },
                  { f: "phone",     l: "Téléphone",  col: 2 },
                  { f: "city",      l: "Ville",      col: 1 },
                  { f: "country",   l: "Pays",       col: 1 },
                ].map(({ f, l, col }) => (
                  <div key={f} className={`lp-field${col === 2 ? " lp-field--full" : ""}`}>
                    <label className="lp-field__label">{l}</label>
                    <input className="lp-field__input" value={editData[f] || ""} onChange={(e) => setEditData((p) => ({ ...p, [f]: e.target.value }))} />
                  </div>
                ))}
                <div className="lp-field">
                  <label className="lp-field__label">Statut</label>
                  <select className="lp-field__input" value={editData.status} onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}>
                    {Object.keys(STATUS_CFG).map((s) => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                  </select>
                </div>
                <div className="lp-field">
                  <label className="lp-field__label">Source</label>
                  <select className="lp-field__input" value={editData.source} onChange={(e) => setEditData((p) => ({ ...p, source: e.target.value }))}>
                    {Object.keys(SOURCE_CFG).map((s) => <option key={s} value={s}>{SOURCE_CFG[s].label}</option>)}
                  </select>
                </div>
                <div className="lp-edit-actions">
                  <button className="lp-btn-sm" onClick={() => setTab("overview")}>Annuler</button>
                  <button className="lp-btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSaveEdit}>
                    {saving ? "Enregistrement…" : "Sauvegarder"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════  ASSIGN PANEL  ══════════════ */}
          {assignOpen && (
            <aside className={`lp-assign${assignVisible ? " lp-assign--visible" : ""}`}>

              {/* header */}
              <div className="lp-assign__header">
                <div>
                  <div className="lp-assign__title">Assigner le lead</div>
                  <div className="lp-assign__subtitle">{lead.firstName} {lead.lastName}</div>
                </div>
                <button className="lp-assign__close" onClick={closeAssign} title="Fermer">✕</button>
              </div>

              {/* current assignee chip */}
              {lead.assignedTo && (
                <div className="lp-assign__current">
                  <span className="lp-assign__current-label">Actuellement :</span>
                  <div className="lp-assign__current-chip">
                    <div className="lp-assign__current-av" style={{ background: acolor(lead.assignedTo._id) }}>
                      {av2(lead.assignedTo)}
                    </div>
                    <span>{fullName(lead.assignedTo)}</span>
                  </div>
                </div>
              )}

              {/* search */}
              <div className="lp-assign__search">
                <span className="lp-assign__search-icon">⌕</span>
                <input ref={smInputRef} className="lp-assign__search-input"
                  placeholder="Rechercher…" value={smQuery}
                  onChange={(e) => setSmQuery(e.target.value)} />
                {smQuery && <button className="lp-assign__search-clear" onClick={() => setSmQuery("")}>✕</button>}
              </div>

              {/* list */}
              <div className="lp-assign__list">
                {smLoading ? (
                  <div className="lp-assign__list-loading"><Spinner size={28} /></div>
                ) : (
                  <>
                    {/* unassign option */}
                    <div className={`lp-sm-row lp-sm-row--unassign${smSelected === null ? " lp-sm-row--active" : ""}`}
                      onClick={() => setSmSelected(null)}>
                      <div className="lp-sm-row__av lp-sm-row__av--empty">–</div>
                      <div className="lp-sm-row__info">
                        <div className="lp-sm-row__name">Retirer l'assignation</div>
                        <div className="lp-sm-row__role">Aucun commercial</div>
                      </div>
                      <div className={`lp-sm-row__radio${smSelected === null ? " lp-sm-row__radio--on" : ""}`} />
                    </div>

                    {smList.length > 0 && (
                      <div className="lp-assign__section-label">Commerciaux disponibles</div>
                    )}

                    {smList.map((u, i) => (
                      <div key={u._id}
                        className={`lp-sm-row${smSelected === u._id ? " lp-sm-row--active" : ""}`}
                        style={{ animationDelay: `${i * 25}ms` }}
                        onClick={() => setSmSelected(u._id)}>
                        <div className="lp-sm-row__av" style={{ background: acolor(u._id) }}>{av2(u)}</div>
                        <div className="lp-sm-row__info">
                          <div className="lp-sm-row__name">{u.firstName} {u.lastName}</div>
                          <div className="lp-sm-row__role">{u.role || "Sales Rep"}</div>
                        </div>
                        <div className={`lp-sm-row__radio${smSelected === u._id ? " lp-sm-row__radio--on" : ""}`} />
                      </div>
                    ))}

                    {smList.length === 0 && smQuery && (
                      <div className="lp-assign__empty">Aucun résultat pour « {smQuery} »</div>
                    )}
                  </>
                )}
              </div>

              {/* footer */}
              <div className="lp-assign__footer">
                <button className="lp-btn-sm" onClick={closeAssign}>Annuler</button>
                <button className="lp-btn-primary"
                  style={{ opacity: smSaving ? 0.6 : 1 }}
                  disabled={smSaving || smLoading}
                  onClick={confirmAssign}>
                  {smSaving ? "Assignation…" : "Confirmer"}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
// import "../../styles/LeadPage.css";
// import { useState, useCallback, useEffect } from "react";
// import { fetchLeadById, updateLead, changeStatus as apiChangeStatus, addNote as apiAddNote } from "../../api/leadsApi";
// import { STATUS_CFG, PRIORITY_CFG } from "../../config/leadsConfig";
// import { initials, fullName, fmtDate, fmtTime, av2, acolor } from "../../utils/leadsUtils";
// import { Spinner } from "../UI";

// /* ─────────────────────────────────────────────────────────────────────────────
//    LeadPage  — full-screen page that replaces the side drawer
//    Design: editorial dark-hero + bento-grid content + slide-up animation
// ───────────────────────────────────────────────────────────────────────────── */

// export default function LeadPage({ leadId, onClose, onRefresh, onAssignClick, showToast }) {
//   const [lead,     setLead]     = useState(null);
//   const [loading,  setLoading]  = useState(true);
//   const [tab,      setTab]      = useState("overview");
//   const [noteText, setNoteText] = useState("");
//   const [saving,   setSaving]   = useState(false);
//   const [editData, setEditData] = useState(null);
//   const [visible,  setVisible]  = useState(false);

//   /* ── load ──────────────────────────────────────────────────────────────── */
//   const loadLead = useCallback(async () => {
//     setLoading(true);
//     try {
//       const data = await fetchLeadById(leadId);
//       setLead(data);
//       setEditData({
//         firstName: data.firstName, lastName: data.lastName,
//         email: data.email,         phone: data.phone,
//         city: data.city || "",     country: data.country || "",
//         status: data.status,       priority: data.priority,
//       });
//     } catch (e) { showToast(e.message, "error"); onClose(); }
//     finally     { setLoading(false); }
//   }, [leadId]);

//   useEffect(() => { loadLead(); }, [loadLead]);
//   useEffect(() => { const t = setTimeout(() => setVisible(true), 20); return () => clearTimeout(t); }, []);

//   /* ── actions ───────────────────────────────────────────────────────────── */
//   async function handleAddNote() {
//     if (!noteText.trim()) return;
//     setSaving(true);
//     try {
//       const updated = await apiAddNote(lead._id, noteText.trim());
//       setLead(updated.data || updated); setNoteText(""); showToast("Note ajoutée");
//     } catch (e) { showToast(e.message, "error"); }
//     finally    { setSaving(false); }
//   }

//   async function handleStatusChange(status) {
//     if (status === lead.status) return;
//     try {
//       setLead(await apiChangeStatus(lead._id, status));
//       onRefresh(); showToast(`Statut → ${STATUS_CFG[status].label}`);
//     } catch (e) { showToast(e.message, "error"); }
//   }

//   async function handleSaveEdit() {
//     setSaving(true);
//     try {
//       setLead(await updateLead(lead._id, editData));
//       onRefresh(); setTab("overview"); showToast("Lead mis à jour");
//     } catch (e) { showToast(e.message, "error"); }
//     finally    { setSaving(false); }
//   }

//   const handleClose = () => { setVisible(false); setTimeout(onClose, 320); };

//   /* ── loading screen ────────────────────────────────────────────────────── */
//   if (loading) return (
//     <div className="lp-shell">
//       <div className="lp-loading">
//         <Spinner size={40} />
//         <span className="lp-loading__text">Chargement…</span>
//       </div>
//     </div>
//   );

//   if (!lead) return null;

//   const statusCfg   = STATUS_CFG[lead.status]   || STATUS_CFG.New;
//   const priorityCfg = PRIORITY_CFG[lead.priority] || PRIORITY_CFG.Medium;
//   const heroColor   = acolor(lead._id);

//   /* ── render ────────────────────────────────────────────────────────────── */
//   return (
//     <div className={`lp-shell${visible ? " lp-shell--visible" : ""}`}>
//       <div className={`lp-page${visible ? " lp-page--visible" : ""}`}>

//         {/* ════════════════════════════════════════════════════
//             HERO HEADER
//         ════════════════════════════════════════════════════ */}
//         <div className="lp-hero" style={{ "--hero-color": heroColor }}>
//           {/* background blobs */}
//           <div className="lp-hero__blob lp-hero__blob--1" style={{ background: heroColor }} />
//           <div className="lp-hero__blob lp-hero__blob--2" style={{ background: heroColor }} />

//           <div className="lp-hero__inner">
//             {/* back button */}
//             <button className="lp-hero__back" onClick={handleClose}>
//               <span className="lp-hero__back-arrow">←</span>
//               Retour aux leads
//             </button>

//             <div className="lp-hero__profile">
//               {/* big avatar */}
//               <div className="lp-hero__avatar" style={{ background: heroColor }}>
//                 {initials(lead)}
//               </div>

//               <div className="lp-hero__identity">
//                 <div className="lp-hero__name">{lead.firstName} {lead.lastName}</div>
//                 <div className="lp-hero__meta">{lead.email}</div>
//                 <div className="lp-hero__meta">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</div>

//                 <div className="lp-hero__badges">
//                   {/* status pill */}
//                   <span className="lp-status-pill" style={{ borderColor: statusCfg.color, color: statusCfg.color }}>
//                     <span className="lp-status-pill__dot" style={{ background: statusCfg.color }} />
//                     {statusCfg.label}
//                   </span>
//                   {/* priority pill */}
//                   <span className="lp-priority-pill" style={{ color: priorityCfg.color }}>
//                     {priorityCfg.icon} {lead.priority}
//                   </span>
//                 </div>
//               </div>

//               {/* assign button */}
//               <div className="lp-hero__actions">
//                 <button className="lp-btn-assign" onClick={() => onAssignClick(lead)}>
//                   {lead.assignedTo ? (
//                     <>
//                       <div className="lp-btn-assign__av" style={{ background: acolor(lead.assignedTo._id) }}>
//                         {av2(lead.assignedTo)}
//                       </div>
//                       <span>{lead.assignedTo.firstName}</span>
//                     </>
//                   ) : (
//                     <>
//                       <span className="lp-btn-assign__plus">+</span>
//                       <span>Assigner</span>
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* tab bar */}
//             <div className="lp-tabs">
//               {[
//                 { k: "overview", icon: "◈", l: "Vue d'ensemble" },
//                 { k: "notes",    icon: "✎", l: `Notes${lead.notes?.length ? ` (${lead.notes.length})` : ""}` },
//                 { k: "edit",     icon: "✦", l: "Modifier" },
//               ].map((t) => (
//                 <button
//                   key={t.k}
//                   className={`lp-tab${tab === t.k ? " lp-tab--active" : ""}`}
//                   onClick={() => setTab(t.k)}
//                 >
//                   <span className="lp-tab__icon">{t.icon}</span>
//                   {t.l}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* ════════════════════════════════════════════════════
//             CONTENT
//         ════════════════════════════════════════════════════ */}
//         <div className="lp-content">

//           {/* ── OVERVIEW ────────────────────────────────────── */}
//           {tab === "overview" && (
//             <div className="lp-bento">

//               {/* Bento: contact info */}
//               <div className="lp-bento__card lp-bento__card--wide">
//                 <div className="lp-bento__label">📋 Coordonnées</div>
//                 <div className="lp-contacts-grid">
//                   {[
//                     { icon: "✉", label: "Email",   value: lead.email },
//                     { icon: "📞", label: "Téléphone", value: lead.phone },
//                     { icon: "🏙", label: "Ville",   value: lead.city    || "—" },
//                     { icon: "🌍", label: "Pays",    value: lead.country || "—" },
//                     { icon: "📅", label: "Créé le", value: fmtDate(lead.createdAt) },
//                     { icon: "✎", label: "Notes",   value: `${lead.notes?.length || 0} note${lead.notes?.length !== 1 ? "s" : ""}` },
//                   ].map((row) => (
//                     <div key={row.label} className="lp-contact-item">
//                       <span className="lp-contact-item__icon">{row.icon}</span>
//                       <div>
//                         <div className="lp-contact-item__label">{row.label}</div>
//                         <div className="lp-contact-item__value">{row.value}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Bento: assignment */}
//               <div className="lp-bento__card">
//                 <div className="lp-bento__label">👤 Commercial assigné</div>
//                 {lead.assignedTo ? (
//                   <div className="lp-agent">
//                     <div className="lp-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>
//                       {av2(lead.assignedTo)}
//                     </div>
//                     <div className="lp-agent__info">
//                       <div className="lp-agent__name">{fullName(lead.assignedTo)}</div>
//                       <div className="lp-agent__role">{lead.assignedTo.role || "Sales Rep"}</div>
//                     </div>
//                     <button className="lp-btn-sm" onClick={() => onAssignClick(lead)}>Réassigner</button>
//                   </div>
//                 ) : (
//                   <div className="lp-agent--empty">
//                     <div className="lp-agent--empty__icon">?</div>
//                     <div>
//                       <div className="lp-agent__name" style={{ color: "#ef4444" }}>Non assigné</div>
//                       <div className="lp-agent__role">Aucun commercial</div>
//                     </div>
//                     <button className="lp-btn-primary" onClick={() => onAssignClick(lead)}>Assigner →</button>
//                   </div>
//                 )}
//               </div>

//               {/* Bento: quick status */}
//               <div className="lp-bento__card">
//                 <div className="lp-bento__label">⚡ Changer le statut</div>
//                 <div className="lp-status-grid">
//                   {Object.keys(STATUS_CFG).map((s) => {
//                     const active = s === lead.status;
//                     const c = STATUS_CFG[s];
//                     return (
//                       <button
//                         key={s}
//                         className={`lp-status-btn${active ? " lp-status-btn--active" : ""}`}
//                         style={{
//                           "--s-color": c.color,
//                           "--s-light": c.light,
//                           borderColor: active ? c.color : "transparent",
//                           background:  active ? c.light : "var(--lp-surface)",
//                           color:       active ? c.color : "var(--lp-text-muted)",
//                         }}
//                         onClick={() => handleStatusChange(s)}
//                       >
//                         <span className="lp-status-btn__dot" style={{ background: c.dot }} />
//                         {c.label}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>

//               {/* Bento: latest note */}
//               {lead.notes?.length > 0 && (
//                 <div className="lp-bento__card lp-bento__card--accent">
//                   <div className="lp-bento__label">✎ Dernière note</div>
//                   <p className="lp-note-preview">{lead.notes[lead.notes.length - 1].content}</p>
//                   <div className="lp-note-preview__date">
//                     {fmtDate(lead.notes[lead.notes.length - 1].createdAt)}
//                     <button className="lp-link-btn" onClick={() => setTab("notes")}>Voir tout →</button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* ── NOTES ───────────────────────────────────────── */}
//           {tab === "notes" && (
//             <div className="lp-notes-layout">
//               <div className="lp-notes-list">
//                 {(!lead.notes || lead.notes.length === 0) ? (
//                   <div className="lp-notes-empty">
//                     <div className="lp-notes-empty__icon">✎</div>
//                     <div className="lp-notes-empty__title">Aucune note</div>
//                     <div className="lp-notes-empty__hint">Ajoutez la première note ci-dessous.</div>
//                   </div>
//                 ) : (
//                   [...lead.notes].reverse().map((n, i) => (
//                     <div key={n._id || i} className="lp-note-card" style={{ animationDelay: `${i * 40}ms` }}>
//                       <div className="lp-note-card__header">
//                         <div className="lp-note-card__dot" />
//                         <span className="lp-note-card__time">{fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}</span>
//                       </div>
//                       <p className="lp-note-card__body">{n.content}</p>
//                     </div>
//                   ))
//                 )}
//               </div>

//               <div className="lp-note-input-card">
//                 <div className="lp-note-input-card__label">Nouvelle note</div>
//                 <textarea
//                   className="lp-note-input-card__textarea"
//                   placeholder="Rédigez une note… (Shift+Entrée pour envoyer)"
//                   value={noteText}
//                   onChange={(e) => setNoteText(e.target.value)}
//                   onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
//                 />
//                 <div className="lp-note-input-card__footer">
//                   <span className="lp-note-input-card__hint">Shift + Entrée</span>
//                   <button
//                     className="lp-btn-primary"
//                     style={{ opacity: !noteText.trim() || saving ? 0.45 : 1 }}
//                     disabled={!noteText.trim() || saving}
//                     onClick={handleAddNote}
//                   >
//                     {saving ? "Envoi…" : "Ajouter"}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ── EDIT ────────────────────────────────────────── */}
//           {tab === "edit" && editData && (
//             <div className="lp-edit-grid">
//               {[
//                 { f: "firstName", l: "Prénom",     col: 1 },
//                 { f: "lastName",  l: "Nom",         col: 1 },
//                 { f: "email",     l: "Email",       col: 2 },
//                 { f: "phone",     l: "Téléphone",   col: 2 },
//                 { f: "city",      l: "Ville",       col: 1 },
//                 { f: "country",   l: "Pays",        col: 1 },
//               ].map(({ f, l, col }) => (
//                 <div key={f} className={`lp-field${col === 2 ? " lp-field--full" : ""}`}>
//                   <label className="lp-field__label">{l}</label>
//                   <input
//                     className="lp-field__input"
//                     value={editData[f] || ""}
//                     onChange={(e) => setEditData((p) => ({ ...p, [f]: e.target.value }))}
//                   />
//                 </div>
//               ))}

//               <div className="lp-field">
//                 <label className="lp-field__label">Statut</label>
//                 <select className="lp-field__input" value={editData.status} onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}>
//                   {Object.keys(STATUS_CFG).map((s) => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
//                 </select>
//               </div>

//               <div className="lp-field">
//                 <label className="lp-field__label">Priorité</label>
//                 <select className="lp-field__input" value={editData.priority} onChange={(e) => setEditData((p) => ({ ...p, priority: e.target.value }))}>
//                   {Object.keys(PRIORITY_CFG).map((p) => <option key={p} value={p}>{p}</option>)}
//                 </select>
//               </div>

//               <div className="lp-edit-actions">
//                 <button className="lp-btn-sm" onClick={() => setTab("overview")}>Annuler</button>
//                 <button
//                   className="lp-btn-primary"
//                   style={{ opacity: saving ? 0.6 : 1 }}
//                   disabled={saving}
//                   onClick={handleSaveEdit}
//                 >
//                   {saving ? "Enregistrement…" : "Sauvegarder"}
//                 </button>
//               </div>
//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// }
