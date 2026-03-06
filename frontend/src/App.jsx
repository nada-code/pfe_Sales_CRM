import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { ROLE_DEFAULT_ROUTE } from './config/roleConfig';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ── Auth pages ───────────────────────────────────────────────────────────────
import Login          from './pages/Authentification/Login';
import Signup         from './pages/Authentification/Signup';
import ForgotPassword from './pages/Authentification/ForgetPassword';
import ResetPassword  from './pages/Authentification/ResetPassword';

// ── Sales Leader pages ───────────────────────────────────────────────────────
import SalesLeaderDashboard from './pages/sales-leader/Dashboard';
import SalesLeaderTeam      from './pages/sales-leader/leadsManagement';
import SalesLeaderApprovals from './pages/sales-leader/Approvals';
import LeadDetailPage       from './pages/sales-leader/LeadDetailPage';


// ── Salesman pages ───────────────────────────────────────────────────────────
import MyLeads      from './pages/salesman/MyLeads';
import LeadWorkPage from './pages/salesman/LeadWorkPage';
import SalesmanDashboard from './pages/salesman/SalesmanDashboard';
import Agenda       from './pages/salesman/Agenda';
import PerformanceSalesman  from './pages/salesman/Performance';


// ── CXP pages ────────────────────────────────────────────────────────────────
import DashbordCxp from './pages/Cxp/DashbordCxp';

  import ProfilePage from './pages/Profile/ProfilePage';

const W = (Page) => <DashboardLayout><Page /></DashboardLayout>;

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
          <SocketProvider>
            <Routes>
              {/* ── Public ── */}
              <Route path="/"                           element={<RoleRedirect />} />
              <Route path="/login"                      element={<Login />} />
              <Route path="/signup"                     element={<Signup />} />
              <Route path="/forgot-password"            element={<ForgotPassword />} />
              <Route path="/reset-password/:resetToken" element={<ResetPassword />} />

              {/* ── Sales Leader ── */}
              <Route path="/sales-leader/dashboard"
                element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderDashboard)}</ProtectedRoute>}
              />
              <Route path="/sales-leader/leads-management"
                element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderTeam)}</ProtectedRoute>}
              />
              <Route path="/sales-leader/approvals"
                element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(SalesLeaderApprovals)}</ProtectedRoute>}
              />
              <Route path="/sales-leader/leads/:id"
                element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(LeadDetailPage)}</ProtectedRoute>}
              />
              

              {/* ── Salesman ── */}
              <Route path="/salesman/dashboard" element={<ProtectedRoute allowedRoles={['salesman']}>{W(SalesmanDashboard)}</ProtectedRoute>} />
              <Route path="/salesman/prospects"
                element={<ProtectedRoute allowedRoles={['salesman']}>{W(MyLeads)}</ProtectedRoute>}
              />
              <Route path="/salesman/leads/:id"
                element={<ProtectedRoute allowedRoles={['salesman']}>{W(LeadWorkPage)}</ProtectedRoute>}
              />
              <Route path="/salesman/agenda"
                element={<ProtectedRoute allowedRoles={['salesman']}>{W(Agenda)}</ProtectedRoute>}
              />
              <Route path="/salesman/performance"
                element={<ProtectedRoute allowedRoles={['salesman']}>{W(PerformanceSalesman)}</ProtectedRoute>}
              />

              {/* ── CXP ── */}
              <Route path="/cxp/dashboard"
                element={<ProtectedRoute allowedRoles={['cxp']}>{W(DashbordCxp)}</ProtectedRoute>}
              />

*              {/* ── Profile — all roles ── */}
              <Route path="/sales-leader/profile"
                element={<ProtectedRoute allowedRoles={['sales_leader']}>{W(ProfilePage)}</ProtectedRoute>}
              />
              <Route path="/salesman/profile"
                element={<ProtectedRoute allowedRoles={['salesman']}>{W(ProfilePage)}</ProtectedRoute>}
              />
              <Route path="/cxp/profile"
                element={<ProtectedRoute allowedRoles={['cxp']}>{W(ProfilePage)}</ProtectedRoute>}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}