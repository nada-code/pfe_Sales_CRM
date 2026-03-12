import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fullName, acolor, av2 } from '../../utils/leadsUtils';
import { Av, StatusBadge, SourceBadge } from '../UI';
import { STATUS_CFG } from '../../config/leadsConfig';
import QuickNoteModal from '../modals/QuickNoteModal';

const NOTE_PREVIEW = 55;

export default function TableView({
  leads,
  onAssignClick,
  onStatusChange,
  basePath = '/sales-leader/leads',
  showPreview = true,
  showAddNote = true
}) {
  const navigate = useNavigate();
  const [noteTarget, setNoteTarget] = useState(null); // lead object for QuickNoteModal

  const goTo    = (id) => navigate(`${basePath}/${id}`);
  const shortId = (id) => String(id).slice(-6).toUpperCase();

  return (
    <>
      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              {['#ID', 'Nom complet', 'Téléphone', 'Source', 'Statut', 'Assigné', 'Notes', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const lastNote   = l.notes?.[l.notes.length - 1];
              const noteText   = lastNote?.content || '';
              const noteShort  = noteText.length > NOTE_PREVIEW
                ? noteText.slice(0, NOTE_PREVIEW) + '…'
                : noteText;
              const notesCount = l.notes?.length || 0;

              return (
                <tr key={l._id} onClick={() => goTo(l._id)}>

                  <td><span className="table-id">{shortId(l._id)}</span></td>

                  <td>
                    <div className="table-lead-cell">
                      <Av id={l._id} size={32} radius={8}
                        label={`${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase()}
                      />
                      <div>
                        <div className="table-lead-name">{l.firstName} {l.lastName}</div>
                        <div className="table-contact-email">{l.email}</div>
                      </div>
                    </div>
                  </td>

                  <td><span className="table-contact-phone">{l.phone || '—'}</span></td>

                  <td><SourceBadge source={l.source} /></td>

                  <td onClick={(e) => onStatusChange && e.stopPropagation()}>
                    {onStatusChange ? (
                      <select
                        className="sm-status-select"
                        value={l.status}
                        style={{
                          color:       STATUS_CFG[l.status]?.color,
                          background:  STATUS_CFG[l.status]?.light,
                          borderColor: STATUS_CFG[l.status]?.color + '55',
                        }}
                        onChange={(e) => onStatusChange(l._id, e.target.value, e)}
                      >
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={l.status} />
                    )}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="table-assigned">
                      {l.assignedTo ? (
                        <>
                          <button className="btn-avatar"
                            style={{ background: acolor(l.assignedTo._id) }}
                            onClick={() => onAssignClick?.(l)} title="Réassigner">
                            {av2(l.assignedTo)}
                          </button>
                          <span className="table-assigned-name">{fullName(l.assignedTo)}</span>
                        </>
                      ) : (
                        <>
                          <button className="btn-unassigned" onClick={() => onAssignClick?.(l)} title="Assigner">
                            <span className="btn-unassigned__plus">+</span>
                          </button>
                          <span className="table-assigned-name--empty">Non assigné</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* ── Notes cell — click ✎ opens QuickNoteModal ── */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="qn-cell">
                      {/* preview area — navigate to notes tab */}
                      {showPreview && notesCount && (
                        <button
                          className="table-notes-cell"
                          onClick={() => navigate(`${basePath}/${l._id}?tab=notes`)}
                          title="Voir toutes les notes"
                        >
                          <div className="table-notes-cell__top">
                            <span className="table-notes-cell__count">
                              {notesCount} note{notesCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {noteShort && (
                            <p className="table-notes-cell__preview">{noteShort}</p>
                          )}
                        </button>
                      )}
                      {/* <button
                        className={`table-notes-cell${notesCount ? ' table-notes-cell--has' : ''}`}
                        onClick={() => navigate(`${basePath}/${l._id}?tab=notes`)}
                        title="Voir toutes les notes"
                      >
                        <div className="table-notes-cell__top">
                          <span className="table-notes-cell__count">
                            {notesCount} note{notesCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {noteShort && (
                          <p className="table-notes-cell__preview">{noteShort}</p>
                        )}
                      </button> */}


                      {/* Quick add button */}
                      {showAddNote && (
                        <>
                        <button
                           className={`cxp-table__notes${notesCount ? ' cxp-table__notes--has' : ''}`}
                          title="Ajouter une note rapide"
                          onClick={(e) => { e.stopPropagation(); setNoteTarget(l._id); }}
                        >
                          ✎ {notesCount}
                        </button>
                        {/* <span className={`cxp-table__notes${notesCount ? ' cxp-table__notes--has' : ''}`}>
                        ✎ {notesCount}
                      </span> */}
                        
                     </>
                      )}
                    </div>
                  </td>

                  <td>
                    <button className="btn-cancel btn-cancel--sm"
                      onClick={(e) => { e.stopPropagation(); goTo(l._id); }}>
                      Voir →
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
        {leads.length === 0 && <div className="table-empty">Aucun lead trouvé</div>}
      </div>

      {/* QuickNoteModal */}
      {noteTarget && (
        <QuickNoteModal
          lead={leads.find(l => l._id === noteTarget)}
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