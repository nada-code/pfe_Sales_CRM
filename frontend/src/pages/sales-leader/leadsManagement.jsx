import { useState } from "react";
import { assignLead } from "../../api/leadsApi";
import { STATUS_CFG, SOURCE_CFG } from "../../config/leadsConfig";
import useLeads from "../../hooks/Uselead";
import { Spinner, Toast } from "../../components/UI";
import LeadCard    from "../../components/leads/LeadCard";
import TableView   from "../../components/leads/TableView";
import Pagination  from "../../components/leads/Pagination";
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
      showToast(salesmanId ? "Lead assigned ✓" : "Assignment removed");
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to assign", "error");
    }
    setAssignModal(null);
  }

  return (
    <div className="leads-root">

      {/* ── Header ── */}
      <div className="leads-header">
        <div>
          <h1 className="leads-header__title">Leads Management</h1>
          <p className={`leads-header__subtitle${error ? " leads-header__subtitle--danger" : ""}`}>
            {error ? `Error: ${error}` : `${total} leads total`}
          </p>
        </div>
        <div className="leads-header__actions">
          <button className="btn-cancel" onClick={() => setImportModal(true)}>⬆ Import</button>
          <button className="btn-primary" onClick={() => setNewLeadModal(true)}>+ New Lead</button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="leads-stats-bar">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} className="leads-stat-card"
            style={{ borderTop: `3px solid ${v.color}` }}
            onClick={() => setFilterStatus(filterStatus === k ? "" : k)}>
            <div className="leads-stat-card__count" style={{ color: v.color }}>{statsMap[k] ?? 0}</div>
            <div className="leads-stat-card__label">{v.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="leads-toolbar">
        <div className="leads-search">
          <span className="leads-search__icon">🔍</span>
          <input
            className="leads-search__input"
            placeholder="Search by name, email, phone…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value); }}
          />
          {searchInput && (
            <button className="leads-search__clear"
              onClick={() => { setSearchInput(""); debouncedSearch(""); }}>✕</button>
          )}
        </div>

        <button
          className={`leads-unassigned-toggle leads-unassigned-toggle--${showUnassigned ? "on" : "off"}`}
          onClick={() => setShowUnassigned(!showUnassigned)}
        >
          <span className={`leads-unassigned-toggle__dot leads-unassigned-toggle__dot--${showUnassigned ? "on" : "off"}`} />
          Unassigned only
          {showUnassigned && unassignedCount > 0 && (
            <span className="leads-unassigned-toggle__badge">{unassignedCount}</span>
          )}
        </button>

        <select className="leads-filter-select" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="leads-filter-select" value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="leads-view-switcher">
          {[{ k: "table", icon: "≡" }, { k: "cards", icon: "⊞" }].map((v) => (
            <button key={v.k}
              className={`leads-view-switcher__btn${view === v.k ? " leads-view-switcher__btn--active" : ""}`}
              onClick={() => setView(v.k)}>
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count ── */}
      <div className="leads-count">
        {loading && <Spinner size={12} />}
        Showing {leads.length} of {total} leads
        {filterStatus && ` · ${STATUS_CFG[filterStatus]?.label}`}
        {filterSource && ` · ${SOURCE_CFG[filterSource]?.label}`}
      </div>

      {error && (
        <div className="leads-error-banner">
          ⚠ {error}
          <button className="leads-error-banner__retry" onClick={reload}>Retry</button>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && leads.length === 0 && (
        <div className="leads-skeleton-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="leads-skeleton-card">
              <div className="leads-skeleton-card__bar" />
            </div>
          ))}
        </div>
      )}

      {/* ── Views ── */}
      {(!loading || leads.length > 0) && (
        <>
          {view === "cards" && (
            <div className="leads-cards-grid">
              {leads.map((l) => (
                <LeadCard
                  key={l._id}
                  lead={l}
                  onAssignClick={setAssignModal}
                  // ✅ No onStatusChange, no onNoteClick — read-only
                />
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

          {view === "table" && (
            <TableView
              leads={leads}
              onAssignClick={setAssignModal}
              // ✅ No onStatusChange, no onNoteClick — read-only
            />
          )}

          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}

      {/* ── Modals ── */}
      {newLeadModal && (
        <NewLeadModal
          onClose={() => setNewLeadModal(false)}
          onCreated={(lead) => {
            // showToast(`Lead ${lead.data?.firstName || lead.firstName} created`);
            reload(); reloadStats();
          }}
        />
      )}

      {assignModal && (
        <AssignModal
          lead={assignModal}
          onClose={() => setAssignModal(null)}
          onAssign={handleAssign}
        />
      )}

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onDone={() => { reload(); reloadStats(); showToast("Import completed!"); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}