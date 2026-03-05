import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bell, LogOut, X, ChevronRight,
  Mail, Shield, User, Menu, Check,
  Calendar, Phone, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAV, ROLE_THEME } from '../config/roleConfig';
import './DashboardLayout.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const initials = (u) =>
  u ? `${(u.firstName ?? '')[0] ?? ''}${(u.lastName ?? '')[0] ?? ''}`.toUpperCase() : '?';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const cssVars = (t) => ({
  '--role-gradient':     t.gradient,
  '--role-accent':       t.accent,
  '--role-light':        t.light,
  '--role-badge':        t.badge,
  '--role-shadow':       t.shadow ?? 'rgba(99,102,241,0.3)',
  '--role-accent-faint': t.accent + '44',
});

// ─── Mock notifications ───────────────────────────────────────────────────────
const MOCK_NOTIFS = [
  { id: 1, title: 'Nouveau prospect assigné',        sub: 'il y a 3 min',  read: false },
  { id: 2, title: 'Rapport mensuel disponible',       sub: 'il y a 40 min', read: false },
  { id: 3, title: 'Objectif mensuel atteint à 90 %', sub: 'Hier, 17h30',   read: true  },
  { id: 4, title: 'Mise à jour système effectuée',   sub: 'Hier, 09h00',   read: true  },
];

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS DROPDOWN
// ════════════════════════════════════════════════════════════════════════════
function NotifDropdown({ notifs, onMarkAll }) {
  return (
    <div className="notif-dropdown">
      <div className="notif-header">
        <div className="notif-title-row">
          <p className="notif-title">Notifications</p>
          <span className="notif-count">{notifs.filter(n => !n.read).length}</span>
        </div>
        <button className="notif-mark-all" onClick={onMarkAll}>
          <Check size={12} /> Tout lire
        </button>
      </div>
      {notifs.map((n) => (
        <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
          <div className="notif-dot-indicator" style={{ background: n.read ? '#e2e8f0' : '#6366f1' }} />
          <div>
            <p className={`notif-item-title${n.read ? '' : ' bold'}`}>{n.title}</p>
            <p className="notif-item-time">{n.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE MODAL  (quick view from avatar chip)
// ════════════════════════════════════════════════════════════════════════════
function ProfileModal({ user, theme, onClose, onNavigateToProfile }) {
  return (
    <div className="modal-backdrop" onClick={onClose} style={cssVars(theme)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Gradient header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
          <div className="modal-avatar-row">
            <div className="modal-avatar">
              {user.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                : initials(user)}
            </div>
            <div>
              <p className="modal-user-name">{user.firstName} {user.lastName}</p>
              <span className="modal-role-chip">
                <span className="modal-role-chip-dot" />
                {theme.label}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="modal-body">
          <p className="modal-section-label">Informations du compte</p>
          {[
            { icon: <User size={14} />,     label: 'Nom complet',  value: `${user.firstName} ${user.lastName}` },
            { icon: <Mail size={14} />,     label: 'Email',         value: user.email },
            { icon: <Phone size={14} />,    label: 'Téléphone',     value: user.phone || '—' },
            { icon: <Shield size={14} />,   label: 'Rôle',          value: theme.label, highlight: true },
            { icon: <Calendar size={14} />, label: 'Membre depuis', value: formatDate(user.createdAt) },
          ].map(({ icon, label, value, highlight }) => (
            <div className="modal-info-row" key={label}>
              <div className="modal-info-icon">{icon}</div>
              <div className="modal-info-content">
                <p className="modal-info-label">{label}</p>
                <p className={`modal-info-value${highlight ? ' modal-info-value--highlight' : ''}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — navigate to full profile page */}
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>Fermer</button>
          <button className="modal-btn-primary" onClick={onNavigateToProfile}>
            <ExternalLink size={14} /> Modifier le profil
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NAV LINK
// ════════════════════════════════════════════════════════════════════════════
function NavLink({ item, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.path);
  const Icon     = item.icon;
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`nav-link${isActive ? ' active' : ''}`}
    >
      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} style={{ flexShrink: 0 }} />
      <span className="label">{item.label}</span>
      {isActive && <span className="nav-link-dot" />}
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [showNotif,  setShowNotif]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs,     setNotifs]     = useState(MOCK_NOTIFS);

  const notifRef = useRef(null);

  const role  = user?.role ?? 'salesman';
  const theme = ROLE_THEME[role] ?? ROLE_THEME.salesman;
  const nav   = ROLE_NAV[role]   ?? ROLE_NAV.salesman;

  const unreadCount  = notifs.filter((n) => !n.read).length;
  const currentLabel = nav.find((n) => location.pathname.startsWith(n.path))?.label ?? 'Profil';

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const handleNavigateToProfile = () => {
    setShowModal(false);
    navigate(`/${role.replace('_', '-')}/profile`);
  };

  const sidebarClass = [
    'sidebar',
    collapsed  ? 'collapsed'   : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="app-shell" style={cssVars(theme)}>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* ════════ SIDEBAR ════════ */}
      <aside className={sidebarClass}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">C</div>
          <div className="sidebar-logo-text">
            <h2>CRM Pro</h2>
            <span>Sales Platform</span>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .25s' }} />
          </button>
        </div>

        <div className="role-badge">
          <p className="role-badge-label">Rôle actuel</p>
          <div className="role-badge-value">
            <span className="role-dot" />
            <span>{theme.label}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => <NavLink key={item.path} item={item} collapsed={collapsed} />)}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-btn Profil"
            title={collapsed ? 'Profil' : undefined}
            onClick={handleNavigateToProfile}
          >
            <User size={16} strokeWidth={1.7} style={{ flexShrink: 0 }} />
            <span>Mon Profil</span>
          </button>
          <button
            className="sidebar-btn logout"
            title={collapsed ? 'Déconnexion' : undefined}
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={1.7} style={{ flexShrink: 0 }} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-hamburger" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="topbar-app-name">CRM Pro</span>
            <ChevronRight className="topbar-chevron" size={13} />
            <span className="topbar-page-title">{currentLabel}</span>
          </div>

          <div className="topbar-right">
            <div className="notif-wrapper" ref={notifRef}>
              <button className="notif-btn" onClick={() => setShowNotif(!showNotif)}>
                <Bell size={17} strokeWidth={1.8} />
                {unreadCount > 0 && <span className="notif-badge" />}
              </button>
              {showNotif && (
                <NotifDropdown
                  notifs={notifs}
                  onMarkAll={() => setNotifs((n) => n.map((x) => ({ ...x, read: true })))}
                />
              )}
            </div>

            <div className="topbar-divider" />

            {/* Avatar chip → opens quick modal */}
            <button className="avatar-chip" onClick={() => setShowModal(true)}>
              <div className="avatar-circle">
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                  : initials(user)}
              </div>
              <div className="avatar-info">
                <p className="avatar-name">{user?.firstName} {user?.lastName}</p>
                <p className="avatar-role">{theme.label}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      {/* Quick profile modal */}
      {showModal && user && (
        <ProfileModal
          user={user}
          theme={theme}
          onClose={() => setShowModal(false)}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
    </div>
  );
}