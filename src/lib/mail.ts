import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

type Mail = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  signature?: string;
  rtl?: boolean;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render(m: Mail) {
  const paragraphs = m.body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p)}</p>`)
    .join("");
  const cta = m.cta
    ? `<p style="margin:24px 0"><a href="${esc(m.cta.url)}" style="background:#0b1d3a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${esc(m.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html dir="${m.rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#f4f6f3;font-family:Arial,Helvetica,sans-serif;color:#0b1d3a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="margin-bottom:20px"><img src="${(process.env.APP_URL ?? "").replace(/\/$/, "")}/logo.png" alt="Rapid Tax" width="148" height="32" style="display:block;border:0;font-size:20px;font-weight:800;color:#1d914f"></div>
<div style="background:#fff;border:1px solid #e3e8e4;border-radius:16px;padding:28px">
<p style="margin:0 0 14px;font-weight:600">${esc(m.heading)}</p>${paragraphs}${cta}
<p style="margin:18px 0 0;color:#5b6b7f">${esc(m.signature ?? "Rapid Tax")}</p>
</div></div></body></html>`;
}

let transport: Transporter | null = null;

export async function sendMail(m: Mail) {
  const text = `${m.heading}\n\n${m.body}${m.cta ? `\n\n${m.cta.label}: ${m.cta.url}` : ""}\n\n${m.signature ?? "Rapid Tax"}`;
  if (!process.env.SMTP_HOST) {
    console.log(`\n[correo no enviado: SMTP sin configurar]\nPara: ${m.to}\nAsunto: ${m.subject}\n${text}\n`);
    return;
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    pool: true,
  });
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Rapid Tax <no-reply@localhost>",
      to: m.to,
      subject: m.subject,
      text,
      html: render(m),
      attachments: m.attachments,
    });
  } catch (e) {
    // Un fallo de correo no debe romper el flujo de pago ni de gestión.
    console.error("[mail] error enviando correo", e);
  }
}
