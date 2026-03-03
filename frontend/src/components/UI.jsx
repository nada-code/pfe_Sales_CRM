import { useEffect } from "react";
import { STATUS_CFG, SOURCE_CFG } from "../config/leadsConfig";
import { acolor } from "../utils/leadsUtils";

// ─── Avatar ───────────────────────────────────────────────────────────────────
// size / radius / background are dynamic → kept as inline style.

export function Av({ id, label, size = 32, radius = 8 }) {
  return (
    <div
      className="av"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: acolor(id),
        fontSize: Math.round(size * 0.34),
      }}
    >
      {label}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status, lg }) {
  const c = STATUS_CFG[status] || STATUS_CFG.New;
  return (
    <span
      className="status-badge"
      style={{ padding: lg ? "4px 12px" : "3px 8px", fontSize: lg ? 12 : 11, color: c.color, background: c.light }}
    >
      <span className="status-badge__dot" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

// ─── SourceBadge ────────────────────────────────────────────────────────────

export function SourceBadge({ source }) {
  const c = SOURCE_CFG[source] || SOURCE_CFG.Other;
  return (
    <span className="priority-badge" style={{ color: c.color, background: c.light }}>
      {c.icon} {source}
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 20 }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg    = type === "error" ? "#fee2e2" : type === "warning" ? "#fef3c7" : "#dcfce7";
  const color = type === "error" ? "#dc2626" : type === "warning" ? "#d97706" : "#16a34a";

  return (
    <div className="toast" style={{ background: bg, color }}>
      <span>{type === "error" ? "✕" : "✓"}</span>
      <span className="toast__text">{message}</span>
      <button className="toast__close" style={{ color }} onClick={onClose}>✕</button>
    </div>
  );
}