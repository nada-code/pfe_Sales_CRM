import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/Socketcontext';
import { fetchLeads, fetchStats } from '../api/leadsApi';
import { PAGE_SIZE } from '../config/leadsConfig';

export default function useLeads() {
  const socket = useSocket();

  const [leads,          setLeads]          = useState([]);
  const [stats,          setStats]          = useState({ totalLeads: 0, byStatus: [] });
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [page,           setPageState]      = useState(1);
  const [pages,          setPages]          = useState(1);
  const [total,          setTotal]          = useState(0);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSource,   setFilterSource]   = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);

  const debounceTimer = useRef(null);
  const loadRef       = useRef(null);

  const debouncedSearch = useCallback((val) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setSearch(val); setPageState(1); }, 400);
  }, []);

  // ── Main loader ────────────────────────────────────────────────────────────
  const loadLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(search         && { search }),
        ...(filterStatus   && { status: filterStatus }),
        ...(filterSource   && { source: filterSource }),
        ...(showUnassigned && { assignedTo: 'null' }),
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

  loadRef.current = loadLeads;

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // ── Socket: reload silently on any lead event ──────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const reload = () => loadRef.current?.(true);
    socket.on('lead:created',  reload);
    socket.on('lead:updated',  reload);
    socket.on('lead:deleted',  reload);
    socket.on('lead:imported', reload);
    return () => {
      socket.off('lead:created',  reload);
      socket.off('lead:updated',  reload);
      socket.off('lead:deleted',  reload);
      socket.off('lead:imported', reload);
    };
  }, [socket]);

  const reloadStats = async () => {
    try { setStats(await fetchStats()); } catch { /* noop */ }
  };

  return {
    leads, stats, loading, error,
    page, pages, total,
    setPage:           (v) => setPageState(v),
    setFilterStatus:   (v) => { setFilterStatus(v);   setPageState(1); },
    setFilterSource:   (v) => { setFilterSource(v);   setPageState(1); },
    setShowUnassigned: (v) => { setShowUnassigned(v); setPageState(1); },
    filterStatus, filterSource, showUnassigned,
    debouncedSearch,
    reload:       () => loadLeads(false),
    reloadSilent: () => loadLeads(true),
    reloadStats,
  };
}