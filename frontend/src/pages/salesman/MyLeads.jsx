import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchLeads, fetchStats, changeStatus } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import LeadCard     from '../../components/leads/LeadCard';
import TableView    from '../../components/leads/TableView';
import { STATUS_CFG, SOURCE_CFG, PAGE_SIZE } from '../../config/leadsConfig';
import { Spinner, Toast, SourceBadge } from '../../components/UI';
import Pagination from '../../components/leads/Pagination';
import '../../styles/leads.css';
import '../../styles/SalesmanLeads.css';

export default function MyLeads() {
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
  async function handleStatusChange(leadId, newStatus, e) {
    e?.stopPropagation();
    try {
      await changeStatus(leadId, newStatus);
    } catch (err) {
      setToast({ type: "error", message: err?.response?.data?.message || "Failed to update status" });
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
          {view === "cards" && (
                      <div className="leads-cards-grid">
                        {leads.map((l) => (
      <LeadCard key={l._id} lead={l} basePath="/salesman/leads" />
    ))}
                        {leads.length === 0 && !loading && (
                          <div className="leads-empty">
                            <div className="leads-empty__icon">🔍</div>
                            <div className="leads-empty__title">No leads found</div>
                            <div className="leads-empty__hint">Try adjusting your filters</div>
                          </div>
                        )}
                      </div>
                    )}
                    {view === "table" && (
  <TableView
    leads={leads}
    basePath="/salesman/leads"
    onStatusChange={handleStatusChange}
  />
)}
                    <Pagination page={page} pages={pages} total={total} onPage={setPage} />
            
                   
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}