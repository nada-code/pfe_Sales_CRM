import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchLeads, fetchStats, changeStatus } from '../../api/leadsApi';
import { useSocket } from '../../context/Socketcontext';
import LeadCard    from '../../components/leads/LeadCard';
import TableView   from '../../components/leads/TableView';
import KanbanView  from '../../components/leads/KanbanView';
import ExportModal from '../../components/modals/ExportModal';
import Pagination  from '../../components/leads/Pagination';
import { Spinner, Toast } from '../../components/UI';
import { STATUS_CFG, SOURCE_CFG, PAGE_SIZE } from '../../config/leadsConfig';
import { RefreshCw, Search, LayoutGrid, List, AlertCircle, Kanban, Download } from 'lucide-react';
import '../../styles/leads.css';
import '../../styles/LeadsManagementStyles.css';

export default function MyLeads() {
  const socket = useSocket();

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
  const [filterSource, setFilterSource] = useState('');
  const [view,         setView]         = useState('table');
  const [toast,        setToast]        = useState(null);
  const [exportModal,  setExportModal]  = useState(false);

  const debounceTimer = useRef(null);
  const loadRef       = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterSource && { source: filterSource }),
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
  }, [page, search, filterStatus, filterSource]);

  loadRef.current = load;
  useEffect(() => { load(); }, [load]);

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

  function handleSearchInput(val) {
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  }

  async function handleStatusChange(leadId, newStatus, e) {
    e?.stopPropagation();
    try {
      await changeStatus(leadId, newStatus);
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to update status' });
    }
  }

  const statsMap = Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count]));

  return (
    <div className="lm-root">

      {/* Header */}
      <div className="lm-header">
        <div>
          <h1 className="lm-title">Mes Leads</h1>
          <p className={`lm-subtitle${error ? ' lm-subtitle--danger' : ''}`}>
            {error ? `⚠ ${error}` : `${total} lead${total > 1 ? 's' : ''} assigné${total > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="lm-header__actions">
          <button className="lm-btn lm-btn--ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'lm-spin' : ''} />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <button className="lm-btn lm-btn--ghost" onClick={() => setExportModal(true)}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="lm-stats">
        {Object.entries(STATUS_CFG).map(([k, v], i) => (
          <button
            key={k}
            className={`lm-stat-card${filterStatus === k ? ' lm-stat-card--active' : ''}`}
            style={{ '--sc': v.color, '--sl': v.light, animationDelay: `${i * 55}ms` }}
            onClick={() => { setFilterStatus(filterStatus === k ? '' : k); setPage(1); }}
          >
            <div className="lm-stat-card__top">
              <span className="lm-stat-dot" style={{ background: v.color }} />
              <span className="lm-stat-label">{v.label}</span>
            </div>
            <p className="lm-stat-count" style={{ color: v.color }}>
              {loading ? '—' : (statsMap[k] ?? 0)}
            </p>
            {filterStatus === k && <div className="lm-stat-card__bar" style={{ background: v.color }} />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="lm-toolbar">
        <div className="lm-search">
          <span size={14} className="lm-search__icon" />🔍
          <input
            className="lm-search__input"
            placeholder="Recherche par nom, email, téléphone…"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="lm-search__clear"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>✕</button>
          )}
        </div>

        <select className="lm-filter-select" value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="lm-filter-select" value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}>
          <option value="">Toutes les sources</option>
          {Object.entries(SOURCE_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div className="lm-view-toggle">
          <button className={`lm-view-btn${view === 'table'  ? ' active' : ''}`}
            onClick={() => setView('table')}  title="Vue tableau"><List size={15} /></button>
          <button className={`lm-view-btn${view === 'cards'  ? ' active' : ''}`}
            onClick={() => setView('cards')}  title="Vue cartes"><LayoutGrid size={15} /></button>
          <button className={`lm-view-btn${view === 'kanban' ? ' active' : ''}`}
            onClick={() => setView('kanban')} title="Vue Kanban"><Kanban size={15} /></button>
        </div>
      </div>

      {/* Count */}
      <div className="lm-count">
        {loading && <Spinner size={12} />}
        <span>
          {leads.length} / {total} leads
          {filterStatus && ` · ${STATUS_CFG[filterStatus]?.label}`}
          {filterSource && ` · ${SOURCE_CFG[filterSource]?.label}`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="lm-error">
          <AlertCircle size={14} /> {error}
          <button className="lm-error__retry" onClick={() => load()}>Réessayer</button>
        </div>
      )}

      {/* Skeletons */}
      {loading && leads.length === 0 && (
        <div className="lm-skel-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="lm-skel-card">
              <div className="lm-skel-bar" />
              <div className="lm-skel-line lm-skel-line--w60" />
              <div className="lm-skel-line lm-skel-line--w40" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {(!loading || leads.length > 0) && (
        <>
          {view === 'kanban' && (
            <KanbanView
              leads={leads}
              basePath="/salesman/leads"
              onStatusChange={handleStatusChange}
            />
          )}

          {view === 'cards' && (
            <div className="leads-cards-grid">
              {leads.map((l) => (
                <LeadCard key={l._id} lead={l} basePath="/salesman/leads" showAddNote={true} />
              ))}
              {leads.length === 0 && !loading && (
                <div className="lm-empty">
                  <div className="lm-empty__icon">🔍</div>
                  <p className="lm-empty__title">Aucun lead trouvé</p>
                  <p className="lm-empty__hint">Essayez d'ajuster vos filtres</p>
                </div>
              )}
            </div>
          )}

          {view === 'table' && (
            <TableView
              leads={leads}
              basePath="/salesman/leads"
              onStatusChange={handleStatusChange}
              showPreview={false}
              showAddNote={true}
            />
          )}

          {view !== 'kanban' && (
            <Pagination page={page} pages={pages} total={total} onPage={setPage} />
          )}
        </>
      )}

      {/* Modals */}
      {exportModal && (
        <ExportModal
          currentLeads={leads}
          totalLeads={total}
          filters={{ status: filterStatus, source: filterSource }}
          onClose={() => setExportModal(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}