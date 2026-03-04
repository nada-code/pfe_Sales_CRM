import { useNavigate } from "react-router-dom";
import { fullName,  acolor, av2 } from "../../utils/leadsUtils";
import { Av, StatusBadge, SourceBadge } from "../UI";

const NOTE_PREVIEW = 55; // chars shown inline

export default function TableView({ leads, onAssignClick }) {
  const navigate = useNavigate();

  const goTo      = (id)  => navigate(`/sales-leader/leads/${id}`);
  const goToNotes = (id)  => navigate(`/sales-leader/leads/${id}?tab=notes`);
  const shortId = (id) => String(id).slice(-6).toUpperCase();

  return (
    <div className="table-wrap">
      <table className="leads-table">
        <thead>
          <tr>
            {["#ID", "Full Name", "Phone", "Source", "Status", "Assigned", "Notes", ""].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const lastNote   = l.notes?.[l.notes.length - 1];
            const noteText   = lastNote?.content || "";
            const noteShort  = noteText.length > NOTE_PREVIEW
              ? noteText.slice(0, NOTE_PREVIEW) + "…"
              : noteText;
            const notesCount = l.notes?.length || 0;

            return (
              <tr key={l._id} onClick={() => goTo(l._id)}>

                <td><span className="table-id">{shortId(l._id) || "—"}</span></td>

                <td>
                  <div className="table-lead-cell">
                    <Av id={l._id} size={32} radius={8}
                      label={`${l.firstName?.[0]||""}${l.lastName?.[0]||""}`.toUpperCase()}
                    />
                    <div>
                      <div className="table-lead-name">{l.firstName} {l.lastName}</div>
                      <div className="table-contact-email">{l.email}</div>
                    </div>
                  </div>
                </td>

                <td><span className="table-contact-phone">{l.phone || "—"}</span></td>
                <td><SourceBadge source={l.source} /></td>
                <td><StatusBadge status={l.status} /></td>

                <td onClick={(e) => e.stopPropagation()}>
                  <div className="table-assigned">
                    {l.assignedTo ? (
                      <>
                        <button className="btn-avatar"
                          style={{ background: acolor(l.assignedTo._id) }}
                          onClick={() => onAssignClick(l)} title="Reassign">
                          {av2(l.assignedTo)}
                        </button>
                        <span className="table-assigned-name">{fullName(l.assignedTo)}</span>
                      </>
                    ) : (
                      <>
                        <button className="btn-unassigned" onClick={() => onAssignClick(l)} title="Assign">
                          <span className="btn-unassigned__plus">+</span>
                        </button>
                        <span className="table-assigned-name--empty">Unassigned</span>
                      </>
                    )}
                  </div>
                </td>

                {/* ✅ Notes — preview + click → notes tab */}
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`table-notes-cell${notesCount ? " table-notes-cell--has" : ""}`}
                    onClick={() => goToNotes(l._id)}
                    title="View all notes"
                  >
                    <div className="table-notes-cell__top">
                      <span className="table-notes-cell__icon">✎</span>
                      <span className="table-notes-cell__count">
                        {notesCount} {notesCount === 1 ? "note" : "notes"}
                      </span>
                    </div>
                    {noteShort && (
                      <p className="table-notes-cell__preview">{noteShort}</p>
                    )}
                  </button>
                </td>

                {/* <td><span className="table-date">{fmtDate(l.createdAt)}</span></td> */}

                <td>
                  <button className="btn-cancel btn-cancel--sm"
                    onClick={(e) => { e.stopPropagation(); goTo(l._id); }}>
                    View →
                  </button>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
      {leads.length === 0 && <div className="table-empty">No leads found</div>}
    </div>
  );
}