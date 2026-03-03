// ─── Status & Priority Configuration ─────────────────────────────────────────

export const STATUS_CFG = {
  New:           { label: "New",            color: "#6366f1", light: "#eef2ff", dot: "#818cf8" },
  Contacted:     { label: "Contacted",      color: "#0ea5e9", light: "#e0f2fe", dot: "#38bdf8" },
  Interested:    { label: "Interested",     color: "#10b981", light: "#d1fae5", dot: "#34d399" },
  NotInterested: { label: "Not Interested", color: "#f59e0b", light: "#fef3c7", dot: "#fbbf24" },
  DealClosed:    { label: "Deal Closed",    color: "#059669", light: "#dcfce7", dot: "#059669" },
  Lost:          { label: "Lost",           color: "#ef4444", light: "#fee2e2", dot: "#f87171" },
};

export const SOURCE_CFG = {
  Website:      { label: "Website",       color: "#3b82f6", light: "#dbeafe", icon: "🌐" },
  Referral:     { label: "Referral",      color: "#10b981", light: "#d1fae5", icon: "👥" },
  Phone:        { label: "Phone",         color: "#06b6d4", light: "#cffafe", icon: "☎️" },
  Email:        { label: "Email",         color: "#8b5cf6", light: "#ede9fe", icon: "📧" },
  'Social Media': { label: "Social Media", color: "#ec4899", light: "#fbcfe8", icon: "📱" },
  Other:        { label: "Other",         color: "#6b7280", light: "#f3f4f6", icon: "➕" },
};

export const KANBAN_COLS = ["New", "Contacted", "Interested", "NotInterested", "DealClosed", "Lost"];

export const PAGE_SIZE = 8;

// CSV column aliases → internal field names
export const CSV_FIELD_MAP = {
  firstname:  "firstName", first_name: "firstName", prenom: "firstName", prénom: "firstName",
  lastname:   "lastName",  last_name:  "lastName",  nom:    "lastName",
  email:      "email",     courriel:   "email",
  phone:      "phone",     telephone:  "phone",     téléphone: "phone", tel: "phone", mobile: "phone",
  city:       "city",      ville:      "city",
  country:    "country",   pays:       "country",
  status:     "status",    statut:     "status",
  source:     "source",    origine:    "source",
};