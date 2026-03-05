import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Users, Target, CheckCircle2, RefreshCw, AlertCircle,
  TrendingUp, Zap, Clock, Award, ArrowUpRight,
  MoreHorizontal, Activity,
} from "lucide-react";
import { fetchStats, fetchLeads, fetchSalesmen } from "../../api/leadsApi";
import { useSocket } from "../../context/SocketContext";
import api from "../../api/axiosInstance";
import { STATUS_CFG } from "../../config/leadsConfig";
import "../../styles/DashboardStyles2.css";

// ─── useCountUp: animates a number from 0 to target ──────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const n = Number(target);
    if (isNaN(n)) { setValue(target); return; }
    if (n === 0)  { setValue(0); return; }
    const start = performance.now();
    const run = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // ease out quart
      const ease = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(ease * n));
      if (t < 1) rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toArray = (res) =>
  Array.isArray(res) ? res : res?.data ?? res?.leads ?? res?.users ?? [];

const initials = (u) =>
  u ? `${(u.firstName ?? "")[0] ?? ""}${(u.lastName ?? "")[0] ?? ""}`.toUpperCase() : "?";

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

// Palette par status
const STATUS_DOT = {
  New:           "#6366f1",
  Contacted:     "#0ea5e9",
  Interested:    "#10b981",
  NotInterested: "#f59e0b",
  DealClosed:    "#059669",
  Lost:          "#ef4444",
};

// ─── Fetch team (salesman + cxp) ──────────────────────────────────────────────
const fetchTeam = async () => {
  const [salesmenRes, cxpsRes] = await Promise.all([
    fetchSalesmen(),
    api.get("/users", { params: { role: "cxp", isApproved: true } }),
  ]);
  const salesmen = Array.isArray(salesmenRes) ? salesmenRes : salesmenRes?.data ?? salesmenRes?.users ?? [];
  const cxps     = Array.isArray(cxpsRes)     ? cxpsRes     : cxpsRes?.data     ?? cxpsRes?.users     ?? [];
  return [...salesmen, ...cxps];
};

// ─── Enrich team with lead counts ─────────────────────────────────────────────
const enrichTeam = (team, leads) =>
  team.map((m) => {
    const mine = leads.filter((l) => l.assignedTo?._id === m._id || l.assignedTo === m._id);
    return {
      ...m,
      leadsCount: mine.length,
      closed:     mine.filter((l) => l.status === "DealClosed").length,
      rate:        mine.length > 0
        ? Math.round((mine.filter((l) => l.status === "DealClosed").length / mine.length) * 100)
        : 0,
    };
  }).sort((a, b) => b.leadsCount - a.leadsCount);

// ─── Build pipeline from leads ────────────────────────────────────────────────
const buildPipeline = (leads) => {
  const STAGES = [
    { key: "New",           label: "Nouveau",       color: "#6366f1" },
    { key: "Contacted",     label: "Contacté",      color: "#0ea5e9" },
    { key: "Interested",    label: "Intéressé",     color: "#10b981" },
    { key: "NotInterested", label: "Pas intéressé", color: "#f59e0b" },
    { key: "DealClosed",    label: "Closé",         color: "#059669" },
    { key: "Lost",          label: "Perdu",         color: "#ef4444" },
  ];
  const total = leads.length || 1;
  return STAGES.map((s) => {
    const count = leads.filter((l) => l.status === s.key).length;
    return { ...s, count, pct: Math.round((count / total) * 100) };
  });
};

