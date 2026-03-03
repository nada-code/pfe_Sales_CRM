import { STATUS_CFG } from "../../config/leadsConfig";
import { initials, acolor, av2 } from "../../utils/leadsUtils";
import { Av, SourceBadge } from "../UI";

export default function KanbanCol({ status, leads, onOpen, onAssignClick }) {
  const cfg = STATUS_CFG[status];

  return (
    <div className="kanban-col">
      <div className="kanban-col__header" style={{ borderTop: `3px solid ${cfg.color}` }}>
        <div className="kanban-col__header-left">
          <span className="kanban-col__dot" style={{ background: cfg.color }} />
          <span className="kanban-col__label">{cfg.label}</span>
        </div>
        <span className="kanban-col__count" style={{ color: cfg.color, background: cfg.light }}>
          {leads.length}
        </span>
      </div>

      <div className="kanban-col__body">
        {leads.map((l) => (
          <div key={l._id} className="kanban-card" onClick={() => onOpen(l._id)}>
            <div className="kanban-card__header">
              <Av id={l._id} label={initials(l)} size={28} radius={7} />
              <div className="kanban-card__info">
                <div className="kanban-card__name">{l.firstName} {l.lastName}</div>
                <div className="kanban-card__email">{l.email}</div>
              </div>
            </div>
            <div className="kanban-card__footer" onClick={(e) => e.stopPropagation()}>
              <SourceBadge source={l.source} />
              {l.assignedTo ? (
                <button
                  className="btn-avatar btn-avatar--sm"
                  style={{ background: acolor(l.assignedTo._id) }}
                  onClick={() => onAssignClick(l)}
                >
                  {av2(l.assignedTo)}
                </button>
              ) : (
                <button className="btn-unassigned btn-unassigned--sm" onClick={() => onAssignClick(l)}>
                  <span className="btn-unassigned__plus">+</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {leads.length === 0 && <div className="kanban-col__empty">Empty</div>}
      </div>
    </div>
  );
}