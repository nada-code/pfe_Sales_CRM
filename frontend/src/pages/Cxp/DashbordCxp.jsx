import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCxpStats, fetchDeals } from '../../api/cxpApi';
import { Spinner } from '../../components/UI';
import {
  CheckCircle2, Package, Truck, AlertCircle,
  ArrowRight, RefreshCw, ShoppingBag, Clock
} from 'lucide-react';
import '../../styles/CxpDashboard.css';

// ── Statut deal badge ─────────────────────────────────────────────────────────
const DEAL_CFG = {
  En_Attente: { bg: '#fef9c3', color: '#854d0e', label: 'En Attente' },
  Confirmé:   { bg: '#dcfce7', color: '#166534', label: 'Confirmé'   },
  Annulé:     { bg: '#fee2e2', color: '#991b1b', label: 'Annulé'     },
};

function DealBadge({ status }) {
  const cfg = DEAL_CFG[status] || DEAL_CFG.En_Attente;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      className="cxp-dash-stat"
      style={{ '--accent': color }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="cxp-dash-stat__icon" style={{ background: color + '20', color }}>
        {icon}
      </div>
      <div className="cxp-dash-stat__body">
        <div className="cxp-dash-stat__value">{value ?? '—'}</div>
        <div className="cxp-dash-stat__label">{label}</div>
        {sub && <div className="cxp-dash-stat__sub">{sub}</div>}
      </div>
      {onClick && <ArrowRight size={14} className="cxp-dash-stat__arrow" />}
    </div>
  );
}

