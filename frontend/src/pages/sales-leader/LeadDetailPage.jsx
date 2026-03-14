import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchLeadById, updateLead, deleteLead } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { STATUS_CFG, SOURCE_CFG } from '../../config/leadsConfig';
import { fullName, fmtDate, fmtTime, acolor, av2 } from '../../utils/leadsUtils';
import { Spinner } from '../../components/UI';
import {
  ArrowLeft, FileText, Edit3, MessageSquare, Save, X,
  Clock, MapPin, Trash2, ChevronDown, ChevronUp, User,
} from 'lucide-react';
import '../../styles/cxpLeadDetail.css';

const NOTES_PREVIEW = 3;
const NOTE_TRUNCATE = 140;

const EDITABLE_FIELDS = [
  { f: 'firstName', l: 'Prénom *',    p: 'Prénom',         t: 'text'  },
  { f: 'lastName',  l: 'Nom *',       p: 'Nom',            t: 'text'  },
  { f: 'email',     l: 'Email *',     p: 'email@ex.com',   t: 'email' },
  { f: 'phone',     l: 'Téléphone',   p: '+216 xx xxx xxx', t: 'tel'  },
  { f: 'city',      l: 'Ville',       p: 'Ville',          t: 'text'  },
  { f: 'country',   l: 'Pays',        p: 'Pays',           t: 'text'  },
];

