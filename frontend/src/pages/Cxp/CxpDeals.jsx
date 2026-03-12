import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeads, fetchSalesmen } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { Spinner } from '../../components/UI';
import { SOURCE_CFG } from '../../config/leadsConfig';
import { fmtDate, acolor, av2 } from '../../utils/leadsUtils';
import { RefreshCw, Search, AlertCircle, Filter, X , LayoutGrid, List,Kanban} from 'lucide-react';
import Pagination from '../../components/leads/Pagination'; 
import LeadCard    from '../../components/leads/LeadCard';
import TableView   from '../../components/leads/TableView';
import KanbanView  from '../../components/leads/KanbanView';

import '../../styles/CxpDeals.css';

const PAGE_SIZE = 10;

function shortId(id) { return String(id).slice(-6).toUpperCase(); }

export default function CxpLeads() {
  const navigate = useNavigate();
  const socket   = useSocket();

  const [leads,          setLeads]          = useState([]);
  const [salesmen,       setSalesmen]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [page,           setPage]           = useState(1);
  const [pages,          setPages]          = useState(1);
  const [total,          setTotal]          = useState(0);
  const [search,         setSearch]         = useState('');
  const [searchInput,    setSearchInput]    = useState('');
  const [filterSalesman, setFilterSalesman] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [view,         setView]         = useState('table');

  const debounceTimer = useRef(null);
  const loadRef       = useRef(null);

  useEffect(() => {
    fetchSalesmen().then(r => setSalesmen(r.data || r || [])).catch(() => {});
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        status: 'DealClosed',
        ...(search         && { search }),
        ...(filterSalesman && { assignedTo: filterSalesman }),
        ...(filterDateFrom && { dateFrom: filterDateFrom }),
        ...(filterDateTo   && { dateTo: filterDateTo }),
      };
      const res = await fetchLeads(params);
      setLeads(res.data  || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, filterSalesman, filterDateFrom, filterDateTo]);

  loadRef.current = load;
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    socket.on('lead:updated', reload);
    socket.on('lead:deleted', reload);
    return () => { socket.off('lead:updated', reload); socket.off('lead:deleted', reload); };
  }, [socket]);

  function handleSearch(val) {
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  }

  function clearFilters() {
    setFilterSalesman(''); setFilterDateFrom(''); setFilterDateTo('');
    setSearch(''); setSearchInput(''); setPage(1);
  }

  const hasFilters = filterSalesman || filterDateFrom || filterDateTo || search;

  return (
    <div className="cxp-root">

      <div className="cxp-header">
        <div className="cxp-header__left">
          <div className="cxp-header__eyebrow">Customer Experience</div>
          <h1 className="cxp-header__title">Deal Closed Leads</h1>
          <p className="cxp-header__sub">{loading ? '…' : `${total} lead${total !== 1 ? 's' : ''} to process`}</p>
        </div>
        <button className="cxp-btn cxp-btn--ghost" onClick={() => load(false)}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="lm-toolbar">
        <div className="lm-search">
          <span size={14} className="lm-search__icon" />🔍
          <input className="lm-search__input" placeholder="Search by name, email, phone…"
            value={searchInput} onChange={e => handleSearch(e.target.value)} />
          {searchInput && (
            <button className="lm-search__clear" onClick={() => handleSearch('')}><X size={12} /></button>
          )}
        </div>
        <button className={`cxp-btn cxp-btn--filter${filtersOpen ? ' cxp-btn--filter-active' : ''}`}
          onClick={() => setFiltersOpen(v => !v)}>
          <Filter size={14} /> Filters {hasFilters && <span className="cxp-filter-dot" />}
        </button>
        {hasFilters && (
          <button className="cxp-btn cxp-btn--ghost" onClick={clearFilters}><X size={13} /> Clear</button>
        )}
         <div className="lm-view-toggle">
          <button className={`lm-view-btn${view === 'table'  ? ' active' : ''}`}
            onClick={() => setView('table')}  title="Vue tableau"><List size={15} /></button>
          <button className={`lm-view-btn${view === 'cards'  ? ' active' : ''}`}
            onClick={() => setView('cards')}  title="Vue cartes"><LayoutGrid size={15} /></button>
          <button className={`lm-view-btn${view === 'kanban' ? ' active' : ''}`}
            onClick={() => setView('kanban')} title="Vue Kanban"><Kanban size={15} /></button>
        </div>
      </div>

      {filtersOpen && (
        <div className="cxp-filters">
          <div className="cxp-filter-group">
            <label className="cxp-filter-label">Salesman</label>
            <select className="cxp-filter-select" value={filterSalesman}
              onChange={e => { setFilterSalesman(e.target.value); setPage(1); }}>
              <option value="">All salesmen</option>
              {salesmen.map(s => (
                <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div className="cxp-filter-group">
            <label className="cxp-filter-label">From date</label>
            <input type="date" className="cxp-filter-select" value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="cxp-filter-group">
            <label className="cxp-filter-label">To date</label>
            <input type="date" className="cxp-filter-select" value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      )}

      {loading && leads.length === 0 ? (
        <div className="cxp-loading"><Spinner size={28} /><span>Loading deals…</span></div>
      ) : error ? (
        <div className="cxp-error"><AlertCircle size={18} /><span>{error}</span>
          <button className="cxp-btn cxp-btn--ghost" onClick={() => load()}>Retry</button>
        </div>
      ) : leads.length === 0 ? (
        <div className="cxp-empty">
          <div className="cxp-empty__icon">🎯</div>
          <p className="cxp-empty__title">No closed deals found</p>
          <p className="cxp-empty__sub">{hasFilters ? 'Try adjusting your filters.' : 'Closed deals will appear here.'}</p>
        </div>
      ) : (
         <>
                  {/* {view === 'kanban' && (
                    <KanbanView
                      leads={leads}
                      basePath="/cxp/leads"
                    />
                  )} */}
        
                  {view === 'cards' && (
                    <div className="leads-cards-grid">
                      {leads.map((l) => (
                        <LeadCard key={l._id} lead={l} basePath="/cxp/leads" showAddNote={true} />
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
                      basePath="/cxp/leads"
                      showPreview={false}
                      showAddNote={true}
                    />
                  )}
        
                  {view !== 'kanban' && (
                    <Pagination page={page} pages={pages} total={total} onPage={setPage} />
                  )}
                </>
              
      )}

                  <Pagination page={page} pages={pages} total={total} onPage={setPage} />
      
    </div>
  );
}