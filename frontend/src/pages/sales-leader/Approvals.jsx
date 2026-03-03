import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getUsers, approveUser } from '../../api/authApi';
import '../../styles/ApprovalsStyles.css';

const Approvals = () => {
  const [salesmen, setSalesmen]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [approving, setApproving] = useState(null);

  /* ── Fetch pending salesmen ── */
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers({ role: 'salesman', isApproved: false });
      setSalesmen(response.data ?? []);
    } catch {
      toast.error('Failed to load pending accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  /* ── Approve action ── */
  const handleApprove = async (userId) => {
    setApproving(userId);
    try {
      await approveUser(userId);
      toast.success('Salesman approved successfully');
      setSalesmen((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to approve user';
      toast.error(message);
    } finally {
      setApproving(null);
    }
  };

  /* ── Helpers ── */
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : '-';

  const getInitials = (u) =>
    `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();

  /* ── Render ── */
  return (
    <div className="approvals-page">

      {/* Header */}
      <div className="approvals-header">
        <div>
          <h1 className="approvals-title">Pending Approvals</h1>
          <p className="approvals-subtitle">Review and approve new salesman accounts</p>
        </div>
        <span className="approvals-badge">{salesmen.length} pending</span>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="approvals-centered">
          <div className="approvals-spinner" />
          <p>Loading pending accounts…</p>
        </div>

      ) : salesmen.length === 0 ? (

        /* Empty state */
        <div className="approvals-empty">
          <div className="approvals-empty-icon">✅</div>
          <h3 className="approvals-empty-title">All caught up!</h3>
          <p className="approvals-empty-text">No salesman accounts are waiting for approval.</p>
        </div>

      ) : (

        /* List */
        <div className="approvals-list">
          {salesmen.map((user) => (
            <div key={user._id} className="approvals-card">

              {/* Left: avatar + info */}
              <div className="approvals-card-left">
                <div className="approvals-avatar">{getInitials(user)}</div>
                <div>
                  <p className="approvals-name">{user.firstName} {user.lastName}</p>
                  <p className="approvals-email">{user.email}</p>
                  <p className="approvals-date">Registered on {formatDate(user.createdAt)}</p>
                </div>
              </div>

              {/* Right: badge + approve button */}
              <div className="approvals-card-right">
                <span className="approvals-role-badge">Salesman</span>
                <button
                  className="approvals-btn"
                  onClick={() => handleApprove(user._id)}
                  disabled={approving === user._id}
                >
                  {approving === user._id ? (
                    <span className="approvals-btn-dots">
                      <span /><span /><span />
                    </span>
                  ) : (
                    'Approve'
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Approvals;