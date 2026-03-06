import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Phone, CheckCircle2, Target,
  Clock, RefreshCw, AlertCircle, Zap,
  ChevronRight, Award,
} from "lucide-react";
import { fetchLeads, fetchStats, changeStatus } from "../../api/leadsApi";
import { useSocket } from "../../context/Socketcontext";
import { useAuth } from "../../context/AuthContext";
import { STATUS_CFG } from "../../config/leadsConfig";
import { acolor, initials } from "../../utils/LeadsUtils";
import "../../styles/SalesmanDashboard.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
const toArray = (res) =>
  Array.isArray(res) ? res : res?.leads ?? res?.data ?? res?.users ?? [];

const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return "à l'instant";
  if (s < 3600)  return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

// Status emoji + bg
const STATUS_ICON = {
  DealClosed:    { emoji: "🏆", bg: "#dcfce7" },
  Lost:          { emoji: "❌", bg: "#fee2e2" },
  Interested:    { emoji: "⚡", bg: "#d1fae5" },
  Contacted:     { emoji: "📞", bg: "#e0f2fe" },
  New:           { emoji: "✨", bg: "#eef2ff" },
  NotInterested: { emoji: "⏸", bg: "#fef3c7" },
};

// Donut SVG builder
function buildDonut(segments, r = 54, cx = 60, cy = 60) {
  const total = segments.reduce((s, sg) => s + sg.count, 0);
  if (!total) return { slices: [], total: 0 };
  let angle = -90;
  const slices = segments.map((sg) => {
    const pct   = sg.count / total;
    const sweep = pct * 360;
    const r1    = (angle * Math.PI) / 180;
    const r2    = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(r1);
    const y1 = cy + r * Math.sin(r1);
    const x2 = cx + r * Math.cos(r2);
    const y2 = cy + r * Math.sin(r2);
    const large = sweep > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle += sweep;
    return { ...sg, d, pct: Math.round(pct * 100) };
  });
  return { slices, total };
}