export default function DashbordCxp() {
  const navigate = useNavigate();

  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);  // items: { lead, deal, commande }
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [statsData, dealsData] = await Promise.all([
        fetchCxpStats(),
        fetchDeals({ page: 1, limit: 6 }),
      ]);
      setStats(statsData);
      // chaque item = { lead:{...}, deal:{...}|null, commande:{...}|null }
      setRecent(dealsData?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="cxp-dash-loading"><Spinner size={30} /><span>Chargement…</span></div>
  );

  return (
    <div className="cxp-dash-root">

      {/* ── Header ── */}
      <div className="cxp-dash-header">
        <div>
          <div className="cxp-dash-header__eyebrow">Customer Experience</div>
          <h1 className="cxp-dash-header__title">Dashboard CXP</h1>
          <p className="cxp-dash-header__sub">Vue d'ensemble des deals, commandes et livraisons</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="cxp-dash-header__date">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
          <button className="cxp-dash-refresh" onClick={() => load(true)} title="Actualiser">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && <div className="cxp-dash-error"><AlertCircle size={16} /> {error}</div>}

      {/* ── KPI — Deals ── */}
      <div className="cxp-dash-section">
        <h2 className="cxp-dash-section__title">Deals</h2>
        <div className="cxp-dash-stats">
          <StatCard
            icon={<CheckCircle2 size={20}/>}
            label="Total Deals" color="#0ea5e9"
            value={stats?.deals?.total}
            sub="Leads DealClosed"
            onClick={() => navigate('/cxp/deals')}
          />
          <StatCard
            icon={<Clock size={20}/>}
            label="En Attente" color="#f59e0b"
            value={stats?.deals?.enAttente}
            sub="À confirmer ou annuler"
            onClick={() => navigate('/cxp/deals?dealStatus=En_Attente')}
          />
          <StatCard
            icon={<CheckCircle2 size={20}/>}
            label="Confirmés" color="#10b981"
            value={stats?.deals?.confirmes}
            sub="Deals traités"
            onClick={() => navigate('/cxp/deals?dealStatus=Confirmé')}
          />
          <StatCard
            icon={<AlertCircle size={20}/>}
            label="Annulés" color="#ef4444"
            value={stats?.deals?.annules}
            sub="Deals annulés"
          />
        </div>
      </div>

      {/* ── KPI — Commandes ── */}
      <div className="cxp-dash-section">
        <h2 className="cxp-dash-section__title">Commandes</h2>
        <div className="cxp-dash-stats">
          <StatCard
            icon={<ShoppingBag size={20}/>}
            label="En Attente" color="#f59e0b"
            value={stats?.commandes?.enAttente}
            sub="À confirmer"
          />
          <StatCard
            icon={<Package size={20}/>}
            label="En Préparation" color="#6366f1"
            value={stats?.commandes?.enPreparation}
            sub="En cours de préparation"
          />
          <StatCard
            icon={<Truck size={20}/>}
            label="En Transit" color="#8b5cf6"
            value={stats?.commandes?.enTransit}
            sub="En cours de livraison"
          />
          <StatCard
            icon={<CheckCircle2 size={20}/>}
            label="Livrées" color="#10b981"
            value={stats?.commandes?.livrees}
            sub="Commandes livrées"
            onClick={() => navigate('/cxp/deliveries?status=Livré')}
          />
        </div>
      </div>

      {/* ── KPI — Livraisons ── */}
      <div className="cxp-dash-section">
        <h2 className="cxp-dash-section__title">Livraisons</h2>
        <div className="cxp-dash-stats cxp-dash-stats--3">
          <StatCard
            icon={<Truck size={20}/>}
            label="En Transit" color="#6366f1"
            value={stats?.livraisons?.enTransit}
            sub="Colis en route"
            onClick={() => navigate('/cxp/deliveries?status=En_Transit')}
          />
          <StatCard
            icon={<CheckCircle2 size={20}/>}
            label="Livrées" color="#10b981"
            value={stats?.livraisons?.livrees}
            sub="Livraisons réussies"
            onClick={() => navigate('/cxp/deliveries?status=Livré')}
          />
          <StatCard
            icon={<AlertCircle size={20}/>}
            label="Échouées" color="#ef4444"
            value={stats?.livraisons?.echouees}
            sub="À retraiter"
            onClick={() => navigate('/cxp/deliveries?status=Echoué')}
          />
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <div className="cxp-dash-section">
        <h2 className="cxp-dash-section__title">Actions Rapides</h2>
        <div className="cxp-dash-actions">
          <button className="cxp-dash-action" onClick={() => navigate('/cxp/deals')}>
            <div className="cxp-dash-action__icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <CheckCircle2 size={22}/>
            </div>
            <div>
              <div className="cxp-dash-action__label">Gérer les Deals</div>
              <div className="cxp-dash-action__sub">Confirmer, annuler, créer commandes</div>
            </div>
            <ArrowRight size={16} className="cxp-dash-action__arrow"/>
          </button>
          <button className="cxp-dash-action" onClick={() => navigate('/cxp/deliveries')}>
            <div className="cxp-dash-action__icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Truck size={22}/>
            </div>
            <div>
              <div className="cxp-dash-action__label">Suivi Livraisons</div>
              <div className="cxp-dash-action__sub">Tracker les colis, mettre à jour les statuts</div>
            </div>
            <ArrowRight size={16} className="cxp-dash-action__arrow"/>
          </button>
        </div>
      </div>

      {/* ── Derniers deals ── */}
      <div className="cxp-dash-section">
        <div className="cxp-dash-section__header">
          <h2 className="cxp-dash-section__title">Derniers Deals</h2>
          <button className="cxp-dash-see-all" onClick={() => navigate('/cxp/deals')}>
            Voir tout <ArrowRight size={13}/>
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="cxp-dash-empty">
            <AlertCircle size={16}/> Aucun deal récent.
          </div>
        ) : (
          <div className="cxp-dash-recent">
            {recent.map(item => {
              // item = { lead, deal, commande } depuis l'API
              const lead     = item.lead     || item;
              const deal     = item.deal     || null;
              const commande = item.commande || null;
              return (
                <div key={lead._id} className="cxp-dash-recent__row"
                  onClick={() => navigate(`/cxp/leads/${lead._id}`)}>
                  <div className="cxp-dash-recent__av">
                    {(lead.firstName?.[0] || '') + (lead.lastName?.[0] || '')}
                  </div>
                  <div className="cxp-dash-recent__info">
                    <div className="cxp-dash-recent__name">
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="cxp-dash-recent__meta">
                      {lead.phone} · {lead.city || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <DealBadge status={deal?.status || 'En_Attente'} />
                    {commande && (
                      <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>
                        Cmd: {commande.status}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }}/>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}