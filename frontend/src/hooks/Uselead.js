import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLeads, fetchStats } from "../api/leadsApi";
import { PAGE_SIZE } from "../config/leadsConfig";

// ─── useLeads ─────────────────────────────────────────────────────────────────
// Centralises all data-fetching, filtering and pagination state for the leads
// feature. Consuming components remain stateless regarding network concerns.

export default function useLeads() {
  const [leads,          setLeads]          = useState([]);
  const [stats,          setStats]          = useState({ totalLeads: 0, byStatus: [] });
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [page,           setPageState]      = useState(1);
  const [pages,          setPages]          = useState(1);
  const [total,          setTotal]          = useState(0);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSource,   setFilterSource]   = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);

  const timer = useRef(null);

  // Debounce free-text search so we don't fire on every keystroke
  const debouncedSearch = useCallback((val) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(val); setPageState(1); }, 400);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterSource && { source: filterSource }),
        ...(showUnassigned && { assignedTo: "null" }),
      };
      const [leadsRes, statsRes] = await Promise.all([fetchLeads(params), fetchStats()]);
      setLeads(leadsRes.data || []);
      setTotal(leadsRes.total || 0);
      setPages(leadsRes.pages || 1);
      setStats(statsRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterSource, showUnassigned]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const reloadStats = async () => {
    try { setStats(await fetchStats()); } catch { /* silent */ }
  };

  // Helpers that reset page to 1 when a filter changes
  const setPage          = (v) => setPageState(v);
  const changeStatus     = (v) => { setFilterStatus(v);  setPageState(1); };
  const changeSource     = (v) => { setFilterSource(v);  setPageState(1); };
  const changeUnassigned = (v) => { setShowUnassigned(v); setPageState(1); };

  return {
    leads, stats, loading, error,
    page, pages, total, setPage,
    filterStatus,   setFilterStatus:   changeStatus,
    filterSource,   setFilterSource:   changeSource,
    showUnassigned, setShowUnassigned: changeUnassigned,
    debouncedSearch,
    reload: loadLeads,
    reloadStats,
  };
}