// Animated counter hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const n = Number(target);
    if (isNaN(n) || n === 0) { setVal(0); return; }
    const start = performance.now();
    const run = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(ease * n));
      if (t < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

// ── Sub-components ────────────────────────────────────────────────────────────
const Skel = ({ h, w, r }) => (
  <span className="sd-skel" style={{ height: h, width: w, borderRadius: r ?? 6 }} />
);

function KpiCard({ color, icon: Icon, label, value, sub, delay }) {
  const count = useCountUp(typeof value === "number" ? value : 0, 950);
  return (
    <div className={`sd-kpi sd-kpi--${color}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="sd-kpi__glow" />
      <div className="sd-kpi__icon"><Icon size={20} strokeWidth={2} /></div>
      <div className="sd-kpi__body">
        {value == null
          ? <Skel h={28} w={60} r={6} />
          : <p className="sd-kpi__value">{typeof value === "number" ? count : value}</p>
        }
        <p className="sd-kpi__label">{label}</p>
        <p className="sd-kpi__sub">{sub}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
export default function SalesmanDashboard() {
  const navigate = useNavigate();
  const socket   = useSocket();
  const { user } = useAuth();

  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [barsReady, setBarsReady] = useState(false);

  const loadRef = useRef(null);

  // ── Loader ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchLeads({ limit: 500 });
      setLeads(toArray(res));
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      if (!silent) setLoading(false);
      setTimeout(() => setBarsReady(true), 120);
    }
  }, []);

  loadRef.current = load;
  useEffect(() => { load(); }, [load]);

  // Socket live updates
  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    socket.on("lead:updated",  reload);
    socket.on("lead:created",  reload);
    socket.on("lead:deleted",  reload);
    socket.on("lead:imported", reload);
    return () => {
      socket.off("lead:updated",  reload);
      socket.off("lead:created",  reload);
      socket.off("lead:deleted",  reload);
      socket.off("lead:imported", reload);
    };
  }, [socket]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total       = leads.length;
    const closed      = leads.filter((l) => l.status === "DealClosed").length;
    const inProgress  = leads.filter((l) => ["Contacted", "Interested"].includes(l.status)).length;
    const newLeads    = leads.filter((l) => l.status === "New").length;
    const lost        = leads.filter((l) => l.status === "Lost").length;
    const rate        = total ? Math.round((closed / total) * 100) : 0;
    return { total, closed, inProgress, newLeads, lost, rate };
  }, [leads]);

  const pipeline = useMemo(() => {
    const counts = {};
    leads.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
    const segments = Object.entries(STATUS_CFG).map(([k, v]) => ({
      key: k, label: v.label, color: v.color, count: counts[k] ?? 0,
    })).filter((s) => s.count > 0);
    return buildDonut(segments);
  }, [leads]);

  const activity = useMemo(() =>
    [...leads]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8),
  [leads]);

  const recentLeads = useMemo(() =>
    [...leads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
  [leads]);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const KPIS = [
    { color: "emerald", icon: Phone,        label: "Mes leads",          value: loading ? null : stats.total,    sub: "assignés à vous" },
    { color: "indigo",  icon: Zap,          label: "En cours",           value: loading ? null : stats.inProgress, sub: "contactés + intéressés" },
    { color: "green",   icon: CheckCircle2, label: "Deals closés",       value: loading ? null : stats.closed,  sub: "au total" },
    { color: "amber",   icon: Target,       label: "Taux de conversion", value: loading ? null : `${stats.rate}%`, sub: `${stats.closed} / ${stats.total}` },
  ];

  return (
    <div className="sd-root">

      {/* ══ HEADER ══ */}
      <div className="sd-header">
        <div>
          <h1 className="sd-title">
            {greet()}{user?.firstName ? `, ${user.firstName}` : ""} 👋
          </h1>
          <p className="sd-subtitle">Voici un aperçu de vos performances</p>
        </div>
        <button className="sd-refresh-btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      {/* ══ ERROR ══ */}
      {error && (
        <div className="sd-error">
          <AlertCircle size={14} /> {error}
          <button className="sd-error__retry" onClick={() => load()}>Réessayer</button>
        </div>
      )}

      {/* ══ KPI CARDS ══ */}
      <div className="sd-kpi-grid">
        {KPIS.map(({ color, icon, label, value, sub }, i) => (
          <KpiCard key={label} color={color} icon={icon} label={label}
            value={value} sub={sub} delay={i * 70} />
        ))}
      </div>

      {/* ══ MID ROW — pipeline + activity ══ */}
      <div className="sd-mid">

        {/* Pipeline donut */}
        <div className="sd-card sd-pipeline">
          <div className="sd-card__head">
            <div>
              <p className="sd-card__title">Pipeline</p>
              <p className="sd-card__sub">Répartition par statut</p>
            </div>
          </div>
          <div className="sd-pipeline__body">
            {loading ? (
              <Skel h={120} w={120} r={60} />
            ) : (
              <div className="sd-donut-wrap">
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <circle cx={60} cy={60} r={54} fill="#f8fafc" />
                  {pipeline.slices.map((s) => (
                    <path key={s.key} d={s.d} fill={s.color} opacity={.9}>
                      <title>{s.label}: {s.count}</title>
                    </path>
                  ))}
                  <circle cx={60} cy={60} r={36} fill="white" />
                  <text x={60} y={56} textAnchor="middle"
                    style={{ fontFamily: "Fraunces,serif", fontSize: 18, fontWeight: 700, fill: "#0f172a" }}>
                    {pipeline.total}
                  </text>
                  <text x={60} y={70} textAnchor="middle"
                    style={{ fontFamily: "DM Sans,sans-serif", fontSize: 9, fill: "#94a3b8" }}>
                    leads
                  </text>
                </svg>
              </div>
            )}
            <div className="sd-pipeline__legend">
              {loading
                ? [1,2,3,4].map((i) => <Skel key={i} h={14} w="100%" r={4} />)
                : pipeline.slices.map((s) => (
                  <div key={s.key} className="sd-legend-row">
                    <span className="sd-legend-dot" style={{ background: s.color }} />
                    <span className="sd-legend-label">{s.label}</span>
                    <span className="sd-legend-count">{s.count}</span>
                    <div className="sd-legend-bar-track">
                      <div className="sd-legend-bar-fill"
                        style={{
                          width: barsReady ? `${s.pct}%` : "0%",
                          background: s.color,
                        }} />
                    </div>
                    <span className="sd-legend-pct">{s.pct}%</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="sd-card sd-activity">
          <div className="sd-card__head">
            <div>
              <p className="sd-card__title">Activité récente</p>
              <p className="sd-card__sub">Vos dernières interactions</p>
            </div>
            <div className="sd-live-badge">
              <span className="sd-live-dot" />
              Live
            </div>
          </div>
          <div className="sd-activity__list">
            {loading
              ? [1,2,3,4,5].map((i) => (
                  <div key={i} className="sd-act-item">
                    <Skel h={34} w={34} r={10} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <Skel h={12} w="80%" r={4} />
                      <Skel h={10} w="40%" r={4} />
                    </div>
                  </div>
                ))
              : activity.length === 0
                ? <p className="sd-empty">Aucune activité récente</p>
                : activity.map((l, i) => {
                    const cfg  = STATUS_ICON[l.status] ?? { emoji: "📋", bg: "#f1f5f9" };
                    const name = `${l.firstName} ${l.lastName}`;
                    const sc   = STATUS_CFG[l.status];
                    return (
                      <div key={l._id} className="sd-act-item" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="sd-act-icon" style={{ background: cfg.bg }}>
                          {cfg.emoji}
                        </div>
                        <div className="sd-act-body">
                          <p className="sd-act-text">
                            <strong>{name}</strong>
                            <span className="sd-act-status" style={{ color: sc?.color }}>
                              {" · "}{sc?.label ?? l.status}
                            </span>
                          </p>
                          <p className="sd-act-time">{timeAgo(l.updatedAt)}</p>
                        </div>
                        <button
                          className="sd-act-open"
                          onClick={() => navigate(`/salesman/leads/${l._id}`)}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })
            }
          </div>
        </div>
      </div>

      {/* ══ RECENT LEADS TABLE ══ */}
      <div className="sd-card">
        <div className="sd-card__head">
          <div>
            <p className="sd-card__title">Leads récents</p>
            <p className="sd-card__sub">Vos 5 derniers leads ajoutés</p>
          </div>
          <button className="sd-see-all" onClick={() => navigate("/salesman/prospects")}>
            Voir tout <ChevronRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="sd-leads-skel">
            {[1,2,3].map((i) => (
              <div key={i} className="sd-leads-skel__row">
                <Skel h={36} w={36} r={10} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skel h={12} w="50%" r={4} />
                  <Skel h={10} w="35%" r={4} />
                </div>
                <Skel h={24} w={80} r={99} />
              </div>
            ))}
          </div>
        ) : recentLeads.length === 0 ? (
          <p className="sd-empty">Aucun lead pour l'instant</p>
        ) : (
          <div className="sd-leads-list">
            {recentLeads.map((l, i) => {
              const sc  = STATUS_CFG[l.status];
              const col = acolor(l._id);
              return (
                <div
                  key={l._id}
                  className="sd-lead-row"
                  style={{ animationDelay: `${i * 55}ms` }}
                  onClick={() => navigate(`/salesman/leads/${l._id}`)}
                >
                  {/* Avatar */}
                  <div className="sd-lead-av" style={{ background: col }}>
                    {initials(l)}
                  </div>
                  {/* Info */}
                  <div className="sd-lead-info">
                    <p className="sd-lead-name">{l.firstName} {l.lastName}</p>
                    <p className="sd-lead-meta">{l.email ?? l.phone ?? "—"}</p>
                  </div>
                  {/* Source */}
                  {l.source && (
                    <span className="sd-lead-source">{l.source}</span>
                  )}
                  {/* Status badge */}
                  <span
                    className="sd-lead-status"
                    style={{ background: sc?.light, color: sc?.color }}
                  >
                    {sc?.label ?? l.status}
                  </span>
                  {/* Date */}
                  <span className="sd-lead-date">{fmtDate(l.createdAt)}</span>
                  {/* Arrow */}
                  <ChevronRight size={14} className="sd-lead-arrow" />
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
