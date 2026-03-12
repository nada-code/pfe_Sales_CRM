import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_CFG } from '../../config/leadsConfig';
import { fmtDate, acolor, av2 } from '../../utils/leadsUtils';
import { StatusBadge, SourceBadge } from '../UI';
import QuickNoteModal from '../modals/QuickNoteModal';

const NOTE_PREVIEW = 70;

export default function LeadCard({ lead, onAssignClick, basePath = '/sales-leader/leads', showAddNote = true }) {
  const navigate    = useNavigate();
  const [noteTarget, setNoteTarget] = useState(null); // lead object for QuickNoteModal

  const statusColor = STATUS_CFG[lead.status]?.color || '#e2e8f0';

  const goTo    = ()  => navigate(`${basePath}/${lead._id}`);
  const shortId = (id) => String(id).slice(-6).toUpperCase();

  const lastNote   = lead.notes?.[lead.notes.length - 1];
  const noteText   = lastNote?.content || '';
  const noteShort  = noteText.length > NOTE_PREVIEW
    ? noteText.slice(0, NOTE_PREVIEW) + '…'
    : noteText;
  const notesCount = lead.notes?.length || 0;

  return (
    <>
      <div className="lead-card" onClick={goTo}>

        <div className="lead-card__priority-bar" style={{ background: statusColor }} />

        <div className="lead-card__id">#{shortId(lead._id)}</div>

        <div className="lead-card__header">
          <div className="lead-card__info">
            <div className="lead-card__name">{lead.firstName} {lead.lastName}</div>
            <div className="lead-card__phone">{lead.phone}</div>
          </div>
        </div>

        <div className="lead-card__badges">
          <StatusBadge status={lead.status} />
          <SourceBadge source={lead.source} />
          {lead.city && <span className="lead-card__city-badge">📍 {lead.city}</span>}
        </div>

        {/* Notes preview + quick add button */}
        <div className="lead-card__notes-row" onClick={(e) => e.stopPropagation()}>
          {/* {noteShort ? (
            <button
              className="lead-card__notes-preview"
              onClick={() => navigate(`${basePath}/${lead._id}?tab=notes`)}
              title="Voir toutes les notes"
            >
              <div className="lead-card__notes-preview__header">
                <span className="lead-card__notes-preview__icon">✎</span>
                <span className="lead-card__notes-preview__count">
                  {notesCount} {notesCount === 1 ? 'note' : 'notes'}
                </span>
              </div>
              <p className="lead-card__notes-preview__text">{noteShort}</p>
            </button>
          ) : (
            <div className="lead-card__notes-empty">✎ Aucune note</div>
          )} */}

          {/* Quick add note */}
          {/* {showAddNote && (
                        <button style={{color:"red" ,justifycontent:"left",alignitem:"left" ,display:"flex",}}
                           className={`cxp-table__notes${notesCount ? ' cxp-table__notes--has' : ''}`}
                          title="Ajouter une note rapide"
                          onClick={(e) => { e.stopPropagation(); setNoteTarget(lead._id); }}
                        >
                          ✎{notesCount}
                        </button>
                     
                      )} */}
        </div>

        <div className="lead-card__divider" />

        <div className="lead-card__footer">
          <span className="lead-card__date">
            {fmtDate(lead.createdAt, { month: 'short', day: 'numeric' })}
          </span>

          <div className="lead-card__footer-right">
            <div className="lead-card__assignee" onClick={(e) => e.stopPropagation()}>
              <span className={lead.assignedTo ? 'lead-card__assignee-name' : 'lead-card__assignee-name--empty'}>
                {lead.assignedTo ? lead.assignedTo.firstName : 'Non assigné'}
              </span>
              
              {lead.assignedTo ? (
                <button className="btn-avatar" style={{ background: acolor(lead.assignedTo._id) }}
                  onClick={() => onAssignClick?.(lead)} title="Réassigner">
                  {av2(lead.assignedTo)}
                </button>
              ) : (
                <button className="btn-unassigned" onClick={() => onAssignClick?.(lead)} title="Assigner">
                  <span className="btn-unassigned__plus">+</span>
                </button>
              )}
                {showAddNote && (
                        <button 
                           className={`cxp-table__notes${notesCount ? ' cxp-table__notes--has' : ''}`}
                          title="Ajouter une note rapide"
                          onClick={(e) => { e.stopPropagation(); setNoteTarget(lead._id); }}
                        >
                          ✎{notesCount}
                        </button>
                     
                      )}
            </div>

            {/* <button className="btn-cancel btn-cancel--sm lead-card__view-btn"
              onClick={(e) => { e.stopPropagation(); goTo(); }}>
              Voir →
            </button> */}
          </div>
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