export const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado · sin documentos",
  IN_REVIEW: "En gestión",
  COMPLETED: "Presentado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

/** Tiempo restante hasta el vencimiento del plazo de 24 h, en texto. */
export function remaining(dueAt: Date | null) {
  if (!dueAt) return { text: "—", late: false, urgent: false };
  const ms = dueAt.getTime() - Date.now();
  const h = Math.floor(Math.abs(ms) / 3600_000);
  const m = Math.floor((Math.abs(ms) % 3600_000) / 60_000);
  return { text: ms < 0 ? `Vencido hace ${h} h ${m} min` : `Quedan ${h} h ${m} min`, late: ms < 0, urgent: ms < 6 * 3600_000 };
}
