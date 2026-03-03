import { useState, useEffect } from "react";
import { fetchSalesmen } from "../../api/leadsApi";
import { av2 } from "../../utils/leadsUtils";
import { Av, Spinner } from "../UI";

export default function AssignModal({ lead, onClose, onAssign }) {
  const [salesmen, setSalesmen] = useState([]);
  const [selected, setSelected] = useState(lead.assignedTo?._id || null);
  const [q,        setQ]        = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetchSalesmen()
      .then((res) => setSalesmen(res.data || res))
      .catch(()   => setSalesmen([]))
      .finally(() => setLoading(false));
  }, []);

  const list = salesmen.filter(
    (u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q.toLowerCase())
  );

  async function confirm() {
    setSaving(true);
    try { await onAssign(lead._id, selected); onClose(); }
    catch { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <div>
            <div className="modal__title">Assign Lead</div>
            <div className="modal__subtitle">{lead.firstName} {lead.lastName} · {lead.email}</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body modal__body--pad22">
          <div className="assign-search">
            <span className="assign-search__icon">🔍</span>
            <input
              className="assign-search__input"
              placeholder="Search salesman…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="assign-list">
          {loading ? (
            <div className="assign-list__loading"><Spinner /></div>
          ) : (
            <>
              <div
                className={`agent-row${selected === null ? " agent-row--active" : ""}`}
                onClick={() => setSelected(null)}
              >
                <div className="agent-row__placeholder">–</div>
                <div className="agent-row__info">
                  <div className="agent-row__name agent-row__name--muted">Unassigned</div>
                  <div className="agent-row__role">Remove current assignment</div>
                </div>
                {selected === null && <span className="agent-row__check">✓</span>}
              </div>

              {list.map((u) => (
                <div
                  key={u._id}
                  className={`agent-row${selected === u._id ? " agent-row--active" : ""}`}
                  onClick={() => setSelected(u._id)}
                >
                  <Av id={u._id} label={av2(u)} size={42} radius={11} />
                  <div className="agent-row__info">
                    <div className="agent-row__name">{u.firstName} {u.lastName}</div>
                    <div className="agent-row__role">{u.role || "Sales Rep"}</div>
                  </div>
                  {selected === u._id && <span className="agent-row__check">✓</span>}
                </div>
              ))}

              {list.length === 0 && <div className="assign-list__empty">No salesmen found</div>}
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }} onClick={confirm} disabled={saving || loading}>
            {saving ? "Assigning…" : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}