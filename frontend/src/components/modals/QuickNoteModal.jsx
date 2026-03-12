import { useState, useEffect, useRef } from 'react';
import { addNote } from '../../api/leadsApi';

export default function QuickNoteModal({ lead, onClose, onDone }) {
  const [text,   setText]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const textareaRef = useRef(null);

  // Focus textarea on open
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Ctrl+Enter submits
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
  };

  async function handleSubmit() {
    if (!text.trim()) { setError('La note ne peut pas être vide.'); return; }
    setSaving(true);
    setError('');
    try {
      await addNote(lead._id, text.trim());
      onDone?.(`Note ajoutée pour ${lead.firstName} ${lead.lastName}`);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  }

  const prevNotes = lead.notes || [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--md">

        {/* ── Header ── */}
        <div className="modal__header">
          <div className="modal__header-text">
            <div className="modal__title">✎ Ajouter une note</div>
            <div className="modal__subtitle">
              {lead.firstName} {lead.lastName}
              {prevNotes.length > 0 && ` · ${prevNotes.length} note${prevNotes.length > 1 ? 's' : ''} existante${prevNotes.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Fermer">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="modal__body">

          {/* Last 2 notes preview */}
          {prevNotes.length > 0 && (
            <div className="qn-prev">
              <div className="qn-prev__label">Notes précédentes</div>
              {prevNotes.slice(-2).map((n, i) => (
                <div key={i} className="qn-prev__item">
                  <span className="qn-prev__dot" />
                  <p className="qn-prev__text">{n.content}</p>
                </div>
              ))}
              {prevNotes.length > 2 && (
                <p className="qn-prev__more">
                  +{prevNotes.length - 2} autre{prevNotes.length - 2 > 1 ? 's' : ''} — ouvrir le lead pour tout voir
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Textarea */}
          <label className="form-label">Nouvelle note</label>
          <textarea
            ref={textareaRef}
            className="qn-textarea"
            placeholder="Rédigez votre note ici… (Ctrl+Entrée pour enregistrer)"
            value={text}
            rows={4}
            disabled={saving}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
          />
          <p className="qn-chars">{text.length} caractère{text.length > 1 ? 's' : ''}</p>
        </div>

        {/* ── Footer ── */}
        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !text.trim()}
            style={{ opacity: saving || !text.trim() ? 0.6 : 1 }}
          >
            {saving ? 'Enregistrement…' : '✎ Ajouter la note'}
          </button>
        </div>

      </div>
    </div>
  );
}