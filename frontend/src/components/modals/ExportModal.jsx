import { useState } from 'react';
import { exportCSV, exportExcel } from '../../utils/exportUtils';
import { fetchLeads } from '../../api/leadsApi';
import '../../styles/leads.css';

/**
 * ExportModal
 * Props:
 *   currentLeads  — leads already loaded in the current view (for "current page" export)
 *   totalLeads    — total count from API (to show in "export all" option)
 *   filters       — { status, source, search } — forwarded to API for full export
 *   onClose       — close handler
 */
export default function ExportModal({ currentLeads = [], totalLeads = 0, filters = {}, onClose }) {
  const [scope,    setScope]    = useState('current');  // 'current' | 'all'
  const [format,   setFormat]   = useState('csv');      // 'csv' | 'excel'
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleExport() {
    setLoading(true); setError('');
    try {
      let leads = currentLeads;

      if (scope === 'all') {
        // Fetch all leads without pagination, applying same active filters
        const params = {
          limit: 10000,
          ...(filters.status && { status: filters.status }),
          ...(filters.source && { source: filters.source }),
          ...(filters.search && { search: filters.search }),
          ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
        };
        const res = await fetchLeads(params);
        leads = res.data || res.leads || [];
      }

      if (leads.length === 0) {
        setError('Aucun lead à exporter.');
        return;
      }

      if (format === 'csv') {
        exportCSV(leads, 'leads');
      } else {
        await exportExcel(leads, 'leads');
      }

      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  const exportCount = scope === 'current' ? currentLeads.length : totalLeads;

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="em-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="em-header">
          <div className="em-header__icon">⬇</div>
          <div>
            <h2 className="em-title">Exporter les leads</h2>
            <p className="em-sub">Choisissez le format et la portée</p>
          </div>
          <button className="em-close" onClick={onClose} disabled={loading}>✕</button>
        </div>

        {/* Scope */}
        <div className="em-section">
          <p className="em-section__label">Leads à exporter</p>
          <div className="em-options">
            <label className={`em-option${scope === 'current' ? ' em-option--active' : ''}`}>
              <input type="radio" name="scope" value="current"
                checked={scope === 'current'}
                onChange={() => setScope('current')}
              />
              <div className="em-option__body">
                <span className="em-option__title">Page courante</span>
                <span className="em-option__sub">{currentLeads.length} lead{currentLeads.length > 1 ? 's' : ''} affichés</span>
              </div>
              <span className="em-option__badge">{currentLeads.length}</span>
            </label>

            <label className={`em-option${scope === 'all' ? ' em-option--active' : ''}`}>
              <input type="radio" name="scope" value="all"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              <div className="em-option__body">
                <span className="em-option__title">Tous les leads</span>
                <span className="em-option__sub">Avec les filtres actifs</span>
              </div>
              <span className="em-option__badge">{totalLeads}</span>
            </label>
          </div>
        </div>

        {/* Format */}
        <div className="em-section">
          <p className="em-section__label">Format de fichier</p>
          <div className="em-options em-options--row">
            <label className={`em-format${format === 'csv' ? ' em-format--active' : ''}`}>
              <input type="radio" name="format" value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <span className="em-format__icon">📄</span>
              <span className="em-format__name">CSV</span>
              <span className="em-format__ext">.csv</span>
            </label>
            <label className={`em-format${format === 'excel' ? ' em-format--active' : ''}`}>
              <input type="radio" name="format" value="excel"
                checked={format === 'excel'}
                onChange={() => setFormat('excel')}
              />
              <span className="em-format__icon">📊</span>
              <span className="em-format__name">Excel</span>
              <span className="em-format__ext">.xlsx</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="em-error">⚠ {error}</div>
        )}

        {/* Actions */}
        <div className="em-actions">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={loading}>
            {loading
              ? '⏳ Export en cours…'
              : `⬇ Exporter ${exportCount} lead${exportCount > 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
