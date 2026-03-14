import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchDeals } from '../../api/cxpApi';
import { fetchSalesmen } from '../../api/leadsApi';
import { useSocket } from '../../context/SocketContext';
import { Av, StatusBadge, SourceBadge, Spinner } from '../../components/UI';
import { acolor, av2, fullName } from '../../utils/leadsUtils';
import { RefreshCw, AlertCircle, Filter, X, LayoutGrid, List } from 'lucide-react';
import Pagination from '../../components/leads/Pagination';
import '../../styles/CxpDeals.css';

const PAGE_SIZE = 10;

// ── Config statuts ────────────────────────────────────────────────────────────
const DEAL_CFG = {
  En_Attente: { bg: '#fef9c3', color: '#854d0e', label: 'Deal en attente' },
  Confirmé:   { bg: '#dcfce7', color: '#166534', label: 'Deal confirmé'   },
  Annulé:     { bg: '#fee2e2', color: '#991b1b', label: 'Deal annulé'     },
};

const CMD_CFG = {
  En_Attente:     { bg: '#fef9c3', color: '#854d0e', label: 'Cmd en attente'   },
  Confirmé:       { bg: '#dcfce7', color: '#166534', label: 'Cmd confirmée'    },
  En_Preparation: { bg: '#e0f2fe', color: '#075985', label: 'En préparation'   },
  En_Transit:     { bg: '#ede9fe', color: '#5b21b6', label: 'En transit'       },
  Livré:          { bg: '#d1fae5', color: '#065f46', label: 'Livrée ✓'         },
};

