import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getUsers, approveUser, getSalesmanStats } from '../../api/authApi';
import { useSocket } from '../../context/Socketcontext';
import { CheckCircle2, Clock, RefreshCw, Users, AlertCircle } from 'lucide-react';
import '../../styles/ApprovalsStyles.css';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const initials = (u) =>
  `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
];
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(id.length - 1) ?? 0) % AVATAR_COLORS.length];

export default function Approvals() {
  const socket = useSocket();

  const [salesmen,  setSalesmen]  = useState([]);
  const [stats,     setStats]     = useState({ pending: 0, approved: 0, total: 0 });
  const [loading,   setLoading]   = useState(true);
  const [approving, setApproving] = useState(null);
  const [leaving,   setLeaving]   = useState(new Set());

  // Fetch pending list + real stats from DB in parallel
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        getUsers({ role: 'salesman', isApproved: false }),
        getSalesmanStats(),
      ]);
      setSalesmen(pendingRes.data ?? []);
      setStats(statsRes.data ?? { pending: 0, approved: 0, total: 0 });
    } catch {
      toast.error('Impossible de charger les comptes en attente');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Socket: refresh on new registration or approval from any client
  useEffect(() => {
    if (!socket) return;
    const reload = () => fetchAll(true);
    socket.on('user:registered', reload);
    socket.on('user:approved',   reload);
    return () => {
      socket.off('user:registered', reload);
      socket.off('user:approved',   reload);
    };
  }, [socket, fetchAll]);

  const handleApprove = async (userId) => {
    setApproving(userId);
    try {
      await approveUser(userId);
      toast.success('Compte approuvé ✓');
      // Animate card out, then sync real data from DB
      setLeaving((prev) => new Set([...prev, userId]));
      setTimeout(() => {
        setSalesmen((prev) => prev.filter((u) => u._id !== userId));
        setLeaving((prev) => { const s = new Set(prev); s.delete(userId); return s; });
        fetchAll(true);
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'approbation");
    } finally {
      setApproving(null);
    }
  };

  const Skel = () => (
    <div className="ap-card ap-card--skel">
      <div className="ap-skel-av" />
      <div className="ap-skel-lines">
        <div className="ap-skel-line ap-skel-line--w50" />
        <div className="ap-skel-line ap-skel-line--w70" />
        <div className="ap-skel-line ap-skel-line--w35" />
      </div>
      <div className="ap-skel-btn" />
    </div>
  );

  return (
    <div className="ap-root">

      {/* ══ HEADER ══ */}
      <div className="ap-header">
        <div className="ap-header__left">
          <h1 className="ap-title">Approbations</h1>
          <p className="ap-subtitle">Valider les nouveaux comptes salesman</p>
        </div>

        <div className="ap-header__right">
          <div className="ap-badge-count">
            <Clock size={13} />
            {loading ? '…' : stats.pending} en attente
          </div>
          <button className="ap-refresh" onClick={() => fetchAll()} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'ap-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ══ KPI strip — données réelles depuis la DB ══ */}
      <div className="ap-kpi-strip">
        <div className="ap-kpi">
          <div className="ap-kpi__icon ap-kpi__icon--amber"><Clock size={18} /></div>
          <div>
            <p className="ap-kpi__value">{loading ? '—' : stats.pending}</p>
            <p className="ap-kpi__label">En attente</p>
          </div>
        </div>
        <div className="ap-kpi">
          <div className="ap-kpi__icon ap-kpi__icon--emerald"><CheckCircle2 size={18} /></div>
          <div>
            <p className="ap-kpi__value">{loading ? '—' : stats.approved}</p>
            <p className="ap-kpi__label">Approuvés</p>
          </div>
        </div>
        <div className="ap-kpi">
          <div className="ap-kpi__icon ap-kpi__icon--indigo"><Users size={18} /></div>
          <div>
            <p className="ap-kpi__value">{loading ? '—' : stats.total}</p>
            <p className="ap-kpi__label">Total salesmen</p>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      {loading ? (
        <div className="ap-list">
          {[1,2,3].map((i) => <Skel key={i} />)}
        </div>

      ) : salesmen.length === 0 ? (
        <div className="ap-empty">
          <div className="ap-empty__circle">
            <CheckCircle2 size={32} strokeWidth={1.5} />
          </div>
          <h3 className="ap-empty__title">Tout est à jour !</h3>
          <p className="ap-empty__text">Aucun compte en attente d'approbation.</p>
        </div>

      ) : (
        <div className="ap-list">
          {salesmen.map((user, i) => (
            <div
              key={user._id}
              className={`ap-card${leaving.has(user._id) ? ' ap-card--leaving' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* shimmer */}
              <div className="ap-card__shimmer" />

              {/* Avatar */}
              <div className="ap-avatar" style={{ background: avatarColor(user._id) }}>
                {initials(user)}
              </div>

              {/* Info */}
              <div className="ap-info">
                <p className="ap-info__name">{user.firstName} {user.lastName}</p>
                <p className="ap-info__email">{user.email}</p>
                <p className="ap-info__date">
                  <Clock size={10} /> Inscrit le {formatDate(user.createdAt)}
                </p>
              </div>

              {/* Right */}
              <div className="ap-card__right">
                <span className="ap-role-badge">Salesman</span>
                <button
                  className="ap-approve-btn"
                  onClick={() => handleApprove(user._id)}
                  disabled={approving === user._id}
                >
                  {approving === user._id ? (
                    <span className="ap-dots">
                      <span /><span /><span />
                    </span>
                  ) : (
                    <><CheckCircle2 size={14} /> Approuver</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}