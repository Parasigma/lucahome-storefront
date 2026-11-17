import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

// Almacenamiento en disco fuera de /public. Para varias instancias, monta un volumen
// compartido o sustituye estas tres funciones por un bucket S3/R2 privado.
const dir = () => path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "./storage/uploads");

const file = (name: string) => path.join(/* turbopackIgnore: true */ dir(), name);

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_ORDER = 15;

const signatures: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
];

/** Detecta el tipo real por la cabecera del archivo (no se confía en el nombre ni en el MIME del navegador). */
export function sniff(buf: Buffer) {
  return signatures.find((s) => s.test(buf)) ?? null;
}

export function cleanFilename(name: string) {
  const base = path.basename(name).replace(/[^\p{L}\p{N}._ -]/gu, "_").trim();
  return (base || "documento").slice(0, 120);
}

export async function saveFile(buf: Buffer, ext: string) {
  await mkdir(dir(), { recursive: true });
  const storedName = `${randomBytes(24).toString("hex")}.${ext}`;
  await writeFile(file(storedName), buf, { mode: 0o600 });
  return storedName;
}

export function readStored(storedName: string) {
  if (!/^[a-f0-9]{48}\.(pdf|jpg|png)$/.test(storedName)) throw new Error("invalid name");
  return readFile(file(storedName));
}

export async function deleteStored(storedName: string) {
  if (!/^[a-f0-9]{48}\.(pdf|jpg|png)$/.test(storedName)) return;
  await unlink(file(storedName)).catch(() => {});
}
