import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeads } from "../../api/leadsApi";
import { useSocket } from "../../context/Socketcontext";
import { useAuth } from "../../context/AuthContext";
import { STATUS_CFG } from "../../config/leadsConfig";
import { acolor, initials } from "../../utils/LeadsUtils";
import {
  RefreshCw, Target, TrendingUp, Award,
  CheckCircle2, Flame, BarChart2, ChevronRight,
} from "lucide-react";
import "../../styles/Performance.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
const toArray = (r) => Array.isArray(r) ? r : r?.data ?? r?.leads ?? [];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

// Monthly bucket key: "2025-06"
const monthKey = (iso) => iso ? iso.slice(0, 7) : null;

// Last N months labels
function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      year: d.getFullYear(),
    });
  }
  return out;
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

// ── Gauge component ───────────────────────────────────────────────────────────
function Gauge({ pct, color, size = 120 }) {
  const r   = 48; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="pf-gauge">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="pf-gauge__arc"
      />
      <text x={cx} y={cy - 5} textAnchor="middle"
        style={{ fontFamily: "Fraunces,serif", fontSize: 22, fontWeight: 700, fill: "#0f172a" }}>
        {pct}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        style={{ fontFamily: "DM Sans,sans-serif", fontSize: 10, fill: "#94a3b8" }}>
        conversion
      </text>
    </svg>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, loading, barsReady }) {
  const max = Math.max(...data.map((d) => d.closed), 1);
  if (loading) return <div className="pf-skel" style={{ height: 140, borderRadius: 12 }} />;
  return (
    <div className="pf-barchart">
      {data.map((m) => (
        <div key={m.key} className="pf-bar-col">
          <span className="pf-bar-val">{m.closed}</span>
          <div className="pf-bar-track">
            <div
              className="pf-bar-fill"
              style={{ height: barsReady ? `${(m.closed / max) * 100}%` : "0%" }}
            />
          </div>
          <span className="pf-bar-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Performance() {
  const navigate   = useNavigate();
  const socket     = useSocket();
  const { user }   = useAuth();

  const [leads,     setLeads]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [goal,      setGoal]      = useState(() => {
    const saved = localStorage.getItem("pf_goal");
    return saved ? Number(saved) : 10;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput,   setGoalInput]   = useState(String(goal));
  const loadRef = useRef(null);

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
      setTimeout(() => setBarsReady(true), 150);
    }
  }, []);

  loadRef.current = load;
  useEffect(() => { load(); }, [load]);

  // Socket
  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    ["lead:updated","lead:created","lead:deleted","lead:imported"].forEach((ev) => socket.on(ev, reload));
    return () => ["lead:updated","lead:created","lead:deleted","lead:imported"].forEach((ev) => socket.off(ev, reload));
  }, [socket]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const months  = useMemo(() => lastNMonths(6), []);
  const thisKey = months[months.length - 1].key;

  const stats = useMemo(() => {
    const total     = leads.length;
    const closed    = leads.filter((l) => l.status === "DealClosed").length;
    const lost      = leads.filter((l) => l.status === "Lost").length;
    const active    = leads.filter((l) => ["New","Contacted","Interested"].includes(l.status)).length;
    const rate      = total ? Math.round((closed / total) * 100) : 0;

    // This month
    const thisMonth = leads.filter((l) => monthKey(l.createdAt) === thisKey);
    const closedThisMonth = leads.filter((l) => l.status === "DealClosed" && monthKey(l.updatedAt) === thisKey).length;

    // Monthly chart data
    const monthly = months.map((m) => ({
      ...m,
      total:  leads.filter((l) => monthKey(l.createdAt) === m.key).length,
      closed: leads.filter((l) => l.status === "DealClosed" && monthKey(l.updatedAt) === m.key).length,
    }));

    // Streak: consecutive months with ≥1 deal
    let streak = 0;
    for (let i = monthly.length - 1; i >= 0; i--) {
      if (monthly[i].closed > 0) streak++;
      else break;
    }

    // Best month
    const best = [...monthly].sort((a, b) => b.closed - a.closed)[0];

    // Status breakdown
    const byStatus = Object.entries(STATUS_CFG).map(([k, v]) => ({
      key: k, label: v.label, color: v.color, light: v.light,
      count: leads.filter((l) => l.status === k).length,
    })).filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    // Top recent closes
    const recentClosed = leads
      .filter((l) => l.status === "DealClosed")
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    return { total, closed, lost, active, rate, thisMonth, closedThisMonth, monthly, streak, best, byStatus, recentClosed };
  }, [leads, months, thisKey]);

  // Goal management
  const goalPct       = goal > 0 ? Math.min(Math.round((stats.closedThisMonth / goal) * 100), 100) : 0;
  const goalCountUp   = useCountUp(stats.closedThisMonth, 900);
  const totalCountUp  = useCountUp(stats.total, 900);
  const closedCountUp = useCountUp(stats.closed, 900);
  const rateCountUp   = useCountUp(stats.rate, 900);

  function saveGoal() {
    const n = Math.max(1, parseInt(goalInput) || 10);
    setGoal(n);
    localStorage.setItem("pf_goal", String(n));
    setEditingGoal(false);
  }

  const Skel = ({ h, w, r }) => (
    <span className="pf-skel" style={{ height: h, width: w, borderRadius: r ?? 6 }} />
  );

  return (
    <div className="pf-root">

      {/* ══ HEADER ══ */}
      <div className="pf-header">
        <div>
          <h1 className="pf-title">
            <BarChart2 size={22} className="pf-title__icon" />
            Objectifs & Performance
          </h1>
          <p className="pf-subtitle">
            {user?.firstName ? `Tableau de bord de ${user.firstName}` : "Vos statistiques personnelles"}
          </p>
        </div>
        <button className="pf-refresh-btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="pf-error">
          {error}
          <button className="pf-error__retry" onClick={() => load()}>Réessayer</button>
        </div>
      )}

      {/* ══ KPI ROW ══ */}
      <div className="pf-kpi-grid">
        {[
          { icon: Target,       label: "Total leads",     value: loading ? null : totalCountUp,  sub: "assignés",               color: "indigo" },
          { icon: CheckCircle2, label: "Deals closés",    value: loading ? null : closedCountUp, sub: "au total",               color: "green"  },
          { icon: TrendingUp,   label: "Taux conversion", value: loading ? null : `${rateCountUp}%`, sub: `${stats.closed}/${stats.total}`, color: "emerald" },
          { icon: Flame,        label: "Streak",          value: loading ? null : `${stats.streak}`,   sub: "mois consécutifs",       color: "amber"  },
        ].map(({ icon: Icon, label, value, sub, color }, i) => (
          <div key={label} className={`pf-kpi pf-kpi--${color}`} style={{ animationDelay: `${i * 70}ms` }}>
            <div className="pf-kpi__icon"><Icon size={18} /></div>
            <div className="pf-kpi__body">
              {value == null ? <Skel h={28} w={55} r={6} /> : <p className="pf-kpi__value">{value}</p>}
              <p className="pf-kpi__label">{label}</p>
              <p className="pf-kpi__sub">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ MID ROW: Goal + Chart ══ */}
      <div className="pf-mid">

        {/* Monthly goal card */}
        <div className="pf-card pf-goal-card">
          <div className="pf-card__head">
            <div>
              <p className="pf-card__title">Objectif du mois</p>
              <p className="pf-card__sub">
                {months[months.length - 1].label} {months[months.length - 1].year}
              </p>
            </div>
            <button className="pf-edit-goal-btn" onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}>
              Modifier
            </button>
          </div>

          {editingGoal ? (
            <div className="pf-goal-edit">
              <label className="pf-goal-edit__label">Objectif (deals closés)</label>
              <input
                className="pf-goal-edit__input"
                type="number" min={1} max={999}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                autoFocus
              />
              <div className="pf-goal-edit__actions">
                <button className="pf-btn pf-btn--ghost" onClick={() => setEditingGoal(false)}>Annuler</button>
                <button className="pf-btn pf-btn--primary" onClick={saveGoal}>Sauvegarder</button>
              </div>
            </div>
          ) : (
            <div className="pf-goal-body">
              {loading ? (
                <Skel h={120} w={120} r={60} />
              ) : (
                <Gauge pct={goalPct} color={goalPct >= 100 ? "#10b981" : goalPct >= 60 ? "#6366f1" : "#f59e0b"} />
              )}
              <div className="pf-goal-info">
                <p className="pf-goal-count">
                  <span className="pf-goal-count__done" style={{ color: goalPct >= 100 ? "#10b981" : "#6366f1" }}>
                    {loading ? "—" : stats.closedThisMonth}
                  </span>
                  <span className="pf-goal-count__sep"> / </span>
                  <span className="pf-goal-count__total">{goal}</span>
                </p>
                <p className="pf-goal-label">deals closés ce mois</p>
                {!loading && (
                  <div className={`pf-goal-chip${goalPct >= 100 ? " pf-goal-chip--done" : ""}`}>
                    {goalPct >= 100 ? "🏆 Objectif atteint !" : goalPct >= 60 ? `💪 ${goal - stats.closedThisMonth} restants` : `🎯 ${goal - stats.closedThisMonth} deals à closer`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal progress bar */}
          {!editingGoal && (
            <div className="pf-goal-bar-wrap">
              <div className="pf-goal-bar-track">
                <div
                  className="pf-goal-bar-fill"
                  style={{
                    width: barsReady ? `${goalPct}%` : "0%",
                    background: goalPct >= 100 ? "#10b981" : goalPct >= 60 ? "#6366f1" : "#f59e0b",
                  }}
                />
              </div>
              <span className="pf-goal-bar-pct">{goalPct}%</span>
            </div>
          )}
        </div>

        {/* Monthly bar chart */}
        <div className="pf-card">
          <div className="pf-card__head">
            <div>
              <p className="pf-card__title">Deals closés / mois</p>
              <p className="pf-card__sub">6 derniers mois</p>
            </div>
            {!loading && stats.best?.closed > 0 && (
              <div className="pf-best-badge">
                <Award size={12} /> Meilleur : {stats.best.label} ({stats.best.closed})
              </div>
            )}
          </div>
          <BarChart data={stats.monthly} loading={loading} barsReady={barsReady} />
        </div>
      </div>

      {/* ══ BOTTOM ROW: Status breakdown + Recent closes ══ */}
      <div className="pf-bottom">

        {/* Status breakdown */}
        <div className="pf-card">
          <div className="pf-card__head">
            <div>
              <p className="pf-card__title">Répartition des statuts</p>
              <p className="pf-card__sub">{stats.total} leads au total</p>
            </div>
          </div>
          <div className="pf-breakdown">
            {loading
              ? [1,2,3,4].map((i) => (
                  <div key={i} className="pf-breakdown-row">
                    <Skel h={12} w={80} r={4} />
                    <Skel h={8} w="100%" r={99} />
                    <Skel h={12} w={30} r={4} />
                  </div>
                ))
              : stats.byStatus.map((s, i) => {
                  const pct = stats.total ? Math.round((s.count / stats.total) * 100) : 0;
                  return (
                    <div key={s.key} className="pf-breakdown-row" style={{ animationDelay: `${i * 55}ms` }}>
                      <div className="pf-breakdown-label">
                        <span className="pf-breakdown-dot" style={{ background: s.color }} />
                        {s.label}
                      </div>
                      <div className="pf-breakdown-track">
                        <div
                          className="pf-breakdown-fill"
                          style={{
                            width: barsReady ? `${pct}%` : "0%",
                            background: s.color,
                          }}
                        />
                      </div>
                      <div className="pf-breakdown-right">
                        <span className="pf-breakdown-count" style={{ color: s.color }}>{s.count}</span>
                        <span className="pf-breakdown-pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Recent closes */}
        <div className="pf-card">
          <div className="pf-card__head">
            <div>
              <p className="pf-card__title">Derniers deals closés</p>
              <p className="pf-card__sub">Vos succès récents</p>
            </div>
          </div>
          {loading ? (
            <div className="pf-recent-skel">
              {[1,2,3].map((i) => (
                <div key={i} className="pf-recent-row">
                  <Skel h={36} w={36} r={10} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                    <Skel h={12} w="55%" r={4} />
                    <Skel h={10} w="35%" r={4} />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.recentClosed.length === 0 ? (
            <p className="pf-empty">Aucun deal closé pour l'instant.<br/>Allez, vous pouvez le faire ! 💪</p>
          ) : (
            <div className="pf-recent-list">
              {stats.recentClosed.map((l, i) => (
                <div
                  key={l._id}
                  className="pf-recent-row"
                  style={{ animationDelay: `${i * 55}ms` }}
                  onClick={() => navigate(`/salesman/leads/${l._id}`)}
                >
                  <div className="pf-recent-av" style={{ background: acolor(l._id) }}>
                    {initials(l)}
                  </div>
                  <div className="pf-recent-info">
                    <p className="pf-recent-name">{l.firstName} {l.lastName}</p>
                    <p className="pf-recent-date">{fmtDate(l.updatedAt)}</p>
                  </div>
                  <div className="pf-recent-trophy">🏆</div>
                  <ChevronRight size={14} className="pf-recent-arrow" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