function Badge({ cfg }) {
  if (!cfg) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Table (même style que TableView salesman/sales-leader) ───────────────────
function CxpTable({ items, onRowClick }) {
  return (
    <div className="table-wrap">
      <table className="leads-table">
        <thead>
          <tr>
            {['#ID', 'Nom complet', 'Téléphone',   'Assigné', 'Deal', 'Commande', 'Code recharge', ''].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const lead     = item.lead     || item;
            const deal     = item.deal     || null;
            const commande = item.commande || null;

            return (
              <tr key={lead._id} onClick={() => onRowClick(lead._id)}>

                {/* #ID */}
                <td>
                  <span className="table-id">
                    {String(lead._id).slice(-6).toUpperCase()}
                  </span>
                </td>

                {/* Nom complet */}
                <td>
                  <div className="table-lead-cell">
                    <Av
                      id={lead._id} size={32} radius={8}
                      label={`${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase()}
                    />
                    <div>
                      <div className="table-lead-name">{lead.firstName} {lead.lastName}</div>
                      {/* <div className="table-contact-email">{lead.email || '—'}</div> */}
                    </div>
                  </div>
                </td>

                {/* Téléphone */}
                <td>
                  <span className="table-contact-phone">{lead.phone || '—'}</span>
                </td>

                {/* Source */}
                {/* <td><SourceBadge source={lead.source} /></td> */}

                {/* Statut lead */}
                {/* <td><StatusBadge status={lead.status} /></td> */}

                {/* Assigné */}
                <td onClick={e => e.stopPropagation()}>
                  <div className="table-assigned">
                    {lead.assignedTo ? (
                      <>
                        <div className="btn-avatar"
                          style={{ background: acolor(lead.assignedTo._id) }}>
                          {av2(lead.assignedTo)}
                        </div>
                        <span className="table-assigned-name">
                          {fullName(lead.assignedTo)}
                        </span>
                      </>
                    ) : (
                      <span className="table-assigned-name--empty">Non assigné</span>
                    )}
                  </div>
                </td>

                {/* Deal */}
                <td><Badge cfg={DEAL_CFG[deal?.status] || DEAL_CFG.En_Attente} /></td>

                {/* Commande */}
                <td>
                  {commande
                    ? <Badge cfg={CMD_CFG[commande.status] || CMD_CFG.En_Attente} />
                    : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>}
                </td>

                {/* Code recharge */}
                <td onClick={e => e.stopPropagation()}>
                  {commande?.rechargeCode ? (
                    <span className="table-notes-btn table-notes-btn--has"
                      style={{ fontFamily: 'monospace', letterSpacing: '.3px' }}
                      title={commande.rechargeCode}>
                      {commande.rechargeCode}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                  )}
                </td>

                {/* Action */}
                <td>
                  <button className="btn-cancel btn-cancel--sm"
                    onClick={e => { e.stopPropagation(); onRowClick(lead._id); }}>
                    Voir →
                  </button>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="table-empty">Aucun deal trouvé</div>
      )}
    </div>
  );
}

// ── Vue cards ─────────────────────────────────────────────────────────────────
function CxpCard({ item, onClick }) {
  const lead     = item.lead     || item;
  const deal     = item.deal     || null;
  const commande = item.commande || null;

  return (
    <div className="cxp-card" onClick={() => onClick(lead._id)}>

      {/* Zone principale */}
      <div className="cxp-card__body">

        {/* Header : avatar + ID */}
        <div className="cxp-card__header">
          <div className="cxp-card__av">
            {(lead.firstName?.[0] || '') + (lead.lastName?.[0] || '')}
          </div>
          <div className="cxp-card__id">#{String(lead._id).slice(-6).toUpperCase()}</div>
        </div>

        {/* Nom */}
        <div className="cxp-card__name">{lead.firstName} {lead.lastName}</div>

        {/* Contact */}
        <div className="cxp-card__meta">📞 {lead.phone}</div>
        {/* {lead.email && <div className="cxp-card__meta">✉ {lead.email}</div>} */}
        {/* {lead.city  && <div className="cxp-card__meta">📍 {lead.city}{lead.country ? `, ${lead.country}` : ''}</div>} */}

        {/* Badges statuts */}
        <div className="cxp-card__badges">
          <Badge cfg={DEAL_CFG[deal?.status] || DEAL_CFG.En_Attente} />
          {commande && <Badge cfg={CMD_CFG[commande.status] || CMD_CFG.En_Attente} />}
        </div>

        {/* Code recharge */}
        {commande?.rechargeCode && (
          <div className="cxp-card__code">{commande.rechargeCode}</div>
        )}

      </div>

      {/* Footer */}
      <div className="cxp-card__footer">
        <span className="cxp-card__salesman">
          {lead.assignedTo
            ? `👤 ${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
            : '— Non assigné'}
        </span>
        <button className="cxp-btn cxp-btn--sm"
          onClick={e => { e.stopPropagation(); onClick(lead._id); }}>
          Détail →
        </button>
      </div>

    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CxpDeals() {
  const navigate = useNavigate();
  const socket   = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items,          setItems]          = useState([]);
  const [salesmen,       setSalesmen]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [page,           setPage]           = useState(1);
  const [pages,          setPages]          = useState(1);
  const [total,          setTotal]          = useState(0);
  const [search,         setSearch]         = useState('');
  const [searchInput,    setSearchInput]    = useState('');
  const [filterSalesman, setFilterSalesman] = useState('');
  const [filterDeal,     setFilterDeal]     = useState(searchParams.get('dealStatus') || '');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [view,           setView]           = useState('table');

  const debounceTimer = useRef(null);
  const loadRef       = useRef(null);

  useEffect(() => {
    fetchSalesmen()
      .then(r => setSalesmen(Array.isArray(r) ? r : r.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search         && { search }),
        ...(filterSalesman && { assignedTo: filterSalesman }),
        ...(filterDeal     && { dealStatus: filterDeal }),
        ...(filterDateFrom && { dateFrom:   filterDateFrom }),
        ...(filterDateTo   && { dateTo:     filterDateTo }),
      };
      const res = await fetchDeals(params);
      // res = { total, page, pages, data: [{lead, deal, commande}, ...] }
      setItems(res.data  || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, filterSalesman, filterDeal, filterDateFrom, filterDateTo]);

  loadRef.current = load;
  useEffect(() => { load(); }, [load]);

  // Temps réel : recharger si un deal ou commande change
  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    socket.on('lead:updated',     reload);
    socket.on('deal:updated',     reload);
    socket.on('commande:updated', reload);
    return () => {
      socket.off('lead:updated',     reload);
      socket.off('deal:updated',     reload);
      socket.off('commande:updated', reload);
    };
  }, [socket]);

  function handleSearch(val) {
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  }

  function handleDealFilter(val) {
    setFilterDeal(val);
    setPage(1);
    setSearchParams(val ? { dealStatus: val } : {});
  }

  function clearFilters() {
    setFilterSalesman('');
    setFilterDeal('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
    setSearchInput('');
    setPage(1);
    setSearchParams({});
  }

  const hasFilters = search || filterSalesman || filterDeal || filterDateFrom || filterDateTo;

  return (
    <div className="cxp-root">

      {/* ── Header ── */}
      <div className="cxp-header">
        <div className="cxp-header__left">
          <div className="cxp-header__eyebrow">Customer Experience</div>
          <h1 className="cxp-header__title">Deals Clôturés</h1>
          <p className="cxp-header__sub">
            {loading ? '…' : `${total} deal${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="cxp-btn cxp-btn--ghost" onClick={() => load(false)}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="lm-toolbar">
        <div className="lm-search">
          <span className="lm-search__icon">🔍</span>
          <input
            className="lm-search__input"
            placeholder="Rechercher par nom, email, téléphone…"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
          />
          {searchInput && (
            <button className="lm-search__clear" onClick={() => handleSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        <button
          className={`cxp-btn cxp-btn--filter${filtersOpen ? ' cxp-btn--filter-active' : ''}`}
          onClick={() => setFiltersOpen(v => !v)}
        >
          <Filter size={14} /> Filtres
          {hasFilters && <span className="cxp-filter-dot" />}
        </button>

        {hasFilters && (
          <button className="cxp-btn cxp-btn--ghost" onClick={clearFilters}>
            <X size={13} /> Réinitialiser
          </button>
        )}

        <div className="lm-view-toggle">
          <button className={`lm-view-btn${view === 'table' ? ' active' : ''}`}
            onClick={() => setView('table')} title="Tableau">
            <List size={15} />
          </button>
          <button className={`lm-view-btn${view === 'cards' ? ' active' : ''}`}
            onClick={() => setView('cards')} title="Cartes">
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {/* ── Filtres ── */}
      {filtersOpen && (
        <div className="cxp-filters">
          <div className="cxp-filter-group">
            <label className="cxp-filter-label">Salesman</label>
            <select className="cxp-filter-select" value={filterSalesman}
              onChange={e => { setFilterSalesman(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              {salesmen.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="cxp-filter-group">
            <label className="cxp-filter-label">Statut Deal</label>
            <select className="cxp-filter-select" value={filterDeal}
              onChange={e => handleDealFilter(e.target.value)}>
              <option value="">Tous</option>
              <option value="En_Attente">En Attente</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Annulé">Annulé</option>
            </select>
          </div>

          <div className="cxp-filter-group">
            <label className="cxp-filter-label">Du</label>
            <input type="date" className="cxp-filter-select" value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
          </div>

          <div className="cxp-filter-group">
            <label className="cxp-filter-label">Au</label>
            <input type="date" className="cxp-filter-select" value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      )}

      {/* ── Contenu ── */}
      {loading && items.length === 0 ? (
        <div className="cxp-loading"><Spinner size={28} /><span>Chargement…</span></div>
      ) : error ? (
        <div className="cxp-error">
          <AlertCircle size={18} /><span>{error}</span>
          <button className="cxp-btn cxp-btn--ghost" onClick={() => load()}>Réessayer</button>
        </div>
      ) : items.length === 0 ? (
        <div className="cxp-empty">
          <div className="cxp-empty__icon">🎯</div>
          <p className="cxp-empty__title">Aucun deal trouvé</p>
          <p className="cxp-empty__sub">
            {hasFilters ? 'Ajustez vos filtres.' : 'Les deals apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <>
          {view === 'table' && (
            <CxpTable
              items={items}
              onRowClick={id => navigate(`/cxp/leads/${id}`)}
            />
          )}
          {view === 'cards' && (
            <div className="cxp-cards-grid">
              {items.map(item => {
                const lead = item.lead || item;
                return (
                  <CxpCard
                    key={lead._id}
                    item={item}
                    onClick={id => navigate(`/cxp/leads/${id}`)}
                  />
                );
              })}
            </div>
          )}
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}