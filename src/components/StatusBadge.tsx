const styles: Record<string, string> = {
  PENDING_PAYMENT: "bg-warn/10 text-warn",
  PAID: "bg-ink/8 text-ink",
  IN_REVIEW: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-brand-soft text-brand-dark",
  REFUNDED: "bg-danger/10 text-danger",
  CANCELLED: "bg-ink/8 text-muted",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] ?? ""}`}>{label}</span>;
}
