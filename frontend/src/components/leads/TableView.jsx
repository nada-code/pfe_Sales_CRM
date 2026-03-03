import { initials, fullName, fmtDate, acolor, av2 } from "../../utils/leadsUtils";
import { Av, StatusBadge, SourceBadge } from "../UI";

export default function TableView({ leads, onOpen, onAssignClick }) {
  return (
    <div className="table-wrap">
      <table className="leads-table">
        <thead>
          <tr>
            {["Lead", "Contact", "Status", "Source", "Assigned", "Created", ""].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l._id} onClick={() => onOpen(l._id)}>
              <td>
                <div className="table-lead-cell">
                  <Av id={l._id} label={initials(l)} size={34} radius={9} />
                  <div className="table-lead-name">{l.firstName} {l.lastName}</div>
                </div>
              </td>
              <td>
                <div className="table-contact-email">{l.email}</div>
                <div className="table-contact-phone">{l.phone}</div>
              </td>
              {/* <td><span className="table-city">{l.city || "—"}</span></td> */}
              <td><StatusBadge status={l.status} /></td>
              <td><SourceBadge source={l.source} /></td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="table-assigned">
                  {l.assignedTo ? (
                    <>
                      <button
                        className="btn-avatar"
                        style={{ background: acolor(l.assignedTo._id) }}
                        onClick={() => onAssignClick(l)}
                      >
                        {av2(l.assignedTo)}
                      </button>
                      <span className="table-assigned-name">{fullName(l.assignedTo)}</span>
                    </>
                  ) : (
                    <>
                      <button className="btn-unassigned" onClick={() => onAssignClick(l)}>
                        <span className="btn-unassigned__plus">+</span>
                      </button>
                      <span className="table-assigned-name--empty">Unassigned</span>
                    </>
                  )}
                </div>
              </td>
              <td><span className="table-date">{fmtDate(l.createdAt)}</span></td>
              <td>
                <button
                  className="btn-cancel btn-cancel--sm"
                  onClick={(e) => { e.stopPropagation(); onOpen(l._id); }}
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && <div className="table-empty">No leads found</div>}
    </div>
  );
}