// ─── Recent activity from leads ───────────────────────────────────────────────
const buildActivity = (leads) =>
  [...leads]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8)
    .map((l) => {
      const who  = l.assignedTo
        ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}`
        : "Non assigné";
      const name = `${l.firstName} ${l.lastName}`;
      const map  = {
        DealClosed:    { text: `Deal closé — ${name}`,         icon: "🏆", color: "#059669", bg: "#dcfce7" },
        Lost:          { text: `Lead perdu — ${name}`,         icon: "❌", color: "#dc2626", bg: "#fee2e2" },
        Interested:    { text: `${who} → Intéressé`,           icon: "⚡", color: "#0ea5e9", bg: "#e0f2fe" },
        Contacted:     { text: `${who} a contacté ${name}`,    icon: "📞", color: "#6366f1", bg: "#eef2ff" },
        New:           { text: `Nouveau lead : ${name}`,        icon: "✨", color: "#f59e0b", bg: "#fef3c7" },
        NotInterested: { text: `${name} — pas intéressé`,      icon: "⏸", color: "#94a3b8", bg: "#f1f5f9" },
      };
      return {
        ...(map[l.status] ?? { text: `Mise à jour : ${name}`, icon: "📌", color: "#6366f1", bg: "#eef2ff" }),
        time: l.updatedAt,
        who,
      };
    });

// ── Animated KPI value wrapper ────────────────────────────────────────────────
function AnimatedKpiValue({ value }) {
  const numeric = parseInt(value, 10);
  const isNum   = !isNaN(numeric) && String(numeric) === String(value).replace(/[^0-9]/g, '').replace(/^0+/, '') || value === '0';
  const count   = useCountUp(isNum ? numeric : 0, 1000);
  return <p className="db-kpi__value">{isNum ? count : value}</p>;
}

// ─── Small components ──────────────────────────────────────────────────────────
const Skel = ({ h = 16, w = "100%", r = 6 }) => (
  <span className="skel" style={{ height: h, width: w, borderRadius: r, display: "block" }} />
);

function ErrorBanner({ msg, onRetry }) {
  return (
    <div className="db-error">
      <AlertCircle size={14} /> {msg}
      {onRetry && <button className="db-retry" onClick={onRetry}><RefreshCw size={11} /> Réessayer</button>}
    </div>
  );
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const size = 120, cx = 60, cy = 60, r = 46, stroke = 12;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.filter((d) => d.count > 0).map((d) => {
    const pct  = d.count / Math.max(total, 1);
    const dash = pct * circ;
    const gap  = circ - dash;
    const el   = { ...d, dashArray: `${dash} ${gap}`, dashOffset: -offset * circ, pct };
    offset    += pct;
    return el;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {slices.map((s) => (
        <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={s.dashArray}
          strokeDashoffset={s.dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      ))}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ fill: "#0f172a", fontSize: 22, fontWeight: 800, fontFamily: "'Fraunces',serif", transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>
        {total}
      </text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
export default function SalesLeaderDashboard() {
  const socket = useSocket();

  const [stats,   setStats]   = useState(null);
  const [leads,   setLeads]   = useState([]);
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState({ stats: true, leads: true, team: true });
  const [errors,  setErrors]  = useState({});
  const [roleTab, setRoleTab] = useState("all"); // all | salesman | cxp
  const [barsReady, setBarsReady] = useState(false);

  const setL = (k, v) => setLoading((p) => ({ ...p, [k]: v }));
  const setE = (k, v) => setErrors ((p) => ({ ...p, [k]: v }));

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setL("stats", true);
    try   { setStats(await fetchStats()); }
    catch { setE("stats", "Impossible de charger les statistiques"); }
    finally { setL("stats", false); }
  }, []);

  const loadLeads = useCallback(async () => {
    setL("leads", true);
    try   { setLeads(toArray(await fetchLeads({ limit: 500 }))); }
    catch { setE("leads", "Impossible de charger les leads"); }
    finally {
      setL("leads", false);
      setTimeout(() => setBarsReady(true), 100);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    setL("team", true);
    try   { setTeam(await fetchTeam()); }
    catch { setE("team", "Impossible de charger l'équipe"); }
    finally { setL("team", false); }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats(); loadLeads(); loadTeam();
  }, [loadStats, loadLeads, loadTeam]);

  // ── Socket: réel-time ─────────────────────────────────────────────────────
  const loadLeadsRef = useRef(loadLeads);
  const loadStatsRef = useRef(loadStats);
  loadLeadsRef.current = loadLeads;
  loadStatsRef.current = loadStats;

  useEffect(() => {
    if (!socket) return;
    const onLeadEvent = () => {
      loadLeadsRef.current();
      loadStatsRef.current();
    };
    const onUserEvent = () => loadTeam();

    socket.on("lead:created",  onLeadEvent);
    socket.on("lead:updated",  onLeadEvent);
    socket.on("lead:deleted",  onLeadEvent);
    socket.on("lead:imported", onLeadEvent);
    socket.on("user:approved", onUserEvent);

    return () => {
      socket.off("lead:created",  onLeadEvent);
      socket.off("lead:updated",  onLeadEvent);
      socket.off("lead:deleted",  onLeadEvent);
      socket.off("lead:imported", onLeadEvent);
      socket.off("user:approved", onUserEvent);
    };
  }, [socket, loadTeam]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const pipeline    = buildPipeline(leads);
  const activity    = buildActivity(leads);
  const enriched    = enrichTeam(team, leads);
  const filteredTeam = roleTab === "all" ? enriched : enriched.filter((m) => m.role === roleTab);

  const totalLeads    = stats?.totalLeads ?? leads.length;
  const dealClosed    = leads.filter((l) => l.status === "DealClosed").length;
  const unassigned    = leads.filter((l) => !l.assignedTo).length;
  const convRate      = totalLeads > 0 ? Math.round((dealClosed / totalLeads) * 100) : 0;
  const salesmenCount = team.filter((m) => m.role === "salesman").length;
  const cxpCount      = team.filter((m) => m.role === "cxp").length;
  const anyLoad       = loading.stats || loading.leads || loading.team;

  const KPIS = [
    { color: "indigo", icon: Activity,     label: "Total leads",         value: loading.leads ? null : String(totalLeads),  sub: "dans le pipeline" },
    { color: "emerald",icon: CheckCircle2, label: "Deals closés",        value: loading.leads ? null : String(dealClosed),  sub: `taux ${convRate}%` },
    { color: "amber",  icon: Zap,          label: "Non assignés",        value: loading.leads ? null : String(unassigned),  sub: "en attente" },
    { color: "violet", icon: Users,        label: "Équipe",              value: loading.team  ? null : String(team.length), sub: `${salesmenCount} sales · ${cxpCount} CXP` },
  ];

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Tableau de bord</h1>
          <p className="db-subtitle">
            {anyLoad
              ? "Actualisation en cours…"
              : `${totalLeads} leads · ${team.length} membres · mis à jour à l'instant`}
          </p>
        </div>
        <button className="db-refresh-btn" onClick={() => { loadStats(); loadLeads(); loadTeam(); }} disabled={anyLoad}>
          <RefreshCw size={14} className={anyLoad ? "spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Errors */}
      {Object.entries(errors).map(([k, msg]) => msg && (
        <ErrorBanner key={k} msg={msg} onRetry={() => {
          if (k === "stats") loadStats();
          if (k === "leads") loadLeads();
          if (k === "team")  loadTeam();
        }} />
      ))}

      {/* ── KPI grid ── */}
      <div className="db-kpi-grid">
        {KPIS.map(({ color, icon: Icon, label, value, sub }, i) => (
          <div key={label} className={`db-kpi db-kpi--${color}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="db-kpi__icon"><Icon size={20} strokeWidth={2} /></div>
            <div className="db-kpi__body">
              {value == null
                ? <Skel h={28} w={60} r={6} />
                : <AnimatedKpiValue value={value} />}
              <p className="db-kpi__label">{label}</p>
              <p className="db-kpi__sub">{sub}</p>
            </div>
            <div className="db-kpi__glow" />
          </div>
        ))}
      </div>

      {/* ── Middle row: pipeline + activity ── */}
      <div className="db-mid">

        {/* Pipeline donut */}
        <div className="db-card db-pipeline">
          <div className="db-card__head">
            <div>
              <h2 className="db-card__title">Pipeline</h2>
              <p className="db-card__sub">{loading.leads ? "…" : `${totalLeads} leads`}</p>
            </div>
          </div>

          <div className="db-pipeline__body">
            <div className="db-donut-wrap">
              {loading.leads
                ? <div className="skel" style={{ width: 120, height: 120, borderRadius: "50%" }} />
                : <DonutChart data={pipeline} total={totalLeads} />}
            </div>
            <div className="db-pipeline__legend">
              {pipeline.map((p) => (
                <div key={p.key} className="db-legend-row">
                  <span className="db-legend-dot" style={{ background: p.color }} />
                  <span className="db-legend-label">{p.label}</span>
                  <span className="db-legend-count">{loading.leads ? "—" : p.count}</span>
                  <div className="db-legend-bar-track">
                    <div className="db-legend-bar-fill"
                      style={{ width: barsReady && !loading.leads ? `${p.pct}%` : "0%", background: p.color }} />
                  </div>
                  <span className="db-legend-pct">{loading.leads ? "" : `${p.pct}%`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="db-card db-activity">
          <div className="db-card__head">
            <div>
              <h2 className="db-card__title">Activité récente</h2>
              <p className="db-card__sub">dernières mises à jour</p>
            </div>
            <span className="db-live-badge">
              <span className="db-live-dot" /> Live
            </span>
          </div>

          <div className="db-activity__list">
            {loading.leads
              ? [1,2,3,4].map((i) => (
                  <div key={i} className="db-act-item">
                    <Skel h={32} w={32} r={99} />
                    <div style={{ flex: 1 }}>
                      <Skel h={12} w="80%" r={4} />
                      <div style={{ marginTop: 5 }}><Skel h={10} w="40%" r={4} /></div>
                    </div>
                  </div>
                ))
              : activity.length === 0
                ? <p className="db-empty">Aucune activité récente</p>
                : activity.map((a, i) => (
                    <div key={i} className="db-act-item">
                      <div className="db-act-icon" style={{ background: a.bg, color: a.color }}>
                        {a.icon}
                      </div>
                      <div className="db-act-body">
                        <p className="db-act-text">{a.text}</p>
                        <p className="db-act-time">{timeAgo(a.time)}</p>
                      </div>
                    </div>
                  ))}
          </div>
        </div>
      </div>

      {/* ── Team table ── */}
      <div className="db-card db-team">
        <div className="db-card__head">
          <div>
            <h2 className="db-card__title">Mon Équipe</h2>
            <p className="db-card__sub">
              {loading.team ? "…" : `${salesmenCount} commerciaux · ${cxpCount} CXP`}
            </p>
          </div>

          {/* Role tabs */}
          <div className="db-role-tabs">
            {[
              { k: "all",      l: "Tous",      count: team.length },
              { k: "salesman", l: "Sales",     count: salesmenCount },
              { k: "cxp",      l: "CXP",       count: cxpCount },
            ].map(({ k, l, count }) => (
              <button
                key={k}
                className={`db-role-tab${roleTab === k ? " active" : ""}`}
                onClick={() => setRoleTab(k)}
              >
                {l}
                <span className="db-role-tab__count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading.team ? (
          <div className="db-team__grid">
            {[1,2,3,4].map((i) => (
              <div key={i} className="db-member-card db-member-card--skel">
                <Skel h={44} w={44} r={12} />
                <div style={{ flex: 1 }}>
                  <Skel h={13} w="60%" r={4} />
                  <div style={{ marginTop: 6 }}><Skel h={10} w="80%" r={4} /></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeam.length === 0 ? (
          <p className="db-empty">Aucun membre dans cette catégorie</p>
        ) : (
          <div className="db-team__grid">
            {filteredTeam.map((m) => {
              const isLeader = m.leadsCount === Math.max(...filteredTeam.map((x) => x.leadsCount), 0)
                && m.leadsCount > 0;
              return (
                <div key={m._id} className="db-member-card">
                  {isLeader && <span className="db-member-crown" title="Top performer">👑</span>}

                  <div className="db-member-av" style={{
                    background: m.role === "cxp"
                      ? "linear-gradient(135deg,#0ea5e9,#0284c7)"
                      : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  }}>
                    <div className="prof-member-av" style={{ width: 64, height: 64, fontSize: 22, margin: 0, flexShrink: 0 }}>
                {m?.avatar
                  ? <img src={m.avatar} alt="" />
                  : <span>{initials(m)}</span>}
              </div>
                  </div>

                  <div className="db-member-info">
                    <p className="db-member-name">{m.firstName} {m.lastName}</p>
                    <p className="db-member-email">{m.email}</p>
                  </div>

                  <span className={`db-member-role-badge db-member-role-badge--${m.role}`}>
                    {m.role === "cxp" ? "CXP" : "Sales"}
                  </span>

                  <div className="db-member-stats">
                    <div className="db-member-stat">
                      <span className="db-member-stat__val">{m.leadsCount}</span>
                      <span className="db-member-stat__lbl">leads</span>
                    </div>
                    <div className="db-member-stat">
                      <span className="db-member-stat__val">{m.closed}</span>
                      <span className="db-member-stat__lbl">closés</span>
                    </div>
                    <div className="db-member-stat">
                      <span className="db-member-stat__val" style={{ color: m.rate > 30 ? "#059669" : m.rate > 10 ? "#d97706" : "#94a3b8" }}>
                        {m.rate}%
                      </span>
                      <span className="db-member-stat__lbl">taux</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="db-member-bar-wrap">
                    <div className="db-member-bar"
                      style={{
                        width: barsReady ? `${m.rate}%` : "0%",
                        background: m.role === "cxp"
                          ? "linear-gradient(90deg,#0ea5e9,#38bdf8)"
                          : "linear-gradient(90deg,#6366f1,#818cf8)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}