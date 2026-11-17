import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readStored } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id }, include: { order: { select: { userId: true, status: true } } } });
  const isAdmin = user.role === "ADMIN";
  const isOwner = doc?.order.userId === user.id && (doc.kind === "CUSTOMER" || doc.order.status === "COMPLETED");
  // 404 también cuando no hay permiso: no se revela si el documento existe.
  if (!doc || !(isAdmin || isOwner)) return new NextResponse("Not found", { status: 404 });

  const data = await readStored(doc.storedName).catch(() => null);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
