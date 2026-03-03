import { STATUS_CFG, SOURCE_CFG, CSV_FIELD_MAP } from "../config/leadsConfig";

// ─── Formatting helpers ───────────────────────────────────────────────────────

export const initials  = (l) => `${l.firstName?.[0] || ""}${l.lastName?.[0] || ""}`.toUpperCase();
export const fmtDate   = (d, opts) => d ? new Date(d).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" }) : "—";
export const fmtTime   = (d) => d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
export const fullName  = (u) => u ? `${u.firstName} ${u.lastName}` : "—";
export const av2       = (u) => u ? `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase() : "??";

// ─── Avatar color ─────────────────────────────────────────────────────────────

const ACOLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
];

export const acolor = (id) => {
  let h = 0;
  for (const c of String(id)) h = c.charCodeAt(0) + ((h << 5) - h);
  return ACOLORS[Math.abs(h) % ACOLORS.length];
};

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if ((ch === "," || ch === ";") && !inQ) { cells.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  cells.push(cur.trim());
  return cells;
}

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2)
    throw new Error("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données.");

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => {
    const key = h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_éèêàâùûôîïëæœç]/g, "");
    return CSV_FIELD_MAP[key] || h;
  });

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ""; });
    rows.push(row);
  }
  return { headers, rows };
}

// ─── Row Validation ───────────────────────────────────────────────────────────

export function validateRow(row) {
  const errors = [];
  if (!row.firstName?.trim()) errors.push("Prénom requis");
  if (!row.lastName?.trim())  errors.push("Nom requis");
  if (!row.email?.trim())     errors.push("Email requis");
  if (!row.phone?.trim())     errors.push("Téléphone requis");
  return errors;
}

// ─── Status / Source normalizers ───────────────────────────────────────────

export const normalizeStatus = (val) => Object.keys(STATUS_CFG).find((k) => k.toLowerCase() === (val || "").toLowerCase()) || "New";
export const normalizeSource = (val) => Object.keys(SOURCE_CFG).find((k) => k.toLowerCase() === (val || "").toLowerCase()) || "Other";