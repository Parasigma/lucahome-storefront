# Rapid Tax

Web para contratar online la presentación del Impuesto sobre la Renta de No Residentes (Modelo 210):
landing en 6 idiomas, cuentas de usuario, pago con Stripe, subida de documentos y panel de administración.

**Tecnología:** Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Stripe Checkout.

## Arranque en local

```bash
cp .env.example .env          # y revisa los valores
npm install
npm run db:migrate            # crea las tablas
npm run db:seed               # crea el administrador (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev                   # http://localhost:3000
```

Con `PAYMENTS_DEMO="true"` y sin clave de Stripe el pago se simula, para poder probar todo el recorrido.

## Recorrido

1. El cliente ve el precio desglosado, crea su cuenta y paga (Stripe Checkout).
2. En su área privada rellena sus datos, sube los documentos y pulsa **Enviar para gestión**: empieza el plazo de 24 h.
3. En `/admin` el expediente aparece en la cola ordenado por vencimiento. El gestor descarga los documentos,
   sube el justificante en PDF y pulsa **Marcar como presentado**: el cliente lo recibe por correo y en su área.
4. Si no se llega a tiempo, **Reembolsar** devuelve el importe íntegro por Stripe y avisa al cliente.

## Panel de administración (`/admin`)

| Sección | Para qué |
| --- | --- |
| Escritorio | Cola de trabajo, expedientes fuera de plazo, ingresos del mes, actividad |
| Expedientes | Buscar, filtrar, gestionar, completar y reembolsar |
| Usuarios | Listado y concesión de acceso de administrador |
| Contenido | Editar todos los textos de la web en cada idioma |
| Precios | Honorarios, servicio, tasas e IVA |
| Empresa | Datos del pie/legales y estado de Stripe y del correo |

## Puesta en producción

1. **Stripe**: pon `STRIPE_SECRET_KEY`. Crea un webhook hacia `https://TU-DOMINIO/api/stripe/webhook` con los eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `charge.refunded`, y copia su secreto en `STRIPE_WEBHOOK_SECRET`.
   Pon `PAYMENTS_DEMO="false"`.
2. **Correo**: rellena `SMTP_*`, `MAIL_FROM` y `ADMIN_NOTIFY_EMAIL`. Sin SMTP los correos solo se escriben en el registro del servidor.
3. **Dominio**: `APP_URL` con la URL pública (https).
4. **Despliegue**: `POSTGRES_PASSWORD=... docker compose up -d --build` y después `docker compose exec web npx tsx prisma/seed.ts`
   (o cualquier plataforma Node con PostgreSQL). Comprobación de estado en `/api/health`.
5. Revisa los textos legales (Contenido → Textos legales) y los datos de empresa con vuestro asesor: son una plantilla.

## Seguridad

- Contraseñas con bcrypt; sesiones aleatorias guardadas con hash, en cookie `HttpOnly` + `Secure` + `SameSite=Lax`.
- Límite de intentos (login, registro, recuperación, subidas, pagos) guardado en PostgreSQL, válido con varias instancias.
- Validación en servidor de todos los formularios; el importe a cobrar se calcula siempre en servidor.
- Webhook de Stripe con firma verificada e importe contrastado; los datos de tarjeta nunca pasan por la web.
- Documentos fuera de la carpeta pública, tipo comprobado por contenido (PDF/JPG/PNG, 10 MB), descarga solo para el dueño o un administrador.
- Cabeceras CSP, HSTS, `X-Frame-Options`, etc. Registro de auditoría de las acciones del panel.

## Escalado

La aplicación no guarda estado en memoria: se pueden levantar varias instancias tras un balanceador.
Para ello, los documentos deben ir a un volumen compartido o a un bucket privado (ver `src/lib/storage.ts`)
y conviene un pooler de conexiones (PgBouncer) delante de PostgreSQL. Precios y textos se sirven desde caché.

## Estructura

- `src/i18n/*.ts` — textos por idioma (`es` es la referencia).
- `src/app/(site)/[locale]` — web pública y área de cliente · `src/app/admin` — panel · `src/app/api` — subidas, descargas, webhook.
- `src/app/actions` — lógica de servidor · `src/lib` — autenticación, pagos, correo, almacenamiento · `prisma/schema.prisma` — datos.

## Escaparate estático (GitHub Pages)

La rama `gh-pages` contiene una copia estática de la landing en los 6 idiomas, solo para enseñarla:
no tiene registro, pago ni panel. Para regenerarla tras cambiar textos, precios o diseño, con la web arrancada:

```bash
PAGES_URL=https://parasigma.github.io/lucahome-storefront node scripts/build-pages.mjs http://localhost:3000 /lucahome-storefront pages-dist
```

y sube el contenido de `pages-dist` a la rama `gh-pages`.
