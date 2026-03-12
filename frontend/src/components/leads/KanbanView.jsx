import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickNoteModal from '../modals/QuickNoteModal';
import { KANBAN_COLS, STATUS_CFG } from '../../config/leadsConfig';
import { acolor, av2, fmtDate } from '../../utils/leadsUtils';
import '../../styles/KanbanView.css';

// ── Helpers ─────────────────────────────────────────────────────────────────
const NOTE_PREVIEW = 65;

function shortId(id) {
  return String(id).slice(-5).toUpperCase();
}

// ── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({ lead, basePath, onDragStart, isDragging, onAssignClick, readOnly, showAddNote = true }) {
  const navigate   = useNavigate();
  const [noteTarget, setNoteTarget] = useState(null); // lead object for QuickNoteModal

  const statusCfg  = STATUS_CFG[lead.status] || STATUS_CFG.New;
  const avColor    = lead.assignedTo ? acolor(lead.assignedTo._id) : '#94a3b8';
  const lastNote   = lead.notes?.[lead.notes.length - 1];
  const noteText   = lastNote?.content?.slice(0, NOTE_PREVIEW) || '';



  return (
    <>
    <div
      className={`kb-card${isDragging ? ' kb-card--dragging' : ''}${readOnly ? ' kb-card--readonly' : ''}`}
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : (e) => onDragStart(e, lead._id)}
      onClick={() => navigate(`${basePath}/${lead._id}`)}
      style={{ '--col-c': statusCfg.color }}
    >
      {/* Top strip */}
      <div className="kb-card__strip" style={{ background: statusCfg.color }} />

      {/* Header row */}
      <div className="kb-card__head">
        <div className="kb-card__av" style={{ background: acolor(lead._id) }}>
          {`${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase()}
        </div>
        <div className="kb-card__meta">
          <p className="kb-card__name">{lead.firstName} {lead.lastName}</p>
          <p className="kb-card__id">#{shortId(lead._id)}</p>
        </div>
        {!readOnly && (
          <button
            className="kb-card__drag-handle"
            title="Drag to move"
            onClick={(e) => e.stopPropagation()}
          >⠿</button>
        )}
      </div>

      {/* Contact info */}
      {(lead.phone || lead.email) && (
        <p className="kb-card__contact">
          {lead.phone || lead.email}
        </p>
      )}

      {/* Note preview */}
      {noteText && (
        <p className="kb-card__note" >✎ {noteText}{lastNote?.content?.length > NOTE_PREVIEW ? '…' : ''}
         {showAddNote && (
                        <button
                          className="qn-add-btn"
                          title="Ajouter une note rapide"
                          onClick={(e) => { e.stopPropagation(); setNoteTarget(lead._id); }}
                        >
                          ✎
                        </button>
                     
                      )}</p>
      )}
       {/* Quick add note */}
         
      

      {/* Source + city */}
      {/* <div className="kb-card__tags">
        {lead.source && (
          <span className="kb-tag kb-tag--source">{lead.source}</span>
        )}
        {lead.city && (
          <span className="kb-tag kb-tag--city">📍 {lead.city}</span>
        )}
      </div> */}

      {/* Footer */}
      <div className="kb-card__footer">
        <span className="kb-card__date">{fmtDate(lead.createdAt, { month: 'short', day: 'numeric' })}</span>
        {lead.assignedTo ? (
          <button
            className="kb-card__assignee"
            style={{ background: avColor }}
            title={`${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`}
            onClick={(e) => { e.stopPropagation(); onAssignClick?.(lead); }}
          >
            {av2(lead.assignedTo)}
          </button>
        ) : (
          onAssignClick && (
            <button
              className="kb-card__unassigned"
              title="Assign"
              onClick={(e) => { e.stopPropagation(); onAssignClick(lead); }}
            >+</button>
          )
        )}
      </div>
    </div>
     {/* QuickNoteModal */}
                {noteTarget && (
                  <QuickNoteModal
                    lead={lead}
                    onClose={() => setNoteTarget(null)}
                    onDone={(msg) => {
                      setNoteTarget(null);
                      showAddNote?.(msg);
                    }}
                  />
                )}
                </>
  );
}

// ── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ colKey, leads, basePath, dragState, onDragStart, onDrop, onDragOver, onDragLeave, onAssignClick, readOnly }) {
  const cfg       = STATUS_CFG[colKey];
  const isOver    = dragState.overCol === colKey;
  const isDragSrc = dragState.fromCol === colKey;

  return (
    <div
      className={`kb-col${isOver ? ' kb-col--over' : ''}${isDragSrc ? ' kb-col--src' : ''}`}
      onDragOver={(e) => onDragOver(e, colKey)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, colKey)}
      style={{ '--col-c': cfg.color, '--col-l': cfg.light }}
    >
      {/* Column header */}
      <div className="kb-col__head">
        <div className="kb-col__label-row">
          <span className="kb-col__dot" style={{ background: cfg.dot || cfg.color }} />
          <span className="kb-col__label">{cfg.label}</span>
        </div>
        <span className="kb-col__count"
          style={{ background: cfg.light, color: cfg.color, borderColor: cfg.color + '44' }}>
          {leads.length}
        </span>
      </div>

      {/* Drop zone indicator */}
      {isOver && (
        <div className="kb-drop-indicator">
          <span>Déposer ici</span>
        </div>
      )}

      {/* Cards */}
      <div className="kb-col__cards">
        {leads.length === 0 && !isOver ? (
          <div className="kb-col__empty">Aucun lead</div>
        ) : (
          leads.map((lead, i) => (
            <KanbanCard
              key={lead._id}
              lead={lead}
              basePath={basePath}
              isDragging={dragState.dragId === lead._id}
              onDragStart={onDragStart}
              onAssignClick={onAssignClick}
              readOnly={readOnly}
              style={{ animationDelay: `${i * 35}ms` }}
              showAddNote={!readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── KanbanView (main export) ─────────────────────────────────────────────────
export default function KanbanView({
  leads = [],
  basePath = '/sales-leader/leads',
  onStatusChange,
  onAssignClick,
  readOnly = false,
}) {
  const [dragState, setDragState] = useState({ dragId: null, fromCol: null, overCol: null });

  // Group leads by status
  const columns = KANBAN_COLS.map((key) => ({
    key,
    leads: leads.filter((l) => l.status === key),
  }));

  // const total = leads.length;

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, leadId) => {
    const lead = leads.find((l) => l._id === leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('leadId', leadId);
    setDragState({ dragId: leadId, fromCol: lead?.status, overCol: null });
  }, [leads]);

  const handleDragOver = useCallback((e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState((prev) => prev.overCol === colKey ? prev : { ...prev, overCol: colKey });
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragState((prev) => ({ ...prev, overCol: null }));
    }
  }, []);

  const handleDrop = useCallback((e, targetStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const lead   = leads.find((l) => l._id === leadId);

    setDragState({ dragId: null, fromCol: null, overCol: null });

    if (lead && lead.status !== targetStatus && onStatusChange) {
      onStatusChange(leadId, targetStatus);
    }
  }, [leads, onStatusChange]);

  const handleDragEnd = useCallback(() => {
    setDragState({ dragId: null, fromCol: null, overCol: null });
  }, []);

  return (
    <>
    <div className="kb-root" onDragEnd={handleDragEnd}>
      {readOnly && (
        <div className="kb-readonly-banner">
          <span className="kb-readonly-banner__icon">👁</span>
          Vue lecture seule — seuls les commerciaux peuvent changer le statut d'un lead.
        </div>
      )}
      {/* Board */}
      <div className="kb-board">
        {columns.map(({ key, leads: colLeads }) => (
          <KanbanColumn
            key={key}
            colKey={key}
            leads={colLeads}
            basePath={basePath}
            dragState={dragState}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onAssignClick={onAssignClick}
            readOnly={readOnly}
          />
        ))}
      </div>

      {leads.length === 0 && (
        <div className="kb-empty">
          <div className="kb-empty__icon">📋</div>
          <p className="kb-empty__title">Aucun lead à afficher</p>
          <p className="kb-empty__hint">Ajustez vos filtres ou créez un lead</p>
        </div>
      )}
    </div>
   
                </>
  );
}