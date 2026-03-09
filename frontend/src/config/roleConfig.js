// ─── roleConfig.js  (replace your existing file) ─────────────────────────────
import { LayoutDashboard, Users, ClipboardList, Phone, Calendar, BarChart2, TrendingUp } from 'lucide-react';

export const ROLE_NAV = {
  sales_leader: [
    { label: "Dashboard",        icon: LayoutDashboard, path: "/sales-leader/dashboard"   },
    { label: "Leads Management", icon: Users,           path: "/sales-leader/leads-management"         },
    { label: "Approvals",        icon: ClipboardList,   path: "/sales-leader/approvals"    },
  ],
  cxp: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/cxp/dashboard' },
  ],
  salesman: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/salesman/dashboard' },
    { label: 'My Leads',  icon: Phone,           path: '/salesman/prospects' },
  
  ],
};

export const ROLE_THEME = {
  sales_leader: {
    accent:   '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    light:    '#eef2ff',
    soft:     'rgba(99,102,241,0.10)',
    badge:    '#a5b4fc',
    label:    'Sales Leader',
  },
  cxp: {
    accent:   '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    light:    '#e0f2fe',
    soft:     'rgba(14,165,233,0.10)',
    badge:    '#7dd3fc',
    label:    'CXP',
  },
  salesman: {
    accent:   '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    light:    '#d1fae5',
    soft:     'rgba(16,185,129,0.10)',
    badge:    '#6ee7b7',
    label:    'Salesman',
  },
};

export const ROLE_DEFAULT_ROUTE = {
  sales_leader: '/sales-leader/dashboard',
  cxp:          '/cxp/dashboard',
  salesman:     '/salesman/dashboard',
};
