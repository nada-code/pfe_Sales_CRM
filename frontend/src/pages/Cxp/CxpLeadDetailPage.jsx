import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLeadById, updateLead, addNote as apiAddNote } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { SOURCE_CFG } from '../../config/leadsConfig';
import { fmtDate, fmtTime, acolor, av2 } from '../../utils/leadsUtils';
import { Spinner } from '../../components/UI';
import '../../styles/CxpDeals.css';

const NOTES_PREVIEW = 2;
const NOTE_TRUNCATE = 120;

export default function CxpLeadDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const socket   = useSocket();

  const [tab,        setTab]        = useState('overview');
  const [lead,       setLead]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // edit state
  const [editData,   setEditData]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [saveOk,     setSaveOk]     = useState(false);

  // notes state
  const [noteText,   setNoteText]   = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError,  setNoteError]  = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNote,  setExpandedNote]  = useState(null);
  const noteRef = useRef(null);
const visibleNotes = lead?.notes
    ? notesExpanded ? lead.notes : lead.notes.slice(-NOTES_PREVIEW)
    : [];
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
        address:   data.address   || '',
        region:    data.region    || '',
        postalCode:data.postalCode|| '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = u => { if (u._id === id) { setLead(u); } };
    socket.on('lead:updated', handler);
    return () => socket.off('lead:updated', handler);
  }, [socket, id]);

  useEffect(() => {
    if (tab === 'notes') setTimeout(() => noteRef.current?.focus(), 80);
  }, [tab]);

  async function handleSave() {
    setSaving(true); setSaveError(''); setSaveOk(false);
    try {
      await updateLead(id, editData);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setSaveError(e?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function handleAddNote() {
    if (!noteText.trim()) { setNoteError('Note cannot be empty.'); return; }
    setNoteSaving(true); setNoteError('');
    try {
      await apiAddNote(lead._id, noteText.trim());
      setNoteText('');
    } catch (e) {
      setNoteError(e?.response?.data?.message || 'Failed to add note');
    } finally { setNoteSaving(false); }
  }

  if (loading) return <div className="cxp-det-loading"><Spinner size={32} /><span>Loading…</span></div>;
  if (error)   return (
    <div className="cxp-det-error">
      <span>⚠ {error}</span>
      <button className="cxp-btn cxp-btn--ghost" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
  if (!lead) return null;

  const heroColor = acolor(lead._id);
  const sourceCfg = SOURCE_CFG[lead.source] || SOURCE_CFG.Other;

  return (
    <div className="cxp-det-root">

      {/* ── Hero ── */}
      <div className="cxp-det-hero" style={{ '--hero': heroColor }}>
        <div className="cxp-det-hero__blob" style={{ background: heroColor }} />
        <div className="cxp-det-hero__inner">

          <button className="cxp-det-back" onClick={() => navigate(-1)}>← Deal Closed Leads</button>

          <div className="cxp-det-profile">
            <div className="cxp-det-avatar" style={{ background: heroColor }}>
              {`${lead.firstName?.[0]||''}${lead.lastName?.[0]||''}`.toUpperCase()}
            </div>
            <div className="cxp-det-identity">
              <div className="cxp-det-id">#{String(lead._id).slice(-6).toUpperCase()}</div>
              <h1 className="cxp-det-name">{lead.firstName} {lead.lastName}</h1>
              <div className="cxp-det-meta">{lead.email} · {lead.phone}</div>
              {lead.city && <div className="cxp-det-meta">📍 {lead.city}{lead.country ? `, ${lead.country}` : ''}</div>}
              <div className="cxp-det-badges">
                <span className="cxp-det-badge cxp-det-badge--closed">✓ Deal Closed</span>
                <span className="cxp-det-badge" style={{ color: sourceCfg.color, background: sourceCfg.light + '55' }}>
                  {sourceCfg.icon} {sourceCfg.label}
                </span>
              </div>
            </div>
            {lead.assignedTo && (
              <div className="cxp-det-agent">
                <div className="cxp-det-agent__av" style={{ background: acolor(lead.assignedTo._id) }}>
                  {av2(lead.assignedTo)}
                </div>
                <div>
                  <div className="cxp-det-agent__label">Salesman</div>
                  <div className="cxp-det-agent__name">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</div>
                </div>
              </div>
            )}
          </div>

          <div className="cxp-det-tabs">
            {[
              { k: 'overview', label: 'Overview' },
              { k: 'edit',     label: 'Edit info' },
              { k: 'notes',    label: `Comments (${lead.notes?.length || 0})` },
            ].map(t => (
              <button key={t.k}
                className={`cxp-det-tab${tab === t.k ? ' cxp-det-tab--active' : ''}`}
                onClick={() => { setTab(t.k); setSaveError(''); }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="cxp-det-content">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="cxp-det-bento">
            <div className="cxp-det-card cxp-det-card--wide">
              <div className="cxp-det-card__label">📋 Contact details</div>
              <div className="cxp-det-grid">
                {[
                  { icon: '✉',  label: 'Email',       value: lead.email      || '—' },
                  { icon: '📞', label: 'Phone',       value: lead.phone      || '—' },
                  { icon: '🏙', label: 'City',        value: lead.city       || '—' },
                  { icon: '🌍', label: 'Country',     value: lead.country    || '—' },
                  { icon: '📍', label: 'Address',     value: lead.address    || '—' },
                  { icon: '📮', label: 'Postal code', value: lead.postalCode || '—' },
                  { icon: '📅', label: 'Created',     value: fmtDate(lead.createdAt) },
                  { icon: '✎',  label: 'Comments',    value: `${lead.notes?.length || 0} comment(s)` },
                ].map(row => (
                  <div key={row.label} className="cxp-det-info-row">
                    <span className="cxp-det-info-icon">{row.icon}</span>
                    <div>
                      <div className="cxp-det-info-label">{row.label}</div>
                      <div className="cxp-det-info-value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {lead.notes?.length > 0 && (
              <div className="cxp-det-card">
                <div className="cxp-det-card__label">💬 Last comment</div>
                <p className="cxp-det-last-note">
                  {lead.notes[lead.notes.length - 1].content?.slice(0, 160)}
                  {lead.notes[lead.notes.length - 1].content?.length > 160 && '…'}
                </p>
                <div className="cxp-det-last-note-footer">
                  <span>{fmtDate(lead.notes[lead.notes.length - 1].createdAt)}</span>
                  <button className="cxp-det-link" onClick={() => setTab('notes')}>
                    All {lead.notes.length} comments →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit */}
        {tab === 'edit' && (
          <div className="cxp-det-edit">
            <div className="cxp-det-edit__header">
              <h2 className="cxp-det-edit__title">Edit contact info</h2>
              <p className="cxp-det-edit__sub">Update client information for this closed deal.</p>
            </div>

            {saveError && <div className="cxp-det-edit__error">⚠ {saveError}</div>}
            {saveOk    && <div className="cxp-det-edit__success">✓ Saved successfully</div>}

            <div className="cxp-det-edit__grid">
              {[
                { f: 'firstName', l: 'First name *', p: 'First name' },
                { f: 'lastName',  l: 'Last name *',  p: 'Last name'  },
                { f: 'email',     l: 'Email',        p: 'email@example.com', t: 'email' },
                { f: 'phone',     l: 'Phone *',      p: '+216 xx xxx xxx' },
                { f: 'city',      l: 'City',         p: 'City' },
                { f: 'country',   l: 'Country',      p: 'Country' },
                { f: 'address',   l: 'Address',      p: 'Street address' },
                { f: 'region',    l: 'Region',       p: 'Region / State' },
                { f: 'postalCode',l: 'Postal code',  p: '1234' },
              ].map(({ f, l, p, t }) => (
                <div key={f} className={`cxp-field${f === 'address' ? ' cxp-field--full' : ''}`}>
                  <label className="cxp-field__label">{l}</label>
                  <input className="cxp-field__input" type={t || 'text'}
                    value={editData[f]} placeholder={p} disabled={saving}
                    onChange={e => setEditData({ ...editData, [f]: e.target.value })} />
                </div>
              ))}
            </div>

            <div className="cxp-det-edit__actions">
              <button className="cxp-btn cxp-btn--ghost"
                onClick={() => { setTab('overview'); setSaveError(''); }} disabled={saving}>
                Cancel
              </button>
              <button className="cxp-btn cxp-btn--save" onClick={handleSave}
                disabled={saving || !editData?.firstName || !editData?.lastName || !editData?.phone}>
                {saving ? 'Saving…' : '💾 Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* Notes / Comments */}
        {tab === 'notes' && (
          <div className="cxp-det-notes">
            <div className="cxp-det-notes__header">
            <p className="lw-notes__eyebrow" style={{color:"#0ea5e9"}}>Lead activity</p>

              <h2 className="cxp-det-notes__title">Notes</h2>
             <p className="lw-notes__sub">
                  {lead.notes?.length
                    ? `${lead.notes.length} note${lead.notes.length > 1 ? 's' : ''} on this lead`
                    : "No notes yet"}
                </p>
            </div>

            {/* Add comment form */}
            <div className="cxp-det-note-form">
              <div className="cxp-det-note-form__label">💬 Add a Note</div>
              <textarea ref={noteRef} className="cxp-det-note-textarea"
                placeholder="Write your post-sale comment, confirmation details, delivery notes…"
                value={noteText} rows={3} disabled={noteSaving}
                onChange={e => { setNoteText(e.target.value); setNoteError(''); }} />
              {noteError && <p className="cxp-det-note-error">⚠ {noteError}</p>}
              <div className="cxp-det-note-form__footer">
                <span className="cxp-det-note-chars">{noteText.length} chars</span>
                <button className="cxp-btn cxp-btn--save" onClick={handleAddNote}
                  disabled={noteSaving || !noteText.trim()}>
                  {noteSaving ? "Saving…" : "✎ Save note"}
                </button>
              </div>
            </div>

            {(!lead.notes || lead.notes.length === 0) && (
              <div className="cxp-det-notes__empty">
                <div className="cxp-det-notes__empty-icon">💬</div>
                <p>No notes yet. Write your first one above.</p>
              </div>
            )}

            {lead.notes?.length > 0 && (
              <div className="cxp-det-notes__block">
                {visibleNotes.map((note, i) => {
                  const isExp  = expandedNote === i;
                  const isLong = note.content?.length > NOTE_TRUNCATE;
                  return (
                    <div key={i} className="cxp-det-notes__item" style={{ animationDelay: `${i * 35}ms` }}>
                      <div className="cxp-det-notes__item-meta">
                        <span className="cxp-det-notes__item-num">#{visibleNotes.length - i}</span>
                        <span className="cxp-det-notes__item-date">
                          {fmtDate(note.createdAt)} · {fmtTime(note.createdAt)}
                        </span>
                      </div>
                      <div className="cxp-det-notes__item-content">
                        <div className="cxp-det-notes__item-text">
                          {isLong && isExp
                            ? note.content
                            : note.content?.slice(0, NOTE_TRUNCATE) }
                        </div>
                        {isLong && (
                          <div className="cxp-det-notes__item-toggle" onClick={() => setExpandedNote(i)}>
                            {isExp ? 'Show less' : 'Show more'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
             {lead.notes.length > NOTES_PREVIEW && (
                              <button className="ld-notes__toggle"
                                onClick={() => { setNotesExpanded(!notesExpanded); setExpandedNote(null); }}>
                                {notesExpanded
                                  ? `↑ Show less (${NOTES_PREVIEW} most recent)`
                                  : `↓ Show all ${lead.notes.length} notes`}
                              </button>
                            )}
          </div>
        )}
      </div>
    </div>
  );
}