import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLeads, fetchStats } from "../api/leadsApi";
import { PAGE_SIZE } from "../config/leadsConfig";
import { onLeadUpdate } from "../utils/leadEvents";

const POLL_MS = 30_000;

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

  const debounceTimer = useRef(null);
  const loadLeadsRef = useRef(null);

  const debouncedSearch = useCallback((val) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPageState(1); }, 400);
  }, []);

  /* ── main loader ─────────────────────────────────────────────────────── */
  const loadLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search         && { search }),
        ...(filterStatus   && { status: filterStatus }),
        ...(filterSource   && { source: filterSource }),
        ...(showUnassigned && { assignedTo: "null" }),
      };
      const [leadsRes, statsRes] = await Promise.all([fetchLeads(params), fetchStats()]);
      setLeads(leadsRes.data  || []);
      setTotal(leadsRes.total || 0);
      setPages(leadsRes.pages || 1);
      setStats(statsRes);
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, filterStatus, filterSource, showUnassigned]);

  // Keep ref updated with latest callback
  loadLeadsRef.current = loadLeads;

  /* ── initial + filter changes ────────────────────────────────────────── */
  useEffect(() => { loadLeads(); }, [loadLeads]);

  /* ── listen to ANY lead mutation → silent reload ─────────────────────── */
  useEffect(() => {
    const unsub = onLeadUpdate(() => {
      if (loadLeadsRef.current) loadLeadsRef.current(true);
    });
    return unsub;
  }, []);

  /* ── poll every 30s ──────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => loadLeads(true), POLL_MS);
    return () => clearInterval(id);
  }, [loadLeads]);

  /* ── initial reload on mount ───────────────────────────────────────── */
  useEffect(() => {
    // Small delay to ensure component is fully mounted, then do a silent reload
    // This catches any changes that happened just before this component mounted
    const timer = setTimeout(() => loadLeads(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const reloadStats = async () => {
    try { setStats(await fetchStats()); } catch { /**/ }
  };

  return {
    leads, stats, loading, error,
    page, pages, total,
    setPage:           (v) => setPageState(v),
    setFilterStatus:   (v) => { setFilterStatus(v);  setPageState(1); },
    setFilterSource:   (v) => { setFilterSource(v);  setPageState(1); },
    setShowUnassigned: (v) => { setShowUnassigned(v); setPageState(1); },
    filterStatus, filterSource, showUnassigned,
    debouncedSearch,
    reload:       () => loadLeads(false),
    reloadSilent: () => loadLeads(true),
    reloadStats,
  };
}

