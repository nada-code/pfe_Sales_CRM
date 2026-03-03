import { useState } from "react";
import { assignLead } from "../../api/leadsApi";
import { STATUS_CFG, SOURCE_CFG, KANBAN_COLS } from "../../config/leadsConfig";
import useLeads from "../../hooks/Uselead";
import { Spinner, Toast } from "../../components/UI";
import LeadCard   from "../../components/leads/LeadCard";
import KanbanCol  from "../../components/leads/KanbanCol";
import TableView  from "../../components/leads/TableView";
import Pagination from "../../components/leads/Pagination";
import LeadPage from "../../components/leads/leadPage";
import NewLeadModal from "../../components/modals/NewLeadModal";
import AssignModal  from "../../components/modals/AssignModal";
import ImportModal  from "../../components/modals/ImportModal";

import "../../styles/leads.css";


export default function LeadsManagement() {
  const {
    leads, stats, loading, error,
    page, pages, total, setPage,
    filterStatus, filterSource, showUnassigned,
    setFilterStatus, setFilterSource, setShowUnassigned,
    debouncedSearch, reload, reloadStats,
  } = useLeads();

  const [searchInput,  setSearchInput]  = useState("");
  const [view,         setView]         = useState("table");
  const [assignModal,  setAssignModal]  = useState(null);
  const [drawerLeadId, setDrawerLeadId] = useState(null);
  const [newLeadModal, setNewLeadModal] = useState(false);
  const [importModal,  setImportModal]  = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  const statsMap        = Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count]));
  const unassignedCount = leads.filter((l) => !l.assignedTo).length;

  async function handleAssign(leadId, salesmanId) {
    try {
      await assignLead(leadId, salesmanId || null);
      reload(); reloadStats();
      showToast(salesmanId ? "Lead assigned successfully" : "Lead unassigned");
    } catch (e) { showToast(e.message, "error"); throw e; }
  }

  return (
    <div className="leads-root">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="leads-header">
        <div>
          <h1 className="leads-header__title">Leads</h1>
          <p className="leads-header__subtitle">
            {stats.totalLeads || 0} total ·{" "}
            <span className="leads-header__subtitle--danger">{unassignedCount} unassigned on this page</span>
          </p>
        </div>
        <div className="leads-header__actions">
          <button className="btn-cancel" onClick={() => setImportModal(true)}>↑ Import</button>
          <button className="btn-primary" onClick={() => setNewLeadModal(true)}>+ New Lead</button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div className="leads-error-banner">
          <span>⚠ {error}</span>
          <button className="leads-error-banner__retry" onClick={reload}>Retry</button>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="leads-stats-bar">
        {Object.keys(STATUS_CFG).map((s) => {
          const cfg    = STATUS_CFG[s];
          const count  = statsMap[s] || 0;
          const active = filterStatus === s;
          return (
            <div
              key={s}
              className="leads-stat-card"
              style={{
                background:  active ? cfg.light : undefined,
                boxShadow:   active ? `0 0 0 2px ${cfg.color}` : undefined,
                borderTop:   `3px solid ${cfg.color}`,
              }}
              onClick={() => setFilterStatus(active ? "" : s)}
            >
              <div className="leads-stat-card__count" style={{ color: cfg.color }}>
                {String(count).padStart(2, "0")}
              </div>
              <div className="leads-stat-card__label">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="leads-toolbar">
        <div className="leads-search">
          <span className="leads-search__icon">🔍</span>
          <input
            className="leads-search__input"
            placeholder="Search leads…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value); }}
          />
          {searchInput && (
            <button className="leads-search__clear" onClick={() => { setSearchInput(""); debouncedSearch(""); }}>✕</button>
          )}
        </div>

        <button
          className={`leads-unassigned-toggle${showUnassigned ? " leads-unassigned-toggle--on" : " leads-unassigned-toggle--off"}`}
          onClick={() => setShowUnassigned(!showUnassigned)}
        >
          <span className={`leads-unassigned-toggle__dot${showUnassigned ? " leads-unassigned-toggle__dot--on" : " leads-unassigned-toggle__dot--off"}`} />
          Unassigned only
          {showUnassigned && unassignedCount > 0 && (
            <span className="leads-unassigned-toggle__badge">{unassignedCount}</span>
          )}
        </button>

        <select className="leads-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="leads-filter-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="leads-view-switcher">
          {/* {[{ k: "cards", icon: "⊞" }, { k: "kanban", icon: "⋮⋮⋮" }, { k: "table", icon: "≡" }].map((v) => ( */}
          {[{ k: "table", icon: "≡" },{ k: "cards", icon: "⊞" }].map((v) => (
            <button
              key={v.k}
              className={`leads-view-switcher__btn${view === v.k ? " leads-view-switcher__btn--active" : ""}`}
              onClick={() => setView(v.k)}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ─────────────────────────────────────── */}
      <div className="leads-count">
        {loading && <Spinner size={12} />}
        Showing {leads.length} of {total} leads
        {showUnassigned  && " · unassigned only"}
        {filterStatus    && ` · ${STATUS_CFG[filterStatus]?.label}`}
        {filterSource    && ` · ${SOURCE_CFG[filterSource]?.label}`}
      </div>

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {loading && leads.length === 0 && (
        <div className="leads-skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="leads-skeleton-card">
              <div className="leads-skeleton-card__bar" />
            </div>
          ))}
        </div>
      )}

      {/* ── Views ────────────────────────────────────────────── */}
      {(!loading || leads.length > 0) && (
        <>
          {view === "cards" && (
            <div className="leads-cards-grid">
              {leads.map((l) => (
                <LeadCard key={l._id} lead={l} onOpen={setDrawerLeadId} onAssignClick={setAssignModal} />
              ))}
              {leads.length === 0 && !loading && (
                <div className="leads-empty">
                  <div className="leads-empty__icon">🔍</div>
                  <div className="leads-empty__title">No leads found</div>
                  <div className="leads-empty__hint">Try adjusting your filters</div>
                </div>
              )}
            </div>
          )}

          {/* {view === "kanban" && (
            <div className="leads-kanban">
              {KANBAN_COLS.map((s) => (
                <KanbanCol key={s} status={s} leads={leads.filter((l) => l.status === s)} onOpen={setDrawerLeadId} onAssignClick={setAssignModal} />
              ))}
            </div>
          )} */}

          {view === "table" && (
            <TableView leads={leads} onOpen={setDrawerLeadId} onAssignClick={setAssignModal} />
          )}

          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {newLeadModal && (
        <NewLeadModal
          onClose={() => setNewLeadModal(false)}
          onCreated={(lead) => { showToast(`Lead ${lead.data?.firstName || lead.firstName} created`); reload(); reloadStats(); }}
        />
      )}
      {assignModal && (
        <AssignModal lead={assignModal} onClose={() => setAssignModal(null)} onAssign={handleAssign} />
      )}
      {drawerLeadId && (
        <LeadPage leadId={drawerLeadId} onClose={() => setDrawerLeadId(null)} onRefresh={reload} onAssignClick={(l) => setAssignModal(l)} showToast={showToast} />
      )}
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onDone={() => { reload(); reloadStats(); showToast("Import terminé avec succès !"); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}