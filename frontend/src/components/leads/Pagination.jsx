export default function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;

  const items = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      items.push(i);
    } else if (items[items.length - 1] !== "…") {
      items.push("…");
    }
  }

  return (
    <div className="pagination">
      <button className="btn-cancel btn-cancel--nav" disabled={page === 1} onClick={() => onPage(page - 1)}>
        ← Prev
      </button>

      {items.map((item, i) =>
        item === "…" ? (
          <span key={i} className="pagination__ellipsis">…</span>
        ) : (
          <button
            key={item}
            className={`pagination__page-btn${item === page ? " pagination__page-btn--active" : ""}`}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        )
      )}

      <button className="btn-cancel btn-cancel--nav" disabled={page === pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>

      <span className="pagination__total">{total} total</span>
    </div>
  );
}