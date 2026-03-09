/**
 * exportUtils.js — Export leads as CSV or Excel (.xlsx)
 * Pure browser-side, no external deps for CSV.
 * Excel uses SheetJS if available, falls back to CSV.
 */

import { STATUS_CFG, SOURCE_CFG } from '../config/leadsConfig';

// ── Column definitions ─────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'firstName',  label: 'Prénom' },
  { key: 'lastName',   label: 'Nom' },
  { key: 'email',      label: 'Email' },
  { key: 'phone',      label: 'Téléphone' },
  { key: 'city',       label: 'Ville' },
  { key: 'country',    label: 'Pays' },
  { key: 'status',     label: 'Statut' },
  { key: 'source',     label: 'Source' },
  { key: 'assignedTo', label: 'Assigné à' },
  { key: 'notes',      label: 'Nombre de notes' },
  { key: 'createdAt',  label: 'Date de création' },
  { key: 'updatedAt',  label: 'Dernière modification' },
];

// ── Row normalizer ─────────────────────────────────────────────────────────
function normalizeRow(lead) {
  return {
    firstName:  lead.firstName  || '',
    lastName:   lead.lastName   || '',
    email:      lead.email      || '',
    phone:      lead.phone      || '',
    city:       lead.city       || '',
    country:    lead.country    || '',
    status:     STATUS_CFG[lead.status]?.label || lead.status || '',
    source:     SOURCE_CFG[lead.source]?.label || lead.source || '',
    assignedTo: lead.assignedTo
      ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim()
      : 'Non assigné',
    notes:      lead.notes?.length ?? 0,
    createdAt:  lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : '',
    updatedAt:  lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('fr-FR') : '',
  };
}

// ── Trigger a browser download ─────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Escape CSV cell ────────────────────────────────────────────────────────
function escapeCSV(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Export CSV ─────────────────────────────────────────────────────────────
export function exportCSV(leads, filename = 'leads') {
  const rows  = leads.map(normalizeRow);
  const header = COLUMNS.map((c) => escapeCSV(c.label)).join(',');
  const body   = rows.map((row) =>
    COLUMNS.map((c) => escapeCSV(row[c.key])).join(',')
  ).join('\n');

  const bom  = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}_${dateSuffix()}.csv`);
}

// ── Export Excel (XLSX via SheetJS CDN if available, else CSV fallback) ────
export async function exportExcel(leads, filename = 'leads') {
  const rows = leads.map(normalizeRow);
  const data = [
    COLUMNS.map((c) => c.label),
    ...rows.map((row) => COLUMNS.map((c) => row[c.key])),
  ];

  // Try to load SheetJS dynamically
  try {
    // SheetJS is available via CDN in artifact env or can be imported
    let XLSX;
    try {
      XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    } catch {
      // Fallback: try global XLSX (if loaded via script tag)
      XLSX = window.XLSX;
    }

    if (XLSX) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Column widths
      ws['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(c.label.length + 2, 16) }));

      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `${filename}_${dateSuffix()}.xlsx`);
      return;
    }
  } catch (err) {
    console.warn('SheetJS not available, falling back to CSV', err);
  }

  // Fallback to CSV
  exportCSV(leads, filename);
}

function dateSuffix() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
