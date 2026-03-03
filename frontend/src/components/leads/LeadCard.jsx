import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import { fmtDate, acolor, av2 } from "../../utils/leadsUtils";
import { Av, StatusBadge, SourceBadge } from "../UI";

export default function LeadCard({ lead, onOpen, onAssignClick }) {
  const sourceColor = STATUS_CFG[lead.status]?.color || "#e2e8f0";

  return (
    <div className="lead-card" onClick={() => onOpen(lead._id)}>
      <div className="lead-card__priority-bar" style={{ background: sourceColor }} />

      <div className="lead-card__header">
        {/* <Av id={lead._id} label={initials(lead)} size={44} radius={12} /> */}
        <div className="lead-card__info">
          <div className="lead-card__name">{lead.firstName} {lead.lastName}</div>
          <div className="lead-card__email">{lead.email}</div>
          <div className="lead-card__phone">{lead.phone}</div>
        </div>
      </div>

      <div className="lead-card__badges">
        <StatusBadge status={lead.status} />
        <SourceBadge source={lead.source} />
        {lead.city && <span className="lead-card__city-badge">📍 {lead.city}</span>}
      </div>

      <div className="lead-card__divider" />

      <div className="lead-card__footer">
        <span className="lead-card__date">
          {fmtDate(lead.createdAt, { month: "short", day: "numeric" })}
        </span>
        <div className="lead-card__assignee" onClick={(e) => e.stopPropagation()}>
          <span className={lead.assignedTo ? "lead-card__assignee-name" : "lead-card__assignee-name--empty"}>
            {lead.assignedTo ? lead.assignedTo.firstName : "Unassigned"}
          </span>
          {lead.assignedTo ? (
            <button
              title="Reassign"
              className="btn-avatar"
              onClick={() => onAssignClick(lead)}
              style={{
                background: acolor(lead.assignedTo._id),
                // boxShadow: `0 0 0 2px ${STATUS_CFG[lead.status]?.color || "#6366f1"}66`,
              }}
            >
              {av2(lead.assignedTo)}
            </button>
          ) : (
            <button title="Assign" className="btn-unassigned" onClick={() => onAssignClick(lead)}>
              <span className="btn-unassigned__plus">+</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}