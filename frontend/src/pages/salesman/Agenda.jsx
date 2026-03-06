import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeads, changeStatus } from "../../api/leadsApi";
import { useSocket } from "../../context/Socketcontext";
import { STATUS_CFG } from "../../config/leadsConfig";
import { acolor, initials } from "../../utils/LeadsUtils";
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, ChevronRight, Zap, Calendar } from "lucide-react";
import { Toast } from "../../components/UI";
import "../../styles/Agenda.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
const toArray = (r) => Array.isArray(r) ? r : r?.data ?? r?.leads ?? [];

const daysSince = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso)) / 86_400_000) : 999;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

const fmtRelative = (iso) => {
  if (!iso) return "—";
  const d = daysSince(iso);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  return `il y a ${d} j`;
};

// Leads that need follow-up = New, Contacted, Interested (not closed/lost)
const ACTIONABLE = ["New", "Contacted", "Interested"];

// Urgency grouping based on days since last update
function getUrgency(lead) {
  const d = daysSince(lead.updatedAt);
  if (ACTIONABLE.includes(lead.status)) {
    if (d >= 7)  return "urgent";   // > 1 week → red
    if (d >= 3)  return "attention"; // 3-6 days → amber
    if (d === 0) return "today";     // updated today → green
    return "soon";                   // 1-2 days → blue
  }
  return null; // DealClosed / Lost / NotInterested → skip
}

const GROUPS = [
  { key: "urgent",    label: "Urgent",         sub: "Sans activité depuis +7 jours",  color: "#ef4444", bg: "#fff5f5", icon: AlertTriangle,  badge: "bg-red"   },
  { key: "attention", label: "À rappeler",     sub: "Sans activité depuis 3-6 jours", color: "#f59e0b", bg: "#fffbeb", icon: Clock,          badge: "bg-amber" },
  { key: "soon",      label: "En cours",       sub: "Actifs ces 2 derniers jours",    color: "#6366f1", bg: "#eef2ff", icon: Zap,            badge: "bg-indigo"},
  { key: "today",     label: "Traités aujourd'hui", sub: "Mis à jour aujourd'hui",   color: "#10b981", bg: "#f0fdf4", icon: CheckCircle2,   badge: "bg-green" },
];

