import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Users, Target,
  ChevronRight, MoreHorizontal, Award,
  ArrowUpRight, Zap, Clock, CheckCircle2,
  RefreshCw, AlertCircle,
  Users2Icon,
} from "lucide-react";
import { fetchStats, fetchLeads, fetchSalesmen } from "../../api/leadsApi";
import { onLeadUpdate } from "../../utils/leadEvents";
import "../../styles/DashboardStyles.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "new",         label: "Prospection",  color: "#e0e7ff" },
  { key: "contacted",   label: "Qualification", color: "#c7d2fe" },
  { key: "in_progress", label: "Proposition",   color: "#a5b4fc" },
  { key: "negotiation", label: "Négociation",   color: "#818cf8" },
  { key: "DealClosed",  label: "Closing",       color: "#6366f1" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  n != null ? "€\u00a0" + Number(n).toLocaleString("fr-FR") : "—";

const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return "à l'instant";
  if (s < 3600)  return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const initials = (u) =>
  u ? `${(u.firstName ?? "")[0] ?? ""}${(u.lastName ?? "")[0] ?? ""}`.toUpperCase() : "?";

// Normalize API list responses (array | { data } | { leads } | { users })
const toArray = (res) =>
  Array.isArray(res) ? res : res?.leads ?? res?.data ?? res?.users ?? [];

// ─── Derived data builders ────────────────────────────────────────────────────

const buildPipeline = (leads) => {
  const counts = {};
  leads.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);
  return PIPELINE_STAGES.map((s) => ({
    ...s,
    count: counts[s.key] ?? 0,
    pct:   Math.round(((counts[s.key] ?? 0) / max) * 100),
  }));
};

