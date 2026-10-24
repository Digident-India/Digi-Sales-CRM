/**
 * Prev / page x of y / Next control.
 *
 * Used by: pages/InquiriesPage.jsx
 */

// Simple Prev / page-indicator / Next control, shared by desktop + mobile views.
export function PaginationBar({ page, totalPages, totalCount, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="inq-pager">
      <span className="inq-pager-info">
        <span className="inq-pager-page">
          Page {page} of {totalPages}
        </span>
        <span className="inq-pager-total">{totalCount} total</span>
      </span>
      <button className="btn btn-sm inq-pager-prev" disabled={page <= 1} onClick={onPrev}>
        ← Prev
      </button>
      <button className="btn btn-sm inq-pager-next" disabled={page >= totalPages} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}
