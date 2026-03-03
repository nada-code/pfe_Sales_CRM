import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_DEFAULT_ROUTE } from "../config/roleConfig";

/**
 * ProtectedRoute
 * ──────────────
 * • Redirige vers /login si non authentifié
 * • Redirige vers le dashboard du rôle réel si le rôle ne correspond pas
 *
 * Usage :
 *   <ProtectedRoute allowedRoles={["sales_leader"]}>
 *     <SalesLeaderDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f0f4f8",
        fontFamily: "'Sora', sans-serif", color: "#64748b", fontSize: 14,
        gap: 12,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2.5px solid #e2e8f0",
          borderTopColor: "#6366f1",
          animation: "spin .8s linear infinite",
        }} />
        Chargement…
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role → send to own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = ROLE_DEFAULT_ROUTE[user.role] ?? "/login";
    return <Navigate to={fallback} replace />;
  }

  return children;
}