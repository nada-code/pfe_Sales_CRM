import { useState } from "react";
import { addNote } from "../../api/leadsApi";
import { emitLeadUpdate } from "../../utils/leadEvents";

export default function QuickNoteModal({ lead, onClose, onDone }) {
  const [text,    setText]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit() {
    if (!text.trim()) { setError("Note cannot be empty."); return; }
    setSaving(true);
    setError("");
    try {
      await addNote(lead._id, text.trim());
      emitLeadUpdate(); // ✅ triggers reload everywhere
      onDone(`Note added for ${lead.firstName} ${lead.lastName}`);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>

        <div className="modal__header">
          <div className="modal__header-text">
            <div className="modal__title">✎ Add Note</div>
            <div className="modal__subtitle">
              {lead.firstName} {lead.lastName}
              {lead.notes?.length > 0 && ` · ${lead.notes.length} existing note(s)`}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="modal__body">
          {/* existing notes preview — last 2 */}
          {lead.notes?.length > 0 && (
            <div className="qn-prev">
              {lead.notes.slice(-2).map((n, i) => (
                <div key={i} className="qn-prev__item">
                  <span className="qn-prev__dot" />
                  <p className="qn-prev__text">{n.content}</p>
                </div>
              ))}
              {lead.notes.length > 2 && (
                <p className="qn-prev__more">+{lead.notes.length - 2} more — open lead to see all</p>
              )}
            </div>
          )}

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          <label className="form-label">New note</label>
          <textarea
            className="qn-textarea"
            placeholder="Type your note here…"
            value={text}
            rows={4}
            onChange={(e) => { setText(e.target.value); setError(""); }}
            autoFocus
            disabled={saving}
          />
        </div>

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !text.trim()}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Add Note"}
          </button>
        </div>

      </div>
    </div>
  );
}