// ── Quick status change dropdown ──────────────────────────────────────────────
function StatusDropdown({ lead, onChange, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sc  = STATUS_CFG[lead.status];

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="ag-status-wrap" ref={ref}>
      <button
        className="ag-status-btn"
        style={{ background: sc?.light, color: sc?.color }}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={saving}
      >
        {saving ? <span className="ag-dots"><span/><span/><span/></span> : sc?.label}
        <span className="ag-status-chevron">▾</span>
      </button>
      {open && (
        <div className="ag-status-menu">
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <button
              key={k}
              className={`ag-status-option${lead.status === k ? " ag-status-option--active" : ""}`}
              style={{ "--oc": v.color }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onChange(lead._id, k);
              }}
            >
              <span className="ag-status-option__dot" style={{ background: v.color }} />
              {v.label}
              {lead.status === k && <span className="ag-status-option__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Agenda() {
  const navigate  = useNavigate();
  const socket    = useSocket();
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(null); // leadId being saved
  const [toast,   setToast]   = useState(null);
  const [openGroups, setOpenGroups] = useState({ urgent: true, attention: true, soon: true, today: false });
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

  // ── Status change ──────────────────────────────────────────────────────────
  async function handleStatusChange(leadId, newStatus) {
    setSaving(leadId);
    try {
      await changeStatus(leadId, newStatus);
      setToast({ type: "success", message: `Statut → ${STATUS_CFG[newStatus]?.label} ✓` });
    } catch (err) {
      setToast({ type: "error", message: err?.response?.data?.message || "Erreur" });
    } finally {
      setSaving(null);
    }
  }

  // ── Grouped leads ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const out = { urgent: [], attention: [], soon: [], today: [] };
    leads.forEach((l) => {
      const u = getUrgency(l);
      if (u) out[u].push(l);
    });
    // Sort urgent first by oldest update
    ["urgent","attention"].forEach((k) =>
      out[k].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
    );
    return out;
  }, [leads]);

  const totalActionable = Object.values(grouped).flat().length;
  const urgentCount     = grouped.urgent.length;

  const toggleGroup = (key) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // ── Lead row ───────────────────────────────────────────────────────────────
  const LeadRow = ({ lead, groupColor, idx }) => {
    const d   = daysSince(lead.updatedAt);
    const col = acolor(lead._id);
    return (
      <div
        className="ag-lead-row"
        style={{ animationDelay: `${idx * 45}ms` }}
        onClick={() => navigate(`/salesman/leads/${lead._id}`)}
      >
        <div className="ag-lead-av" style={{ background: col }}>
          {initials(lead)}
        </div>
        <div className="ag-lead-info">
          <p className="ag-lead-name">{lead.firstName} {lead.lastName}</p>
          <p className="ag-lead-meta">
            {lead.email ?? lead.phone ?? "—"}
            {lead.city && <span className="ag-lead-city"> · {lead.city}</span>}
          </p>
        </div>
        <div className="ag-lead-since">
          <span className="ag-lead-since__badge" style={{ color: groupColor }}>
            {fmtRelative(lead.updatedAt)}
          </span>
          <span className="ag-lead-since__date">{fmtDate(lead.updatedAt)}</span>
        </div>
        <StatusDropdown
          lead={lead}
          onChange={handleStatusChange}
          saving={saving === lead._id}
        />
        <button
          className="ag-open-btn"
          onClick={(e) => { e.stopPropagation(); navigate(`/salesman/leads/${lead._id}`); }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  const Skel = () => (
    <div className="ag-lead-row ag-lead-row--skel">
      <div className="ag-skel ag-skel--av" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="ag-skel ag-skel--line" style={{ width: "45%" }} />
        <div className="ag-skel ag-skel--line" style={{ width: "30%" }} />
      </div>
      <div className="ag-skel ag-skel--badge" />
      <div className="ag-skel ag-skel--btn" />
    </div>
  );

  return (
    <div className="ag-root">

      {/* ══ HEADER ══ */}
      <div className="ag-header">
        <div>
          <h1 className="ag-title">
            <Calendar size={22} className="ag-title__icon" />
            Agenda & Rappels
          </h1>
          <p className="ag-subtitle">
            {loading ? "Chargement…" : `${totalActionable} lead${totalActionable !== 1 ? "s" : ""} à traiter`}
            {urgentCount > 0 && !loading && (
              <span className="ag-urgent-chip">🔴 {urgentCount} urgent{urgentCount > 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <button className="ag-refresh-btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* ══ ERROR ══ */}
      {error && (
        <div className="ag-error">
          <AlertTriangle size={14} /> {error}
          <button className="ag-error__retry" onClick={() => load()}>Réessayer</button>
        </div>
      )}

      {/* ══ LEGEND ══ */}
      <div className="ag-legend">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const count = grouped[g.key]?.length ?? 0;
          return (
            <div key={g.key} className="ag-legend-chip" style={{ "--lc": g.color, "--lb": g.bg }}>
              <Icon size={13} />
              <span>{g.label}</span>
              <span className="ag-legend-chip__count">{loading ? "—" : count}</span>
            </div>
          );
        })}
      </div>

      {/* ══ GROUPS ══ */}
      {loading ? (
        <div className="ag-group">
          <div className="ag-group__header ag-group__header--skel">
            <div className="ag-skel ag-skel--title" />
          </div>
          <div className="ag-group__body">
            {[1,2,3].map((i) => <Skel key={i} />)}
          </div>
        </div>
      ) : totalActionable === 0 ? (
        <div className="ag-empty">
          <div className="ag-empty__circle">
            <CheckCircle2 size={32} strokeWidth={1.5} />
          </div>
          <h3 className="ag-empty__title">Tout est traité !</h3>
          <p className="ag-empty__text">Aucun lead en attente de relance.</p>
        </div>
      ) : (
        GROUPS.map((g) => {
          const items = grouped[g.key] ?? [];
          if (items.length === 0) return null;
          const Icon = g.icon;
          const isOpen = openGroups[g.key];
          return (
            <div key={g.key} className={`ag-group${isOpen ? " ag-group--open" : ""}`}>
              <button
                className="ag-group__header"
                style={{ "--gc": g.color, "--gb": g.bg }}
                onClick={() => toggleGroup(g.key)}
              >
                <div className="ag-group__left">
                  <div className="ag-group__icon-wrap" style={{ background: g.bg }}>
                    <Icon size={15} style={{ color: g.color }} />
                  </div>
                  <div>
                    <p className="ag-group__label">{g.label}</p>
                    <p className="ag-group__sub">{g.sub}</p>
                  </div>
                </div>
                <div className="ag-group__right">
                  <span className="ag-group__count" style={{ background: g.bg, color: g.color }}>
                    {items.length}
                  </span>
                  <span className={`ag-group__chevron${isOpen ? " ag-group__chevron--open" : ""}`}>
                    ▾
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="ag-group__body">
                  {items.map((lead, idx) => (
                    <LeadRow key={lead._id} lead={lead} groupColor={g.color} idx={idx} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
