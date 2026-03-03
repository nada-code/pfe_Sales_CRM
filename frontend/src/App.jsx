import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { ROLE_DEFAULT_ROUTE } from './config/roleConfig';

// ── Auth pages ──────────────────────────────────────────────────────────────
import Login        from './pages/Authentification/Login'; 
import Signup       from './pages/Authentification/Signup'; 
import ForgotPassword from './pages/Authentification/ForgetPassword'; 
import ResetPassword  from './pages/Authentification/ResetPassword';  

// ── Sales Leader pages ───────────────────────────────────────────────────────
import SalesLeaderDashboard  from './pages/sales-leader/Dashboard';
import SalesLeaderTeam       from './pages/sales-leader/leadsMangement';
import SalesLeaderApprovals  from './pages/sales-leader/Approvals'; 
// import SalesLeaderPerformance from './pages/sales-leader/Performance';
// import SalesLeaderReports    from './pages/sales-leader/Reports';
// import SalesLeaderTargets    from './pages/sales-leader/Targets';

// ── CXP pages ────────────────────────────────────────────────────────────────
// import CxpDashboard   from './pages/cxp/Dashboard';
// import CxpClients     from './pages/cxp/Clients';
// import CxpExperiences from './pages/cxp/Experiences';
// import CxpAnalytics   from './pages/cxp/Analytics';
// import CxpReports     from './pages/cxp/Reports';

// ── Salesman pages ───────────────────────────────────────────────────────────
// Chaque salesman voit les mêmes composants mais avec ses propres données
// (filtrées côté API via req.user.id)
// import SalesmanDashboard  from './pages/salesman/Dashboard';
// import SalesmanProspects  from './pages/salesman/Prospects';
// import SalesmanSales      from './pages/salesman/Sales';
// import SalesmanReports    from './pages/salesman/Reports';
// ─────────────────────────────────────────────────────────────────────────────

// Helper : wrap a page component inside the shared layout
const W = (Page) => (
  <DashboardLayout>
    <Page />
  </DashboardLayout>
);

// After login, redirect to role dashboard; if not logged in → /login
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DEFAULT_ROUTE[user.role] ?? '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/login"          element={<Login />} />
          <Route path="/signup"         element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:resetToken" element={<ResetPassword />} />

          {/* Root → smart redirect */}
          <Route path="/" element={<RoleRedirect />} />

          {/* ═══════════════════════════════════════════
              SALES LEADER
          ═══════════════════════════════════════════ */}
          <Route path="/sales-leader/dashboard"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderDashboard)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/team"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderTeam)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/approvals"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderApprovals)}</ProtectedRoute>}
          />
          {/* <Route path="/sales-leader/performance"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderPerformance)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/reports"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderReports)}</ProtectedRoute>}
          />
          <Route path="/sales-leader/targets"
            element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderTargets)}</ProtectedRoute>}
          />
          /> */}

          {/* ═══════════════════════════════════════════
              CXP
          ═══════════════════════════════════════════ */}
          {/* <Route path="/cxp/dashboard"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(CxpDashboard)}</ProtectedRoute>}
          />
          <Route path="/cxp/clients"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(CxpClients)}</ProtectedRoute>}
          />
          <Route path="/cxp/experiences"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(CxpExperiences)}</ProtectedRoute>}
          />
          <Route path="/cxp/analytics"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(CxpAnalytics)}</ProtectedRoute>}
          />
          <Route path="/cxp/reports"
            element={<ProtectedRoute allowedRoles={['cxp']}>{W(CxpReports)}</ProtectedRoute>}
          /> */}

          {/* ═══════════════════════════════════════════
              SALESMAN  (chaque salesman = même routes,
              données filtrées via req.user.id en backend)
          ═══════════════════════════════════════════ */}
          {/* <Route path="/salesman/dashboard"
            element={<ProtectedRoute allowedRoles={['salesman']}>{W(SalesmanDashboard)}</ProtectedRoute>}
          />
          <Route path="/salesman/prospects"
            element={<ProtectedRoute allowedRoles={['salesman']}>{W(SalesmanProspects)}</ProtectedRoute>}
          />
          <Route path="/salesman/sales"
            element={<ProtectedRoute allowedRoles={['salesman']}>{W(SalesmanSales)}</ProtectedRoute>}
          />
          <Route path="/salesman/reports"
            element={<ProtectedRoute allowedRoles={['salesman']}>{W(SalesmanReports)}</ProtectedRoute>}
          /> */}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}