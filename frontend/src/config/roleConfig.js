import {
  LayoutDashboard,
  Users,
  BarChart3,
  TrendingUp,
  Target,
  ClipboardList,
  CheckSquare,
  FileText,
  Award,
  Phone,
  UserCheck,
  PieChart,
} from "lucide-react";

// ─── Navigation par rôle ────────────────────────────────────────────────────
// Adaptez les `path` selon votre structure de routes React Router

export const ROLE_NAV = {

  sales_leader: [
    { label: "Dashboard",       icon: LayoutDashboard, path: "/sales-leader/dashboard" },
    { label: "Leads Management",      icon: Users,           path: "/sales-leader/team" },
    { label: "Performance",     icon: TrendingUp,      path: "/sales-leader/performance" },
    // { label: "Rapports",        icon: BarChart3,       path: "/sales-leader/reports" },
    // { label: "Objectifs",       icon: Target,          path: "/sales-leader/targets" },
    { label: "Approvals",       icon: ClipboardList,   path: "/sales-leader/approvals" },
  ],

  cxp: [
    { label: "Dashboard",       icon: LayoutDashboard, path: "/cxp/dashboard" },
    { label: "Clients",         icon: UserCheck,       path: "/cxp/clients" },
    { label: "Expériences",     icon: Award,           path: "/cxp/experiences" },
    { label: "Analyses",        icon: PieChart,        path: "/cxp/analytics" },
    { label: "Rapports",        icon: ClipboardList,   path: "/cxp/reports" },
  ],

  salesman: [
    { label: "Dashboard",       icon: LayoutDashboard, path: "/salesman/dashboard" },
    { label: "Mes Prospects",   icon: Phone,           path: "/salesman/prospects" },
    { label: "Mes Ventes",      icon: CheckSquare,     path: "/salesman/sales" },
    { label: "Mes Rapports",    icon: FileText,        path: "/salesman/reports" },
  ],
};

// ─── Thème couleur par rôle ─────────────────────────────────────────────────

export const ROLE_THEME = {

  sales_leader: {
    accent:   "#6366f1",          // indigo
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    light:    "#eef2ff",
    soft:     "rgba(99,102,241,0.10)",
    badge:    "#a5b4fc",
    label:    "Sales Leader",
 },

  cxp: {
    accent:   "#0ea5e9",          // sky blue
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    light:    "#e0f2fe",
    soft:     "rgba(14,165,233,0.10)",
    badge:    "#7dd3fc",
    label:    "CXP"
    },

  salesman: {
    accent:   "#10b981",          // emerald
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    light:    "#d1fae5",
    soft:     "rgba(16,185,129,0.10)",
    badge:    "#6ee7b7",
    label:    "Salesman"
  },
};

// ─── Redirect post-login par rôle ───────────────────────────────────────────

export const ROLE_DEFAULT_ROUTE = {
  sales_leader: "/sales-leader/dashboard",
  cxp:          "/cxp/dashboard",
  salesman:     "/salesman/dashboard",
};