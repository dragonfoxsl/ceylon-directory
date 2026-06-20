const styles: Record<string, string> = {
  pending: "chip-pending",
  approved: "chip-approved",
  rejected: "chip-rejected",
};

const labels: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`chip ${styles[status] ?? "chip-pending"}`}>
      {labels[status] ?? status}
    </span>
  );
}