const buildActivity = (leads) =>
  [...leads]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
    .map((l) => {
      const who = l.assignedTo
        ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}`
        : "Un commercial";
      const company = l.companyName ?? l.name ?? "un prospect";
      const texts = {
        DealClosed:  `${who} a closé un deal — ${company}`,
        closed_lost: `${who} a perdu un deal — ${company}`,
        new:         `Nouveau lead entrant : ${company}`,
        contacted:   `${who} a contacté ${company}`,
        in_progress: `${who} a soumis une proposition à ${company}`,
        negotiation: `Négociation en cours — ${company}`,
      };
      return {
        status: l.status,
        text:   texts[l.status] ?? `Mise à jour : ${company}`,
        time:   timeAgo(l.updatedAt),
        amount: l.value ? fmt(l.value) : null,
      };
    });

const buildMonthlyBars = (leads) => {
  const now = new Date();
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[`${d.getFullYear()}-${d.getMonth()}`] = {
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      total: 0, closed: 0,
    };
  }
  leads.forEach((l) => {
    const d = new Date(l.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (months[k]) {
      months[k].total++;
      if (l.status === "DealClosed") months[k].closed++;
    }
  });
  return Object.values(months).map((m) => ({
    month: m.label,
    val:   m.total > 0 ? Math.round((m.closed / m.total) * 100) : 0,
  }));
};

const enrichTeam = (salesmen, leads) =>
  salesmen.map((sm) => {
    const mine = leads.filter(
      (l) => l.assignedTo?._id === sm._id || l.assignedTo === sm._id
    );
    const won  = mine.filter((l) => l.status === "DealClosed");
    return {
      ...sm,
      dealsCount: won.length,
      ca:   won.reduce((s, l) => s + (l.value ?? 0), 0),
      rate: mine.length > 0 ? Math.round((won.length / mine.length) * 100) : 0,
    };
  });

// ─── Activity icon map ────────────────────────────────────────────────────────

const ACT_ICON = {
  DealClosed:  { icon: CheckCircle2, cls: "act-icon deal"   },
  closed_lost: { icon: TrendingDown,  cls: "act-icon miss"   },
  new:         { icon: Zap,          cls: "act-icon lead"   },
  negotiation: { icon: Award,        cls: "act-icon target" },
};
const actIcon = (status) => ACT_ICON[status] ?? { icon: Clock, cls: "act-icon" };

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Skel = ({ h, w, r, style = {} }) => (
  <span className="skel" style={{ height: h, width: w, borderRadius: r ?? 6, ...style }} />
);

function ErrorBanner({ msg, onRetry }) {
  return (
    <div className="error-banner">
      <AlertCircle size={14} />
      <span>{msg}</span>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          <RefreshCw size={11} /> Réessayer
        </button>
      )}
    </div>
  );
}

function BarChart({ data, loading }) {
  if (loading) return <div className="skel" style={{ height: 160, borderRadius: 12 }} />;
  const max = Math.max(...data.map((m) => m.val), 1);
  return (
    <div className="bar-chart">
      {data.map((m) => (
        <div key={m.month} className="bar-col">
          <span className="bar-val">{m.val}%</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${(m.val / max) * 100}%` }} />
          </div>
          <span className="bar-label">{m.month}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function SalesLeaderDashboard() {
  const [stats,    setStats]    = useState(null);
  const [leads,    setLeads]    = useState([]);
  const [team,     setTeam]     = useState([]);
  const [loading,  setLoading]  = useState({ stats: true, leads: true, team: true });
  const [errors,   setErrors]   = useState({});
  const [tab,      setTab]      = useState("all");
  const [tick,     setTick]     = useState(0); // manual refresh

  const setL = (k, v) => setLoading((p) => ({ ...p, [k]: v }));
  const setE = (k, v) => setErrors ((p) => ({ ...p, [k]: v }));

  // ── Loaders ─────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setL("stats", true); setE("stats", null);
    try   { setStats(await fetchStats()); }
    catch { setE("stats", "Impossible de charger les statistiques"); }
    finally { setL("stats", false); }
  }, []);

  const loadLeads = useCallback(async () => {
    setL("leads", true); setE("leads", null);
    try   { setLeads(toArray(await fetchLeads({ limit: 200 }))); }
    catch { setE("leads", "Impossible de charger les leads"); }
    finally { setL("leads", false); }
  }, []);

  const loadTeam = useCallback(async () => {
    setL("team", true); setE("team", null);
    try   { setTeam(toArray(await fetchSalesmen())); }
    catch { setE("team", "Impossible de charger l'équipe"); }
    finally { setL("team", false); }
  }, []);

  useEffect(() => {
    loadStats(); loadLeads(); loadTeam();
  }, [loadStats, loadLeads, loadTeam, tick]);

  /* ── listen to ANY lead update → reload silently ─────────────────────── */
  useEffect(() => {
    const unsub = onLeadUpdate(() => {
      loadStats();
      loadLeads();
      loadTeam();
    });
    return unsub;
  }, [loadStats, loadLeads, loadTeam]);

  /* ── initial reload on mount ───────────────────────────────────────── */
  useEffect(() => {
    // Small delay to ensure component is fully mounted, then do a silent reload
    // This catches any changes that happened just before this component mounted
    const timer = setTimeout(() => {
      loadStats();
      loadLeads();
      loadTeam();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const pipeline   = buildPipeline(leads);
  const activity   = buildActivity(leads);
  const monthly    = buildMonthlyBars(leads);
  const enriched   = enrichTeam(team, leads);

  const DealClosed    = stats?.DealClosed     ?? leads.filter((l) => l.status === "DealClosed").length;
  const totalLeads   = stats?.totalLeads    ?? leads.length;
  // const totalRevenue = stats?.totalRevenue  ?? enriched.reduce((s, m) => s + m.ca, 0);
  // const convRate     = stats?.conversionRate
    // ?? (totalLeads > 0 ? Math.round((DealClosed / totalLeads) * 100) : 0);
  const activeCount  = team.filter((s) => s.isActive !== false).length;

  const filtered = tab === "all" ? enriched : enriched.filter((m) => m.role === tab);
  const anyLoad  = loading.stats || loading.leads || loading.team;

  // ── KPI config ───────────────────────────────────────────────────────────────
  const KPIS = [
    { color: "green",     icon: Users,         label: "Leads",               value: loading.leads ? null : String(totalLeads), sub: "ce mois-ci" },
    { color: "red",   icon: Users2Icon,    label: "Leads non assignés", value: loading.leads ? null : String(leads.filter((l) => !l.assignedTo).length), sub: "à ma disposition" },
    // { color: "indigo",  icon: TrendingUp,    label: "Chiffre d'affaires",  value: loading.leads ? null : fmt(totalRevenue), sub: "deals closés" },
    // { color: "emerald", icon: Target,        label: "Taux de conversion",  value: loading.leads ? null : `${convRate} %`,   sub: `${DealClosed} / ${totalLeads} leads` },
    { color: "sky",     icon: CheckCircle2,  label: "Deals closés",        value: loading.leads ? null : String(DealClosed), sub: "ce mois-ci" },
    { color: "violet",  icon: Users,         label: "Équipe active",       value: loading.team  ? null : `${activeCount} / ${team.length}`, sub: "commerciaux" },
  ];

  return (
    <div className="sl-dashboard">

      {/* Header */}
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Tableau de bord 👋</h1>
          <p className="sl-subtitle">Vue d'ensemble de votre équipe commerciale</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sl-export-btn" onClick={() => setTick((t) => t + 1)} disabled={anyLoad}>
            <RefreshCw size={14} className={anyLoad ? "spin" : ""} />
            {anyLoad ? "Chargement…" : "Actualiser"}
          </button>
          <button className="sl-export-btn">
            <ArrowUpRight size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* Error banners */}
      {Object.entries(errors).map(([k, msg]) => msg && (
        <ErrorBanner key={k} msg={msg} onRetry={() => {
          if (k === "stats") loadStats();
          if (k === "leads") loadLeads();
          if (k === "team")  loadTeam();
        }} />
      ))}

      {/* KPI cards */}
      <div className="kpi-grid">
        {KPIS.map(({ color, icon: Icon, label, value, sub }, i) => (
          <div key={label} className={`kpi-card kpi-${color}`} style={{ animationDelay: `${i * 70}ms` }}>
            <div className="kpi-top">
              <div className="kpi-icon-wrap">
                    {Icon && <Icon size={18} strokeWidth={2} />}

              </div>
            </div>
            {value == null
              ? <Skel h={28} w="70%" />
              : <p className="kpi-value">{value}</p>
            }
            <p className="kpi-label">{label}</p>
            <p className="kpi-sub">{sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="mid-row">

        <div className="card chart-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Performance mensuelle</h2>
              <p className="card-sub">Taux de conversion par mois (6 derniers mois)</p>
            </div>
            <button className="icon-btn"><MoreHorizontal size={16} /></button>
          </div>
          <BarChart data={monthly} loading={loading.leads} />
        </div>

        <div className="card pipeline-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Pipeline commercial</h2>
              <p className="card-sub">
                {loading.leads ? "Chargement…" : `${leads.length} leads au total`}
              </p>
            </div>
          </div>
          <div className="pipeline-list">
            {pipeline.map((p) => (
              <div key={p.key} className="pipeline-row">
                <span className="pipeline-stage">{p.label}</span>
                <div className="pipeline-track">
                  {loading.leads
                    ? <Skel h="100%" w="100%" r={20} />
                    : <div className="pipeline-fill" style={{ width: `${p.pct}%`, background: p.color }} />
                  }
                </div>
                <span className="pipeline-count">{loading.leads ? "—" : p.count}</span>
              </div>
            ))}
          </div>
          <div className="pipeline-total">
            <span>Total leads</span>
            <strong>{loading.leads ? "—" : leads.length}</strong>
          </div>
        </div>

      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Team */}
        <div className="card team-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Mon Équipe</h2>
              <p className="card-sub">
                {loading.team ? "Chargement…" : `${team.length} commerciaux`}
              </p>
            </div>
            <div className="tab-group">
              {[{ k: "all", l: "Tous" }, { k: "salesman", l: "Salesman" }].map(({ k, l }) => (
                <button
                  key={k}
                  className={`tab-btn${tab === k ? " active" : ""}`}
                  onClick={() => setTab(k)}
                >{l}</button>
              ))}
            </div>
          </div>

          <div className="team-table">
            <div className="team-thead">
              <span>Commercial</span>
              <span>Deals</span>
              <span>CA</span>
              <span>Taux</span>
              <span />
            </div>

            {loading.team
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="team-row" style={{ gap: 12, paddingLeft: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Skel h={34} w={34} r={10} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <Skel h={13} w={100} />
                        <Skel h={10} w={60} />
                      </div>
                    </div>
                    <Skel h={13} w={24} />
                    <Skel h={13} w={60} />
                    <Skel h={8} w={80} />
                    <Skel h={26} w={26} r={7} />
                  </div>
                ))
              : filtered.length === 0
                ? <p className="empty-state">Aucun commercial trouvé</p>
                : filtered.map((m) => (
                    <div key={m._id} className="team-row">
                      <div className="team-member">
                        <div className="team-avatar">{initials(m)}</div>
                        <div>
                          <p className="team-name">{m.firstName} {m.lastName}</p>
                          <span className="role-chip chip-mid">{m.role}</span>
                        </div>
                      </div>
                      <span className="team-deals">{m.dealsCount}</span>
                      <span className="team-ca">{fmt(m.ca)}</span>
                      <div className="team-progress-wrap">
                        <div className="team-progress-track">
                          <div className="team-progress-fill" style={{ width: `${m.rate}%` }} />
                        </div>
                        <span className="team-rate">{m.rate}%</span>
                      </div>
                      <button className="icon-btn sm"><ChevronRight size={14} /></button>
                    </div>
                  ))
            }
          </div>
        </div>

        {/* Activity */}
        <div className="card activity-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Activité récente</h2>
              <p className="card-sub">Dernières actions de l'équipe</p>
            </div>
          </div>
          <div className="activity-list">
            {loading.leads
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="activity-item">
                    <Skel h={32} w={32} r={9} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <Skel h={13} w="90%" />
                      <Skel h={10} w={80} />
                    </div>
                  </div>
                ))
              : activity.length === 0
                ? <p className="empty-state">Aucune activité récente</p>
                : activity.map((a, i) => {
                    const { icon: Icon, cls } = actIcon(a.status);
                    return (
                      <div key={i} className="activity-item">
                        <div className={cls}><Icon size={14} strokeWidth={2} /></div>
                        <div className="activity-body">
                          <p className="activity-text">{a.text}</p>
                          <div className="activity-meta">
                            <span className="activity-time">{a.time}</span>
                            {a.amount && <span className="activity-amount">{a.amount}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </div>

      </div>
    </div>
  );
}