import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchDeliveries, trackDelivery } from '../../api/cxpApi';
import {
  Package, Truck, RefreshCw, CheckCircle2,
  AlertCircle, Clock, ArrowRight
} from 'lucide-react';
import { Spinner } from '../../components/UI';
import '../../styles/CxpDeliveries.css';

// ── Config ────────────────────────────────────────────────────────────────────
const COMPANIES = {
  aramex:    { name: 'Aramex',    logo: '🚚' },
  dhl:       { name: 'DHL',       logo: '📦' },
  colissimo: { name: 'Colissimo', logo: '🏪' },
  laposte:   { name: 'La Poste',  logo: '✉️' },
};

const STATUS_CFG = {
  En_Preparation: { bg: '#e0f2fe', color: '#075985', label: 'En Préparation', icon: '📦' },
  En_Transit:     { bg: '#ede9fe', color: '#5b21b6', label: 'En Transit',      icon: '🚚' },
  Livré:          { bg: '#d1fae5', color: '#065f46', label: 'Livré ✓',         icon: '✅' },
  Echoué:         { bg: '#fee2e2', color: '#991b1b', label: 'Échoué',          icon: '❌' },
};

const FILTERS = [
  { key: 'all',            label: 'Tous',           icon: <Package size={15}/>,      color: '#475569' },
  { key: 'En_Preparation', label: 'En Préparation', icon: <Package size={15}/>,      color: '#0284c7' },
  { key: 'En_Transit',     label: 'En Transit',     icon: <Truck size={15}/>,        color: '#7c3aed' },
  { key: 'Livré',          label: 'Livrés',         icon: <CheckCircle2 size={15}/>, color: '#059669' },
  { key: 'Echoué',         label: 'Échoués',        icon: <AlertCircle size={15}/>,  color: '#dc2626' },
];

export default function CxpDeliveries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter,     setFilter]     = useState(searchParams.get('status') || 'all');
  const [deliveries, setDeliveries] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 15 };
      if (filter !== 'all') params.status = filter;
      const res = await fetchDeliveries(params);
      // res.data = [{
      //   _id, trackingNumber, company, status,
      //   estimatedDeliveryAt, lastTrackedAt,
      //   lead: { firstName, lastName, phone, city },
      //   commande: { status, rechargeCode }
      // }]
      setDeliveries(res.data  || []);
      setTotal(res.total      || 0);
      setPages(res.pages      || 1);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  function handleFilterChange(key) {
    setFilter(key);
    setPage(1);
    setSearchParams(key !== 'all' ? { status: key } : {});
  }

  async function handleRefreshOne(leadId, trackingNumber) {
    setRefreshing(p => ({ ...p, [trackingNumber]: true }));
    try {
      // trackDelivery(leadId) — auto-track via fake API
      await trackDelivery(leadId);
      await load(true);
    } catch {
      // fail silently on tracking errors
    } finally {
      setRefreshing(p => ({ ...p, [trackingNumber]: false }));
    }
  }

  async function handleRefreshAll() {
    for (const d of deliveries) {
      if (d.lead?._id && d.trackingNumber) {
        await handleRefreshOne(d.lead._id, d.trackingNumber);
      }
    }
  }

  return (
    <div className="cxp-del-root">

      {/* ── Header ── */}
      <div className="cxp-del-header">
        <div>
          <div className="cxp-del-header__eyebrow">Customer Experience</div>
          <h1 className="cxp-del-header__title">Suivi des Livraisons</h1>
          <p className="cxp-del-header__sub">{total} colis enregistrés</p>
        </div>
        <button className="cxp-del-btn cxp-del-btn--ghost"
          onClick={handleRefreshAll} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser tout
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="cxp-del-stats">
        {FILTERS.map(f => (
          <button key={f.key}
            className={`cxp-del-stat${filter === f.key ? ' active' : ''}`}
            style={filter === f.key
              ? { borderColor: f.color, color: f.color, background: f.color + '12' }
              : {}}
            onClick={() => handleFilterChange(f.key)}>
            <span style={{ color: f.color }}>{f.icon}</span>
            <span className="cxp-del-stat__label">{f.label}</span>
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div className="cxp-del-loading"><Spinner size={28}/><span>Chargement…</span></div>
      ) : error ? (
        <div className="cxp-del-error">
          <AlertCircle size={16}/> {error}
          <button className="cxp-del-btn cxp-del-btn--ghost" onClick={() => load()}>
            Réessayer
          </button>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="cxp-del-empty">
          <div className="cxp-del-empty__icon">📦</div>
          <p className="cxp-del-empty__title">
            {total === 0 ? 'Aucun colis créé' : 'Aucun colis pour ce filtre'}
          </p>
          <p className="cxp-del-empty__sub">
            {total === 0
              ? 'Créez des livraisons depuis les pages de détail.'
              : 'Modifiez le filtre.'}
          </p>
          {total === 0 && (
            <button className="cxp-del-btn cxp-del-btn--primary"
              onClick={() => navigate('/cxp/deals')}>
              Aller aux Deals →
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="cxp-del-list">
            {deliveries.map(delivery => {
              // delivery = { _id, trackingNumber, company, status, lead:{...}, commande:{...}, ... }
              const lead        = delivery.lead     || {};
              const commande    = delivery.commande || null;
              const statusCfg   = STATUS_CFG[delivery.status] || STATUS_CFG.En_Preparation;
              const co          = COMPANIES[delivery.company];
              const trackLoad   = refreshing[delivery.trackingNumber];

              return (
                <div key={delivery._id} className="cxp-del-item">
                  <div className="cxp-del-item__left">
                    <div className="cxp-del-item__company">
                      {co?.logo} {co?.name || delivery.company}
                    </div>
                    <div className="cxp-del-item__name">
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="cxp-del-item__track">
                      {delivery.trackingNumber}
                    </div>
                    {commande?.rechargeCode && (
                      <div className="cxp-del-item__code">
                        🔑 {commande.rechargeCode}
                      </div>
                    )}
                    {delivery.lastTrackedAt && (
                      <div className="cxp-del-item__updated">
                        <Clock size={11}/>
                        {new Date(delivery.lastTrackedAt).toLocaleString('fr-FR', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>

                  <div className="cxp-del-item__right">
                    <span className="cxp-del-item__status"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                    {delivery.estimatedDeliveryAt && (
                      <div className="cxp-del-item__eta">
                        📅 {new Date(delivery.estimatedDeliveryAt).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    <div className="cxp-del-item__actions">
                      <button className="cxp-del-btn cxp-del-btn--sm"
                        onClick={() => handleRefreshOne(lead._id, delivery.trackingNumber)}
                        disabled={trackLoad || !lead._id}>
                        <RefreshCw size={11} className={trackLoad ? 'spin' : ''}/>
                        {trackLoad ? '…' : 'Tracker'}
                      </button>
                      <button className="cxp-del-btn cxp-del-btn--sm cxp-del-btn--detail"
                        onClick={() => navigate(`/cxp/leads/${lead._id}`)}>
                        Détail <ArrowRight size={11}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="cxp-del-pagination">
              <button className="cxp-del-btn cxp-del-btn--ghost"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Précédent
              </button>
              <span>Page {page} / {pages}</span>
              <button className="cxp-del-btn cxp-del-btn--ghost"
                disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}