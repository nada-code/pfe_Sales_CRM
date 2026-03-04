import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { ROLE_DEFAULT_ROUTE } from './config/roleConfig';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Toaster } from "react-hot-toast";

// ── Auth pages ──────────────────────────────────────────────────────────────
import Login          from './pages/Authentification/Login';
import Signup         from './pages/Authentification/Signup';
import ForgotPassword from './pages/Authentification/ForgetPassword';
import ResetPassword  from './pages/Authentification/ResetPassword';

// ── Sales Leader pages ───────────────────────────────────────────────────────
import SalesLeaderDashboard  from './pages/sales-leader/Dashboard';
import SalesLeaderTeam       from './pages/sales-leader/leadsManagement';
import SalesLeaderApprovals  from './pages/sales-leader/Approvals';
import LeadDetailPage        from './pages/sales-leader/LeadDetailPage'; 

// ─── CXP pages ─────────────────────────────────────────────────────
import DashbordCxp           from './pages/Cxp/DashbordCxp';
// ─────────────────────────────────────────────────────────────────────────────



// Wrap a page inside DashboardLayout
const W = (Page) => (
  <DashboardLayout>
    
    <Page />
  </DashboardLayout>
);

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DEFAULT_ROUTE[user.role] ?? '/login'} replace />;
}

export default function App() {
  return (
    <>
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public ── */}
          <Route path="/login"                         element={<Login />} />
          <Route path="/signup"                        element={<Signup />} />
          <Route path="/forgot-password"               element={<ForgotPassword />} />
          <Route path="/reset-password/:resetToken"    element={<ResetPassword />} />
          <Route path="/"                              element={<RoleRedirect />} />

          {/* ══════════════════════════════════════════
              SALES LEADER
          ══════════════════════════════════════════ */}
          <Route path="/sales-leader/dashboard"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderDashboard)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/team"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderTeam)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/approvals"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderApprovals)}</ProtectedRoute>}
          />

          {/* ✅ Lead detail page — separate route */}
          <Route path="/sales-leader/leads/:id"
            element={
              <ProtectedRoute allowedRoles={['sales_leader']}>
                {W(LeadDetailPage)}
              </ProtectedRoute>
            }
          />

          {/* ══════════════════════════════════════════
              CXP
          ══════════════════════════════════════════ */}
          <Route path="/cxp/dashboard"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(DashbordCxp)}</ProtectedRoute>}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
 <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop
  closeOnClick
  pauseOnHover
  draggable
  theme="colored"
  toastClassName="custom-toast"
  bodyClassName="custom-toast-body"
/>
 {/* <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
            padding: "12px 16px",
            fontWeight: "500",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          },
          success: {
            style: {
              background: "#4bb543",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: "500",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              duration: 5000,
            },
            icon: "✅",
          },
          error: {
            style: {
              background: "#f00",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: "500",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              duration: 5000,

            },
            icon: "❌",
          },
        }}
      /> */}
</>
  );
}