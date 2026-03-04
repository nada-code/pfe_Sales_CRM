import { useNavigate } from "react-router-dom";
import { STATUS_CFG } from "../../config/leadsConfig";
import { fmtDate, acolor, av2 } from "../../utils/leadsUtils";
import { StatusBadge, SourceBadge } from "../UI";

const NOTE_PREVIEW = 70;

export default function LeadCard({ lead, onAssignClick }) {
  const navigate    = useNavigate();
  const statusColor = STATUS_CFG[lead.status]?.color || "#e2e8f0";

  const goTo      = () => navigate(`/sales-leader/leads/${lead._id}`);
  const goToNotes = (e) => { e.stopPropagation(); navigate(`/sales-leader/leads/${lead._id}?tab=notes`); };
  const shortId = (id) => String(id).slice(-6).toUpperCase();

  const lastNote  = lead.notes?.[lead.notes.length - 1];
  const noteText  = lastNote?.content || "";
  const noteShort = noteText.length > NOTE_PREVIEW
    ? noteText.slice(0, NOTE_PREVIEW) + "…"
    : noteText;
  const notesCount = lead.notes?.length || 0;

  return (
    <div className="lead-card" onClick={goTo}>

      <div className="lead-card__priority-bar" style={{ background: statusColor }} />

      {/* ID */}
      <div className="lead-card__id">#{shortId(lead._id) || "—"}</div>

      {/* Name */}
      <div className="lead-card__header">
        <div className="lead-card__info">
          <div className="lead-card__name">{lead.firstName} {lead.lastName}</div>
          <div className="lead-card__phone">{lead.phone}</div>
        </div>
      </div>

      {/* Status + Source — read-only */}
      <div className="lead-card__badges">
        <StatusBadge status={lead.status} />
        <SourceBadge source={lead.source} />
        {lead.city && <span className="lead-card__city-badge">📍 {lead.city}</span>}
      </div>

      {/* ✅ Notes preview block */}
      {noteShort ? (
        <button className="lead-card__notes-preview" onClick={goToNotes} title="View all notes">
          <div className="lead-card__notes-preview__header">
            <span className="lead-card__notes-preview__icon">✎</span>
            <span className="lead-card__notes-preview__count">{notesCount} {notesCount === 1 ? "note" : "notes"}</span>
          </div>
          <p className="lead-card__notes-preview__text">{noteShort}</p>
        </button>
      ) : (
        <div className="lead-card__notes-empty">✎ No notes yet</div>
      )}

      <div className="lead-card__divider" />

      {/* Footer */}
      <div className="lead-card__footer">
        <span className="lead-card__date">
          {fmtDate(lead.createdAt, { month: "short", day: "numeric" })}
        </span>

        <div className="lead-card__footer-right">
          {/* Assign */}
          <div className="lead-card__assignee" onClick={(e) => e.stopPropagation()}>
            <span className={lead.assignedTo ? "lead-card__assignee-name" : "lead-card__assignee-name--empty"}>
              {lead.assignedTo ? lead.assignedTo.firstName : "Unassigned"}
            </span>
            {lead.assignedTo ? (
              <button className="btn-avatar" style={{ background: acolor(lead.assignedTo._id) }}
                onClick={() => onAssignClick(lead)} title="Reassign">
                {av2(lead.assignedTo)}
              </button>
            ) : (
              <button className="btn-unassigned" onClick={() => onAssignClick(lead)} title="Assign">
                <span className="btn-unassigned__plus">+</span>
              </button>
            )}
          </div>

          <button className="btn-cancel btn-cancel--sm lead-card__view-btn"
            onClick={(e) => { e.stopPropagation(); goTo(); }}>
            View →
          </button>
        </div>
      </div>

    </div>
  );
}