import "server-only";
import { db } from "./db";

export async function audit(actor: string, action: string, detail?: string) {
  await db.auditLog.create({ data: { actor, action, detail } }).catch(() => {});
}
