import { useState } from 'react';
import { assignLead } from '../../api/leadsApi';
import { STATUS_CFG, SOURCE_CFG } from '../../config/leadsConfig';
import useLeads from '../../hooks/Uselead';
import { Spinner, Toast } from '../../components/UI';
import LeadCard     from '../../components/leads/LeadCard';
import TableView    from '../../components/leads/TableView';
import Pagination   from '../../components/leads/Pagination';
import NewLeadModal from '../../components/modals/NewLeadModal';
import AssignModal  from '../../components/modals/AssignModal';
import ImportModal  from '../../components/modals/ImportModal';
import { Upload, Plus, RefreshCw, Search, LayoutGrid, List, AlertCircle,  Download } from "lucide-react";
import ExportModal from '../../components/modals/ExportModal';

import "../../styles/leads.css";
import "../../styles/LeadsManagementStyles.css";

export default function LeadsManagement() {
  const {
    leads, stats, loading, error,
    page, pages, total, setPage,
    filterStatus, filterSource, showUnassigned,
    setFilterStatus, setFilterSource, setShowUnassigned,
    debouncedSearch, reload,
  } = useLeads();

  const [searchInput,  setSearchInput]  = useState('');
  const [view,         setView]         = useState('table');
  const [assignModal,  setAssignModal]  = useState(null);
  const [newLeadModal, setNewLeadModal] = useState(false);
  const [importModal,  setImportModal]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const [exportModal,  setExportModal]  = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });


  const statsMap        = Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count]));
  const unassignedCount = leads.filter((l) => !l.assignedTo).length;

  // ── Assign ─────────────────────────────────────────────────────────────────
  // No need to call emitLeadUpdate() — server emits lead:updated via socket
  async function handleAssign(leadId, salesmanId) {
    try {
      await assignLead(leadId, salesmanId || null);
      showToast(salesmanId ? 'Lead assigned ✓' : 'Assignment removed');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to assign', 'error');
    }
    setAssignModal(null);
  }

  return (
    <div className="lm-root">

      {/* Header */}
      <div className="lm-header">
        <div className="lm-header__left">
          <h1 className="lm-title">Leads Management</h1>
          <p className={`lm-subtitle${error ? " lm-subtitle--danger" : ""}`}>
            {error ? `⚠ ${error}` : `${total} leads au total`}
          </p>
        </div>
        <div className="lm-header__actions">
          {/* ── Actualiser ── */}
          <button className="lm-btn lm-btn--ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? "lm-spin" : ""} />
            Actualiser
          </button>
          <button className="btn-cancel" onClick={() => setImportModal(true)}>⬆ Import</button>
          <button className="lm-btn lm-btn--ghost" onClick={() => setExportModal(true)}>
            <Download size={14} /> Export
          </button>
          <button className="btn-primary" onClick={() => setNewLeadModal(true)}>+ New Lead</button>
        </div>
      </div>

      {/* ══ STATS BAR ══ */}
      <div className="lm-stats">
        {Object.entries(STATUS_CFG).map(([k, v], i) => (
          <button
            key={k}
            className={`lm-stat-card${filterStatus === k ? " lm-stat-card--active" : ""}`}
            style={{ "--sc": v.color, "--sl": v.light, animationDelay: `${i * 55}ms` }}
            onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
          >
            <div className="lm-stat-card__top">
              <span className="lm-stat-dot" style={{ background: v.dot || v.color }} />
              <span className="lm-stat-label">{v.label}</span>
            </div>
            <p className="lm-stat-count" style={{ color: v.color }}>
              {loading ? "—" : (statsMap[k] ?? 0)}
            </p>
            {filterStatus === k && <div className="lm-stat-card__bar" style={{ background: v.color }} />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="lm-toolbar">
        <div className="lm-search">
          <span className="lm-search__icon">🔍</span>
          <input className="lm-search__input" placeholder="Search by name, email, phone…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value); }}
          />
          {searchInput && (
            <button className="lm-search__clear"
              onClick={() => { setSearchInput(""); debouncedSearch(""); }}>✕</button>
          )}
        </div>

        <button
          className={`leads-unassigned-toggle leads-unassigned-toggle--${showUnassigned ? "on" : "off"}`}
          onClick={() => setShowUnassigned(!showUnassigned)}>
          <span className={`leads-unassigned-toggle__dot leads-unassigned-toggle__dot--${showUnassigned ? "on" : "off"}`} />
          Unassigned only
          {showUnassigned && unassignedCount > 0 && (
            <span className="leads-unassigned-toggle__badge">{unassignedCount}</span>
          )}
        </button>

        <select className="lm-filter-select" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="lm-filter-select" value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="lm-view-toggle">
          <button
            className={`lm-view-btn${view === "table" ? " active" : ""}`}
            onClick={() => setView("table")} title="Vue tableau"
          >
            <List size={15} />
          </button>
          <button
            className={`lm-view-btn${view === "cards" ? " active" : ""}`}
            onClick={() => setView("cards")} title="Vue cartes"
          >
            <LayoutGrid size={15} />
          </button>
         
        </div>
      </div>

      {/* Count */}
      <div className="lm-count">
        {loading && <Spinner size={12} />}
        Showing {leads.length} of {total} leads
        {filterStatus && ` · ${STATUS_CFG[filterStatus]?.label}`}
        {filterSource && ` · ${SOURCE_CFG[filterSource]?.label}`}
      </div>

      
      {/* ══ ERROR ══ */}
      {error && (
        <div className="lm-error">
          <AlertCircle size={14} /> {error}
          <button className="lm-error__retry" onClick={reload}>Réessayer</button>
        </div>
      )}

      {/* ══ SKELETONS ══ */}
      {loading && leads.length === 0 && (
        <div className="lm-skel-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="lm-skel-card">
              <div className="lm-skel-bar" />
              <div className="lm-skel-line lm-skel-line--w60" />
              <div className="lm-skel-line lm-skel-line--w40" />
            </div>
          ))}
        </div>
      )}

      {(!loading || leads.length > 0) && (
        <>
          {view === "cards" && (
            <div className="leads-cards-grid">
              {leads.map((l) => (
                <LeadCard key={l._id} lead={l} onAssignClick={setAssignModal} onNoteAdded={false} />
              ))}
              {leads.length === 0 && !loading && (
                <div className="lm-empty">
                  <div className="lm-empty__icon">🔍</div>
                  <p className="lm-empty__title">Aucun lead trouvé</p>
                  <p className="lm-empty__hint">Essayez d'ajuster vos filtres</p>
                </div>
              )}
            </div>
          )}
        
          {view === "table" && (
            <TableView leads={leads} onAssignClick={setAssignModal} showAddNote={false} />
          )}
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}

      {/* Modals */}
      {newLeadModal && (
        <NewLeadModal
          onClose={() => setNewLeadModal(false)}
          onCreated={(lead) => {
            showToast(`Lead ${lead?.firstName || ""} created`);
          }}
        />
      )}
      {assignModal && (
        <AssignModal lead={assignModal} onClose={() => setAssignModal(null)} onAssign={handleAssign} />
      )}
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onCompleted={() => { reload(); showToast("Import completed!"); }}
        />
      )}

      {exportModal && (
        <ExportModal
          currentLeads={leads}
          totalLeads={total}
          filters={{ status: filterStatus, source: filterSource }}
          onClose={() => setExportModal(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}