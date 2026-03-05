import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeads, fetchStats, changeStatus } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { STATUS_CFG, SOURCE_CFG, PAGE_SIZE } from '../../config/leadsConfig';
import { fmtDate, acolor } from '../../utils/leadsUtils';
import { Spinner, Toast, SourceBadge } from '../../components/UI';
import Pagination from '../../components/leads/Pagination';
import '../../styles/leads.css';
import '../../styles/SalesmanLeads.css';

export default function MyLeads() {
  const navigate = useNavigate();
  const socket   = useSocket();

  const [leads,        setLeads]        = useState([]);
  const [stats,        setStats]        = useState({ byStatus: [] });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [total,        setTotal]        = useState(0);
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view,         setView]         = useState('table');
  const [toast,        setToast]        = useState(null);
  const debounceTimer = useRef(null);
  const loadRef       = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // ── Loader ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
      };
      const [leadsRes, statsRes] = await Promise.all([fetchLeads(params), fetchStats()]);
      setLeads(leadsRes.data  || []);
      setTotal(leadsRes.total || 0);
      setPages(leadsRes.pages || 1);
      setStats(statsRes);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, filterStatus]);

  loadRef.current = load;

  useEffect(() => { load(); }, [load]);

  // ── Socket: silent reload on any lead event ────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    socket.on('lead:updated',  reload);
    socket.on('lead:created',  reload);
    socket.on('lead:deleted',  reload);
    socket.on('lead:imported', reload);
    return () => {
      socket.off('lead:updated',  reload);
      socket.off('lead:created',  reload);
      socket.off('lead:deleted',  reload);
      socket.off('lead:imported', reload);
    };
  }, [socket]);

  // ── Search debounce ────────────────────────────────────────────────────────
  function handleSearchInput(e) {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  }

  // ── Status change ──────────────────────────────────────────────────────────
  // No emitLeadUpdate needed — server broadcasts lead:updated via socket
  async function handleStatusChange(leadId, newStatus, e) {
    e?.stopPropagation();
    try {
      await changeStatus(leadId, newStatus);
      showToast(`Status updated`);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update status', 'error');
    }
  }
  const statsMap = Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count]));

  return (
    <div className="leads-root">

      <div className="leads-header">
        <div>
          <h1 className="leads-header__title">My Leads</h1>
          <p className="leads-header__subtitle">{total} leads assigned to you</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="leads-stats-bar">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} className="leads-stat-card"
            style={{ borderLeft: `3px solid ${v.color}`, cursor: "pointer" }}
            onClick={() => { setFilterStatus(filterStatus === k ? "" : k); setPage(1); }}>
            <div className="leads-stat-card__count" style={{ color: v.color }}>{statsMap[k] ?? 0}</div>
            <div className="leads-stat-card__label">{v.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="leads-toolbar">
        <div className="leads-search">
          <span className="leads-search__icon">🔍</span>
          <input className="leads-search__input" placeholder="Search by name, email, phone…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); handleSearchInput(e.target.value); }} />
          {searchInput && (
            <button className="leads-search__clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>✕</button>
          )}
        </div>
        <select className="leads-filter-select" value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="leads-view-switcher">
          {[{ k: "table", icon: "≡" }, { k: "cards", icon: "⊞" }].map((v) => (
            <button key={v.k}
              className={`leads-view-switcher__btn${view === v.k ? " leads-view-switcher__btn--active" : ""}`}
              onClick={() => setView(v.k)}>{v.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-count">
        {loading && <Spinner size={12} />}
        Showing {leads.length} of {total} leads
        {filterStatus && ` · ${STATUS_CFG[filterStatus]?.label}`}
      </div>

      {error && (
        <div className="leads-error-banner">⚠ {error}
          <button className="leads-error-banner__retry" onClick={() => load()}>Retry</button>
        </div>
      )}

      {loading && leads.length === 0 && (
        <div className="leads-skeleton-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="leads-skeleton-card"><div className="leads-skeleton-card__bar" /></div>
          ))}
        </div>
      )}

      {(!loading || leads.length > 0) && (
        <>
          {view === "table" && (
            <div className="table-wrap">
              <table className="leads-table">
                <thead>
                  <tr>{["#ID","Lead","Phone","Source","Status","Notes","Created",""].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {leads.map((l) => {
                    const lastNote  = l.notes?.[l.notes.length - 1];
                    const noteShort = lastNote?.content?.slice(0, 55);
                    const hasMore   = lastNote?.content?.length > 55;
                    return (
                      <tr key={l._id} onClick={() => navigate(`/salesman/leads/${l._id}`)}>
                        <td><span className="table-id">{l.leadNumber || "—"}</span></td>
                        <td>
                          <div className="table-lead-cell">
                            <div className="sm-av" style={{ background: acolor(l._id) }}>
                              {`${l.firstName?.[0]||""}${l.lastName?.[0]||""}`.toUpperCase()}
                            </div>
                            <div>
                              <div className="table-lead-name">{l.firstName} {l.lastName}</div>
                              <div className="table-contact-email">{l.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="table-contact-phone">{l.phone || "—"}</span></td>
                        <td><SourceBadge source={l.source} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select className="sm-status-select" value={l.status}
                            style={{ color: STATUS_CFG[l.status]?.color, background: STATUS_CFG[l.status]?.light, borderColor: STATUS_CFG[l.status]?.color + "55" }}
                            onChange={(e) => handleStatusChange(l._id, e.target.value, e)}>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className={`table-notes-cell${l.notes?.length ? " table-notes-cell--has" : ""}`}
                            onClick={() => navigate(`/salesman/leads/${l._id}?tab=notes`)}>
                            <div className="table-notes-cell__top">
                              <span className="table-notes-cell__icon">✎</span>
                              <span className="table-notes-cell__count">{l.notes?.length || 0} {l.notes?.length === 1 ? "note" : "notes"}</span>
                            </div>
                            {noteShort && <p className="table-notes-cell__preview">{noteShort}{hasMore ? "…" : ""}</p>}
                          </button>
                        </td>
                        <td><span className="table-date">{fmtDate(l.createdAt)}</span></td>
                        <td>
                          <button className="btn-cancel btn-cancel--sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/salesman/leads/${l._id}`); }}>
                            Open →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {leads.length === 0 && !loading && <div className="table-empty">No leads assigned to you yet</div>}
            </div>
          )}

          {view === "cards" && (
            <div className="leads-cards-grid">
              {leads.map((l) => {
                const lastNote  = l.notes?.[l.notes.length - 1];
                const noteShort = lastNote?.content?.slice(0, 70);
                const hasMore   = lastNote?.content?.length > 70;
                const sc = STATUS_CFG[l.status] || STATUS_CFG.New;
                return (
                  <div key={l._id} className="lead-card" onClick={() => navigate(`/salesman/leads/${l._id}`)}>
                    <div className="lead-card__priority-bar" style={{ background: sc.color }} />
                    <div className="lead-card__id">{l.leadNumber || "—"}</div>
                    <div className="lead-card__header">
                      <div className="lead-card__info">
                        <div className="lead-card__name">{l.firstName} {l.lastName}</div>
                        <div className="lead-card__phone">{l.phone}</div>
                      </div>
                    </div>
                    <div className="lead-card__badges" onClick={(e) => e.stopPropagation()}>
                      <select className="sm-status-select sm-status-select--card" value={l.status}
                        style={{ color: sc.color, background: sc.light, borderColor: sc.color + "55" }}
                        onChange={(e) => handleStatusChange(l._id, e.target.value, e)}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <SourceBadge source={l.source} />
                    </div>
                    {noteShort ? (
                      <button className="lead-card__notes-preview"
                        onClick={(e) => { e.stopPropagation(); navigate(`/salesman/leads/${l._id}?tab=notes`); }}>
                        <div className="lead-card__notes-preview__header">
                          <span className="lead-card__notes-preview__icon">✎</span>
                          <span className="lead-card__notes-preview__count">{l.notes.length} {l.notes.length === 1 ? "note" : "notes"}</span>
                        </div>
                        <p className="lead-card__notes-preview__text">{noteShort}{hasMore ? "…" : ""}</p>
                      </button>
                    ) : (
                      <button className="lead-card__notes-empty sm-add-note-hint"
                        onClick={(e) => { e.stopPropagation(); navigate(`/salesman/leads/${l._id}?tab=notes`); }}>
                        ✎ Add first note →
                      </button>
                    )}
                    <div className="lead-card__divider" />
                    <div className="lead-card__footer">
                      <span className="lead-card__date">{fmtDate(l.createdAt, { month: "short", day: "numeric" })}</span>
                      <button className="btn-cancel btn-cancel--sm lead-card__view-btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/salesman/leads/${l._id}`); }}>
                        Open →
                      </button>
                    </div>
                  </div>
                );
              })}
              {leads.length === 0 && !loading && (
                <div className="leads-empty">
                  <div className="leads-empty__icon">📋</div>
                  <div className="leads-empty__title">No leads assigned to you yet</div>
                </div>
              )}
            </div>
          )}

          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}