import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_FILES_PER_ORDER, MAX_FILE_BYTES, cleanFilename, saveFile, sniff } from "@/lib/storage";
import { audit } from "@/lib/audit";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Protección CSRF: solo se aceptan peticiones del mismo origen.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return fail("forbidden", 403);

  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", 401);
  if (!(await rateLimit(`upload:${user.id}`, 80, 3600))) return fail("errLimit", 429);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 64 * 1024) return fail("errFile", 413);

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "RECEIPT" ? "RECEIPT" : "CUSTOMER";
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) return fail("errFile", 400);

  const order =
    kind === "RECEIPT"
      ? user.role === "ADMIN"
        ? await db.order.findFirst({ where: { id, status: { in: ["IN_REVIEW", "COMPLETED"] } } })
        : null
      : await db.order.findFirst({ where: { id, userId: user.id, status: "PAID" } });
  if (!order) return fail("forbidden", 403);

  const count = await db.document.count({ where: { orderId: id, kind } });
  if (count >= MAX_FILES_PER_ORDER) return fail("errLimit", 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || (kind === "RECEIPT" && type.mime !== "application/pdf")) return fail("errFile", 400);

  const storedName = await saveFile(buf, type.ext);
  const doc = await db.document.create({
    data: { orderId: id, kind, filename: cleanFilename(file.name), storedName, mime: type.mime, size: buf.length },
  });
  if (kind === "RECEIPT") await audit(user.email, "order.receipt.upload", order.reference);
  return NextResponse.json({ id: doc.id });
}
