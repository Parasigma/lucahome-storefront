import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Crea (o actualiza) el administrador inicial a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10 caracteres).");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    create: { email, name: "Administrador", passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN" },
  });
  console.log(`Administrador listo: ${email}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
