import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchLeadById, updateLead,
  changeStatus as apiChangeStatus,
  addNote as apiAddNote,
} from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { STATUS_CFG, SOURCE_CFG } from '../../config/leadsConfig';
import { fmtDate, fmtTime, acolor } from '../../utils/leadsUtils';
import { Spinner } from '../../components/UI';
import {
  ArrowLeft, FileText, Edit3, MessageSquare, Save, X,
  Clock, MapPin, RefreshCw, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import '../../styles/LeadDetailShared.css';

const NOTES_PREVIEW = 3;
const NOTE_TRUNCATE = 140;

const EDITABLE_FIELDS = [
  { f: 'firstName', l: 'Prénom *',    p: 'Prénom',        t: 'text'  },
  { f: 'lastName',  l: 'Nom *',       p: 'Nom',           t: 'text'  },
  { f: 'email',     l: 'Email',       p: 'email@ex.com',  t: 'email' },
  { f: 'phone',     l: 'Téléphone *', p: '+216 xx xxx xxx', t: 'tel' },
  { f: 'city',      l: 'Ville',       p: 'Ville',         t: 'text'  },
  { f: 'country',   l: 'Pays',        p: 'Pays',          t: 'text'  },
];

export default function LeadWorkPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const socket         = useSocket();

  const [tab,           setTab]           = useState(searchParams.get('tab') || 'overview');
  const [lead,          setLead]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Status
  const [statusSaving, setStatusSaving] = useState(false);

  // Notes
  const [noteText,      setNoteText]      = useState('');
  const [noteSaving,    setNoteSaving]    = useState(false);
  const [noteError,     setNoteError]     = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNote,  setExpandedNote]  = useState(null);
  const noteRef = useRef(null);

  // Edit
  const [editData,  setEditData]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk,    setSaveOk]    = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchLeadById(id);
      setLead(data);
      setEditData({
        firstName: data.firstName || '',
        lastName:  data.lastName  || '',
        email:     data.email     || '',
        phone:     data.phone     || '',
        city:      data.city      || '',
        country:   data.country   || '',
        source:    data.source    || 'Other',
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = (u) => {
      if (String(u._id) === id) {
        setLead(u);
        setEditData({
          firstName: u.firstName || '', lastName: u.lastName  || '',
          email:     u.email     || '', phone:    u.phone     || '',
          city:      u.city      || '', country:  u.country   || '',
          source:    u.source    || 'Other',
        });
      }
    };
    socket.on('lead:updated', handler);
    return () => socket.off('lead:updated', handler);
  }, [socket, id]);

  useEffect(() => {
    if (tab === 'notes') setTimeout(() => noteRef.current?.focus(), 100);
    if (tab !== 'edit')  setSaveError('');
  }, [tab]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus) {
    if (newStatus === lead.status || statusSaving) return;
    setStatusSaving(true);
    try {
      await apiChangeStatus(lead._id, newStatus);
      showToast(`Statut → ${STATUS_CFG[newStatus]?.label}`);
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur', 'error');
    } finally { setStatusSaving(false); }
  }

  async function handleAddNote() {
    if (!noteText.trim()) { setNoteError('La note ne peut pas être vide.'); return; }
    setNoteSaving(true); setNoteError('');
    try {
      await apiAddNote(lead._id, noteText.trim());
      setNoteText('');
      showToast('Note ajoutée ✓');
      load(true);
    } catch (e) {
      setNoteError(e?.response?.data?.message || 'Erreur');
    } finally { setNoteSaving(false); }
  }

  async function handleSaveEdit() {
    if (!editData.firstName || !editData.lastName || !editData.phone) {
      setSaveError('Prénom, nom et téléphone sont requis.');
      return;
    }
    setSaving(true); setSaveError(''); setSaveOk('');
    try {
      await updateLead(lead._id, editData);
      setSaveOk('✓ Informations mises à jour');
      setTimeout(() => setSaveOk(''), 4000);
      showToast('Lead mis à jour ✓');
    } catch (e) {
      setSaveError(e?.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="ldsh-loading"><Spinner size={32}/><span>Chargement…</span></div>;
  if (error)   return (
    <div className="ldsh-error">
      <span>⚠</span><p>{error}</p>
      <button className="ldsh-btn ldsh-btn--ghost" onClick={() => navigate(-1)}>← Retour</button>
    </div>
  );
  if (!lead) return null;

  const heroColor = acolor(lead._id);
  const statusCfg = STATUS_CFG[lead.status] || STATUS_CFG.New;
  const sourceCfg = SOURCE_CFG[lead.source] || SOURCE_CFG.Other;
  const visibleNotes = notesExpanded ? lead.notes : (lead.notes?.slice(-NOTES_PREVIEW) || []);

  const TABS = [
    { k: 'overview', label: 'Aperçu',   icon: <FileText size={13}/> },
    { k: 'notes',    label: `Notes (${lead.notes?.length || 0})`, icon: <MessageSquare size={13}/> },
    { k: 'edit',     label: 'Modifier', icon: <Edit3 size={13}/> },
  ];

  return (
    <div className="ldsh-root">

      {/* ── Hero ── */}
      <div className="ldsh-hero" style={{ '--hero': heroColor }}>
        <div className="ldsh-hero__blob" style={{ background: heroColor }}/>
        <div className="ldsh-hero__inner">

          <button className="ldsh-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={14}/> Mes leads
          </button>

          <div className="ldsh-profile">
            <div className="ldsh-avatar" style={{ background: heroColor }}>
              {`${lead.firstName?.[0]||''}${lead.lastName?.[0]||''}`.toUpperCase()}
            </div>

            <div className="ldsh-identity">
              <div className="ldsh-id">#{String(lead._id).slice(-6).toUpperCase()}</div>
              <h1 className="ldsh-name">{lead.firstName} {lead.lastName}</h1>
              <div className="ldsh-meta">{lead.email} · {lead.phone}</div>
              {lead.city && (
                <div className="ldsh-meta"><MapPin size={11}/> {lead.city}{lead.country ? `, ${lead.country}` : ''}</div>
              )}
              <div className="ldsh-badges">
                <span className="ldsh-badge"
                  style={{ background: statusCfg.light + '33', color: statusCfg.color, borderColor: statusCfg.color + '55' }}>
                  <span className="ldsh-badge__dot" style={{ background: statusCfg.color }}/>
                  {statusCfg.label}
                </span>
                <span className="ldsh-badge ldsh-badge--source">
                  {sourceCfg.icon} {sourceCfg.label}
                </span>
              </div>
            </div>

            {/* Status changer — salesman only */}
            <div className="ldsh-status-panel">
              <div className="ldsh-status-panel__label">Changer le statut</div>
              <div className="ldsh-status-grid">
                {Object.entries(STATUS_CFG).map(([k, v]) => {
                  const active = lead.status === k;
                  return (
                    <button key={k}
                      className={`ldsh-status-btn${active ? ' active' : ''}`}
                      style={{
                        borderColor: active ? v.color        : 'rgba(255,255,255,.1)',
                        background:  active ? v.light + '33' : 'rgba(255, 255, 255, 0.63)',
                        color:       active ? v.color        : 'rgba(8, 8, 8, 0.65)',
                      }}
                      disabled={statusSaving}
                      onClick={() => handleStatusChange(k)}>
                      <span className="ldsh-status-btn__dot" style={{ background: v.color }}/>
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ldsh-tabs">
            {TABS.map(t => (
              <button key={t.k}
                className={`ldsh-tab${tab === t.k ? ' ldsh-tab--active' : ''}`}
                onClick={() => setTab(t.k)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="ldsh-content">

        {/* ══ APERÇU ══ */}
        {tab === 'overview' && (
          <div className="ldsh-bento">

            {/* Infos contact */}
            <div className="ldsh-card ldsh-card--wide">
              <div className="ldsh-card__label">📋 Informations de contact</div>
              <div className="ldsh-info-grid">
                {[
                  { icon: '✉',  label: 'Email',        value: lead.email      || '—' },
                  { icon: '📞', label: 'Téléphone',    value: lead.phone      || '—' },
                  { icon: '🏙', label: 'Ville',        value: lead.city       || '—' },
                  { icon: '🌍', label: 'Pays',         value: lead.country    || '—' },
                  { icon: '🔖', label: 'Source',       value: `${sourceCfg.icon} ${sourceCfg.label}` },
                  { icon: '📅', label: 'Créé le',      value: fmtDate(lead.createdAt) },
                  { icon: '🔄', label: 'Mis à jour',   value: fmtDate(lead.updatedAt) },
                  { icon: '📞', label: 'Nb appels',    value: `${lead.callsCount || 0} appel(s)` },
                ].map(row => (
                  <div key={row.label} className="ldsh-info-row">
                    <span className="ldsh-info-icon">{row.icon}</span>
                    <div>
                      <div className="ldsh-info-label">{row.label}</div>
                      <div className="ldsh-info-value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note rapide */}
            <div className="ldsh-card ldsh-card--accent">
              <div className="ldsh-card__label">✎ Note rapide</div>
              <textarea className="ldsh-quick-textarea"
                placeholder="Tapez une note rapide…"
                value={noteText} rows={4} disabled={noteSaving}
                onChange={e => { setNoteText(e.target.value); setNoteError(''); }}
              />
              {noteError && <p className="ldsh-note-error">{noteError}</p>}
              <button className="ldsh-btn ldsh-btn--primary"
                onClick={handleAddNote} disabled={noteSaving || !noteText.trim()}>
                {noteSaving ? 'Sauvegarde…' : '✎ Sauvegarder la note'}
              </button>
            </div>

            {/* Dernière note */}
            {lead.notes?.length > 0 && (
              <div className="ldsh-card">
                <div className="ldsh-card__label">📌 Dernière note</div>
                <p className="ldsh-last-note">
                  {lead.notes[lead.notes.length - 1].content?.slice(0, 160)}
                  {lead.notes[lead.notes.length - 1].content?.length > 160 ? '…' : ''}
                </p>
                <div className="ldsh-last-note-footer">
                  <span className="ldsh-last-note-date">
                    <Clock size={11}/>
                    {fmtDate(lead.notes[lead.notes.length - 1].createdAt)} ·{' '}
                    {fmtTime(lead.notes[lead.notes.length - 1].createdAt)}
                  </span>
                  <button className="ldsh-link-btn" onClick={() => setTab('notes')}>
                    Voir toutes ({lead.notes.length}) →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ NOTES ══ */}
        {tab === 'notes' && (
          <div className="ldsh-notes-tab">
            <div className="ldsh-section-header">
              <h2>💬 Notes</h2>
              <p>{lead.notes?.length ? `${lead.notes.length} note(s) sur ce lead` : 'Aucune note.'}</p>
            </div>

            <div className="ldsh-card ldsh-note-form-card">
              <div className="ldsh-card__label">Ajouter une note</div>
              <textarea ref={noteRef} className="ldsh-note-textarea" rows={4}
                placeholder="Observations, suivi, détails importants…"
                value={noteText} disabled={noteSaving}
                onChange={e => { setNoteText(e.target.value); setNoteError(''); }}
              />
              {noteError && <p className="ldsh-note-error">⚠ {noteError}</p>}
              <div className="ldsh-note-form-footer">
                <span className="ldsh-chars">{noteText.length} / 2000</span>
                <button className="ldsh-btn ldsh-btn--primary"
                  onClick={handleAddNote} disabled={noteSaving || !noteText.trim()}>
                  {noteSaving ? 'Sauvegarde…' : '✎ Sauvegarder'}
                </button>
              </div>
            </div>

            {lead.notes?.length > 0 ? (
              <>
                <div className="ldsh-timeline">
                  {visibleNotes.map((note, i) => {
                    const isExp  = expandedNote === i;
                    const isLong = note.content?.length > NOTE_TRUNCATE;
                    const num    = lead.notes.length - (visibleNotes.length - 1 - i);
                    return (
                      <div key={i} className="ldsh-note-entry" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="ldsh-note-entry__dot"/>
                        <div className="ldsh-note-entry__card">
                          <div className="ldsh-note-entry__header">
                            <span className="ldsh-note-entry__num">Note #{num}</span>
                            <span className="ldsh-note-entry__date">
                              <Clock size={10}/>
                              {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                            </span>
                          </div>
                          <p className="ldsh-note-entry__body">
                            {isExp || !isLong ? note.content : note.content?.slice(0, NOTE_TRUNCATE) + '…'}
                          </p>
                          {isLong && (
                            <button className="ldsh-note-entry__expand"
                              onClick={() => setExpandedNote(isExp ? null : i)}>
                              {isExp ? '↑ Réduire' : '↓ Lire plus'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {lead.notes.length > NOTES_PREVIEW && (
                  <button className="ldsh-btn ldsh-btn--ghost ldsh-btn--full"
                    onClick={() => { setNotesExpanded(v => !v); setExpandedNote(null); }}>
                    {notesExpanded
                      ? <><ChevronUp size={14}/> Réduire</>
                      : <><ChevronDown size={14}/> Voir toutes les {lead.notes.length} notes</>}
                  </button>
                )}
              </>
            ) : (
              <div className="ldsh-empty">
                <div className="ldsh-empty__icon">📝</div>
                <p className="ldsh-empty__title">Aucune note</p>
                <p className="ldsh-empty__sub">Utilisez le formulaire ci-dessus pour ajouter la première note.</p>
              </div>
            )}
          </div>
        )}

        {/* ══ MODIFIER ══ */}
        {tab === 'edit' && (
          <div className="ldsh-edit-tab">
            <div className="ldsh-section-header">
              <h2>✏️ Modifier le Lead</h2>
              <p>Mettez à jour les informations de contact.</p>
            </div>
            {saveError && <div className="ldsh-error-msg">⚠ {saveError}</div>}
            {saveOk    && <div className="ldsh-success-msg">{saveOk}</div>}
            <div className="ldsh-card">
              <div className="ldsh-edit-grid">
                {EDITABLE_FIELDS.map(({ f, l, p, t }) => (
                  <div key={f} className="ldsh-field">
                    <label className="ldsh-field__label">{l}</label>
                    <input type={t} className="ldsh-field__input"
                      value={editData?.[f] || ''} placeholder={p} disabled={saving}
                      onChange={e => setEditData({ ...editData, [f]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="ldsh-field ldsh-field--full">
                  <label className="ldsh-field__label">Source</label>
                  <select className="ldsh-field__input" value={editData?.source || 'Other'}
                    disabled={saving}
                    onChange={e => setEditData({ ...editData, source: e.target.value })}>
                    {Object.entries(SOURCE_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ldsh-edit-actions">
                <button className="ldsh-btn ldsh-btn--ghost"
                  onClick={() => { setTab('overview'); setSaveError(''); }}
                  disabled={saving}>
                  <X size={14}/> Annuler
                </button>
                <button className="ldsh-btn ldsh-btn--primary"
                  onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <><Spinner size={13}/> Sauvegarde…</> : <><Save size={14}/> Sauvegarder</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`ldsh-toast ldsh-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={14}/> : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}