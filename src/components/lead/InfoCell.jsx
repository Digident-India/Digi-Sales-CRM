/**
 * Label + value cell on an inquiry card.
 *
 * Used by: components/lead/InquiryCard.jsx
 */

export function InfoCell({ label, value }) {
  return (
    <div>
      <div className="inq-info-lbl">{label}</div>
      <div className={`inq-info-val${value ? "" : " empty"}`}>{value || "Not provided"}</div>
    </div>
  );
}