export default function LeadDetailPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const socket         = useSocket();

  const [tab,           setTab]           = useState(searchParams.get('tab') || 'overview');
  const [lead,          setLead]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const [editData,      setEditData]      = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [saveOk,        setSaveOk]        = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNote,  setExpandedNote]  = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchLeadById(id);
      setLead(data);
      setEditData({
        firstName: data.firstName || '', lastName:  data.lastName  || '',
        email:     data.email     || '', phone:     data.phone     || '',
        city:      data.city      || '', country:   data.country   || '',
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
    const onUpdated = (u) => {
      if (String(u._id) === id) {
        setLead(u);
        setEditData({
          firstName: u.firstName || '', lastName:  u.lastName  || '',
          email:     u.email     || '', phone:     u.phone     || '',
          city:      u.city      || '', country:   u.country   || '',
          source:    u.source    || 'Other',
        });
      }
    };
    const onDeleted = ({ _id }) => { if (_id === id) navigate(-1); };
    socket.on('lead:updated', onUpdated);
    socket.on('lead:deleted', onDeleted);
    return () => {
      socket.off('lead:updated', onUpdated);
      socket.off('lead:deleted', onDeleted);
    };
  }, [socket, id, navigate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!editData.firstName || !editData.lastName || !editData.email) {
      setSaveError('Prénom, nom et email sont requis.');
      return;
    }
    setSaving(true); setSaveError(''); setSaveOk('');
    try {
      await updateLead(id, editData);
      setSaveOk('✓ Lead mis à jour');
      setTimeout(() => setSaveOk(''), 4000);
    } catch (e) {
      setSaveError(e?.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLead(id);
    } catch (e) {
      setSaveError(e?.response?.data?.message || 'Erreur suppression');
      setDeleting(false);
      setConfirmDelete(false);
    }
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

          <div className="ldsh-hero__topbar">
            <button className="ldsh-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={14}/> Retour aux leads
            </button>
            <button className="ldsh-delete-btn"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13}/> Supprimer
            </button>
          </div>

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

            {/* Salesman assigné */}
            <div className="ldsh-agent-card">
              <div className="ldsh-agent-card__label"><User size={11}/> Salesman assigné</div>
              {lead.assignedTo ? (
                <div className="ldsh-agent">
                  <div className="ldsh-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>
                    {av2(lead.assignedTo)}
                  </div>
                  <div className="ldsh-agent__info">
                    <div className="ldsh-agent__name">{fullName(lead.assignedTo)}</div>
                    <div className="ldsh-agent__role">Commercial</div>
                  </div>
                </div>
              ) : (
                <div className="ldsh-agent--empty">Non assigné</div>
              )}
            </div>
          </div>

          <div className="ldsh-tabs">
            {TABS.map(t => (
              <button key={t.k}
                className={`ldsh-tab${tab === t.k ? ' ldsh-tab--active' : ''}`}
                onClick={() => { setTab(t.k); setSaveError(''); }}>
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

            <div className="ldsh-card ldsh-card--wide">
              <div className="ldsh-card__label">📋 Informations de contact</div>
              <div className="ldsh-info-grid">
                {[
                  { icon: '✉',  label: 'Email',      value: lead.email      || '—' },
                  { icon: '📞', label: 'Téléphone',  value: lead.phone      || '—' },
                  { icon: '🏙', label: 'Ville',      value: lead.city       || '—' },
                  { icon: '🌍', label: 'Pays',       value: lead.country    || '—' },
                  { icon: '🔖', label: 'Source',     value: `${sourceCfg.icon} ${sourceCfg.label}` },
                  { icon: '📅', label: 'Créé le',    value: fmtDate(lead.createdAt) },
                  { icon: '📞', label: 'Nb appels',  value: `${lead.callsCount || 0} appel(s)` },
                  { icon: '✎',  label: 'Notes',      value: `${lead.notes?.length || 0} note(s)` },
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

            <div className="ldsh-card">
              <div className="ldsh-card__label">📊 Statut commercial</div>
              <div className="ldsh-status-display"
                style={{ background: statusCfg.light + '33', borderColor: statusCfg.color + '44' }}>
                <span className="ldsh-badge__dot" style={{ background: statusCfg.color }}/>
                <span style={{ color: statusCfg.color, fontWeight: 800, fontSize: 13 }}>{statusCfg.label}</span>
              </div>
              <p className="ldsh-readonly-hint">
                Seuls les salesmen peuvent changer le statut.
              </p>
              {lead.statusChangedAt && (
                <p className="ldsh-readonly-hint">
                  <Clock size={10}/> Changé le {fmtDate(lead.statusChangedAt)}
                </p>
              )}
            </div>

            <div className="ldsh-card">
              <div className="ldsh-card__label">👤 Salesman assigné</div>
              {lead.assignedTo ? (
                <div className="ldsh-agent">
                  <div className="ldsh-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>
                    {av2(lead.assignedTo)}
                  </div>
                  <div className="ldsh-agent__info">
                    <div className="ldsh-agent__name">{fullName(lead.assignedTo)}</div>
                    <div className="ldsh-agent__role">Commercial</div>
                  </div>
                </div>
              ) : (
                <div className="ldsh-agent--empty">Aucun salesman assigné</div>
              )}
            </div>

            {lead.notes?.length > 0 && (
              <div className="ldsh-card ldsh-card--wide ldsh-card--accent">
                <div className="ldsh-card__label">✎ Aperçu des notes</div>
                <div className="ldsh-overview-notes">
                  {lead.notes.slice(-2).map((note, i) => (
                    <div key={i} className="ldsh-overview-note">
                      <span className="ldsh-overview-note__dot"/>
                      <div className="ldsh-overview-note__body">
                        <p className="ldsh-overview-note__text">
                          {note.content?.slice(0, NOTE_TRUNCATE)}
                          {note.content?.length > NOTE_TRUNCATE ? '…' : ''}
                        </p>
                        <span className="ldsh-overview-note__date">
                          <Clock size={10}/> {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="ldsh-link-btn" style={{ marginTop: 10 }}
                  onClick={() => setTab('notes')}>
                  Voir toutes les {lead.notes.length} notes →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ NOTES (lecture seule pour sales_leader) ══ */}
        {tab === 'notes' && (
          <div className="ldsh-notes-tab">
            <div className="ldsh-section-header">
              <h2>💬 Notes</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p>{lead.notes?.length ? `${lead.notes.length} note(s)` : 'Aucune note.'}</p>
                <span className="ldsh-readonly-badge">👁 Lecture seule</span>
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
                <p className="ldsh-empty__sub">Les salesmen et CXP écrivent les notes.</p>
              </div>
            )}
          </div>
        )}

        {/* ══ MODIFIER ══ */}
        {tab === 'edit' && (
          <div className="ldsh-edit-tab">
            <div className="ldsh-section-header">
              <h2>✏️ Modifier le Lead</h2>
              <p>Mettez à jour les informations et la source.</p>
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
                  onClick={handleSave} disabled={saving}>
                  {saving ? <><Spinner size={13}/> Sauvegarde…</> : <><Save size={14}/> Sauvegarder</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal suppression ── */}
      {confirmDelete && (
        <div className="ldsh-modal-overlay" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="ldsh-modal" onClick={e => e.stopPropagation()}>
            <div className="ldsh-modal__icon">🗑</div>
            <h3 className="ldsh-modal__title">Supprimer ce lead ?</h3>
            <p className="ldsh-modal__desc">
              <strong>{lead.firstName} {lead.lastName}</strong> sera définitivement supprimé.
              Cette action est irréversible.
            </p>
            <div className="ldsh-modal__actions">
              <button className="ldsh-btn ldsh-btn--ghost"
                onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="ldsh-btn ldsh-btn--danger"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}