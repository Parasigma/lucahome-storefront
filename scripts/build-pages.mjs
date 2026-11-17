// Genera una copia estática de la landing (6 idiomas + textos legales) para GitHub Pages.
// Uso: con la web arrancada →  node scripts/build-pages.mjs [origen] [base] [salida]
//   origen: http://localhost:3000 · base: /nombre-del-repo · salida: carpeta de destino
// Es solo un escaparate: sin servidor no hay registro, pago ni panel.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [ORIGIN = "http://localhost:3000", BASE = "", OUT = "pages-dist"] = process.argv.slice(2);
const SITE = process.env.PAGES_URL ?? "";
const locales = ["es", "en", "fr", "it", "ru", "ar"];
const legal = ["terms", "privacy", "refunds"];
const notice = {
  es: "Versión de demostración: el registro y el pago no están activos en esta página.",
  en: "Demo version: sign-up and payment are not active on this page.",
  fr: "Version de démonstration : l'inscription et le paiement ne sont pas actifs sur cette page.",
  it: "Versione dimostrativa: registrazione e pagamento non sono attivi in questa pagina.",
  ru: "Демонстрационная версия: регистрация и оплата на этой странице недоступны.",
  ar: "نسخة تجريبية: التسجيل والدفع غير مفعّلين في هذه الصفحة.",
};
const assets = new Set(["/logo.png", "/logo-light.png"]);

const save = async (rel, data) => {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
};

/** Convierte una ruta interna de la web en su equivalente estático. */
function mapUrl(url) {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const [, p, hash = ""] = url.match(/^([^#]*)(#.*)?$/);
  const [pathname] = p.split("?");
  const seg = pathname.split("/").filter(Boolean);
  if (!locales.includes(seg[0])) {
    assets.add(pathname);
    return BASE + pathname;
  }
  if (seg.length === 1) return `${BASE}/${seg[0]}/${hash}`;
  if (seg[1] === "legal" && legal.includes(seg[2])) return `${BASE}/${seg[0]}/legal/${seg[2]}/`;
  return `${BASE}/${seg[0]}/#price`; // registro, acceso y pago no existen en la copia estática
}

function transform(html, locale) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]+(?:as="script"|rel="modulepreload")[^>]*>/g, "")
    .replace(/\b(href|src)="(\/[^"]*)"/g, (_, attr, url) => `${attr}="${mapUrl(url)}"`)
    .replaceAll(ORIGIN, SITE)
    .replace(/(<div class="bg-warn[^"]*">)[\s\S]*?(<\/div>)/, `$1${notice[locale]}$2`)
    .replace("</head>", '<meta name="robots" content="noindex"/></head>')
    .replace(
      "</body>",
      `<script>document.querySelector("header select")?.addEventListener("change",function(e){var r=location.pathname.slice(${JSON.stringify(BASE)}.length).split("/").slice(2).join("/");location.href=${JSON.stringify(BASE)}+"/"+e.target.value+"/"+r});</script></body>`,
    );
}

const get = async (url) => {
  const res = await fetch(ORIGIN + url, { redirect: "manual" });
  if (res.status !== 200) throw new Error(`${url} → ${res.status}`);
  return res;
};

for (const l of locales) {
  for (const page of ["", ...legal.map((s) => `legal/${s}`)]) {
    const html = await (await get(`/${l}${page ? `/${page}` : ""}`)).text();
    if (!html.includes('class="bg-warn')) throw new Error("Falta el aviso de demostración: arranca la web con PAYMENTS_DEMO=true");
    await save(path.join(l, page, "index.html"), transform(html, l));
  }
}

// Hojas de estilo, tipografías e imágenes referenciadas
const done = new Set();
while (assets.size > done.size) {
  for (const a of [...assets].filter((x) => !done.has(x))) {
    done.add(a);
    const res = await get(a);
    if (a.endsWith(".css")) {
      // Las rutas absolutas se prefijan con la base; las relativas (tipografías) se descargan tal cual.
      const css = (await res.text()).replace(/url\((["']?)([^)"']+)\1\)/g, (m, q, u) => {
        if (u.startsWith("data:") || /^https?:/.test(u)) return m;
        if (u.startsWith("/")) {
          assets.add(u);
          return `url(${q}${BASE}${u}${q})`;
        }
        assets.add(path.posix.join(path.posix.dirname(a), u));
        return m;
      });
      await save(a, css);
    } else await save(a, Buffer.from(await res.arrayBuffer()));
  }
}

// Portada: redirige al idioma del navegador
const redirect = `<!doctype html><meta charset="utf-8"><title>Rapid Tax</title><meta name="robots" content="noindex">
<script>var s=${JSON.stringify(locales)},l=(navigator.language||"es").slice(0,2).toLowerCase();location.replace(${JSON.stringify(BASE)}+"/"+(s.indexOf(l)<0?"es":l)+"/")</script>
<noscript><meta http-equiv="refresh" content="0;url=${BASE}/es/"></noscript><a href="${BASE}/es/">Rapid Tax</a>`;
await save("index.html", redirect);
await save("404.html", redirect);
await save(".nojekyll", "");
console.log(`Listo: ${locales.length * (1 + legal.length)} páginas y ${done.size} recursos en ${OUT}`);
