# Lucahome Storefront — Plugin de WordPress

Portada moderna de Lucahome (hero 3D, fichas de producto, SEO con JSON-LD) conectada
al catálogo y carrito de **WooCommerce** mediante la **Store API** (`wc/store/v1`).

## ¿Encaja con nuestro flujo PrestaShop → WooCommerce?

Sí, sin tocar nada de ese flujo. El módulo conector de PrestaShop sincroniza
productos, precios y stock **dentro de WooCommerce**, y este frontend **lee
siempre de WooCommerce**. Da igual que el dato naciera en PrestaShop:

```
PrestaShop (catálogo maestro)
      │  módulo conector (sincronización)
      ▼
WooCommerce (productos, precios, stock, carrito, checkout)
      │  Store API  /wp-json/wc/store/v1
      ▼
Lucahome Storefront (este frontend)
```

El checkout, los pedidos, los gastos de envío y los cupones siguen siendo 100%
WooCommerce: este plugin solo sustituye el escaparate.

## Instalación

1. Sube la carpeta `lucahome-storefront` a `wp-content/plugins/` (o instala el ZIP
   desde *Plugins → Añadir nuevo → Subir plugin*).
2. Activa **Lucahome Storefront**.
3. Crea una página (p. ej. "Inicio Lucahome") y en *Plantilla* elige
   **Lucahome Storefront**. Publica.
4. (Opcional) En *Ajustes → Lectura*, marca esa página como página de inicio.

Al abrir la página, el plugin inyecta automáticamente:

```js
window.LUCAHOME_CONFIG = {
  wooUrl, restUrl, checkoutUrl, cartUrl,
  storeApiNonce   // nonce 'wc_store_api' para mutar el carrito por REST
};
```

## Qué hace el frontend en modo conectado

- **Catálogo**: carga hasta 24 productos de `/products` (popularidad desc.) con
  nombre, slug, fotos reales, precio/oferta, valoración media, nº de reseñas,
  atributos (→ características) y descripciones corta/larga.
- **Categorías**: regenera los filtros a partir de las categorías reales de Woo
  (mapeando felpudos/alfombras/césped/cortinas/accesorios y añadiendo las demás).
- **Ficha de producto**: permalink interno `#/producto/{slug-de-woo}`; canonical,
  Open Graph y JSON-LD `Product` apuntan al **permalink real de WooCommerce**.
- **Variaciones**: en productos variables consulta las variaciones y pinta el
  selector de tamaños con su precio (si la Store API no expone el detalle de una
  variación, usa el precio del padre y conserva el `variation_id` correcto).
- **Carrito**: la UI local responde al instante y cada "añadir" se replica en la
  sesión de WooCommerce vía `POST /cart/add-item` (con rotación de nonce). El
  botón *Tramitar pedido* redirige al checkout real de Woo con el carrito ya cargado.
- **Reseñas**: si el producto tiene reseñas en Woo (`/products/reviews`), se
  muestran las reales; si no, las de demostración.
- **Fallback**: si la API no responde, la portada sigue funcionando en modo demo
  y avisa con un toast.

## Requisitos y notas

- WooCommerce ≥ 7 (Store API estable). Las reseñas deben estar activadas en
  *WooCommerce → Ajustes → Productos* para verlas en la ficha.
- El frontend debe servirse **desde el mismo dominio** que WooCommerce (este
  plugin ya lo garantiza). Si algún día lo sirves desde otro dominio (headless),
  necesitarás CORS + un manejo de Cart-Token en lugar de cookies/nonce.
- SEO: títulos, metas, canonical y JSON-LD se actualizan por producto. Para una
  indexación perfecta de las fichas conviene mantener también las URLs nativas
  de producto de Woo (este front ya las usa como canonical), y el sitemap lo
  sigue generando WordPress/Yoast/RankMath como hasta ahora.

## Swatches de variaciones (Variation Swatches)

El plugin registra `GET /wp-json/lucahome/v1/variations/{id}`, que devuelve las
variaciones con los mismos datos que usa la ficha clásica de Woo (precio, foto,
stock y atributos) **más los swatches de color/imagen** que vuestro plugin de
Variation Swatches guarda en los términos (cubrimos los metas de GetWooPlugins,
CartFlows y la imagen de término estándar). El frontend pinta un selector por
atributo (Color, Tamaño, Patrón…): bolita de color o mini-imagen + etiqueta, y
al elegir, cambian el precio y la foto de la galería. Si el meta de vuestro
plugin concreto no está en la lista, se añade en 2 líneas en
`includes/rest-variations.php` (funciones `lucahome_sf_term_color/image`).

## Personalización (Advanced Product Fields)

El plugin registra un endpoint propio:

```
GET /wp-json/lucahome/v1/personalization/{product_id}
```

que lee la configuración de WAPF del producto (meta `_wapf_fieldgroup` o grupos
globales `wapf` asignados a ese producto) y la devuelve normalizada. El frontend
pinta entonces el bloque "Personalízalo a tu gusto" en la ficha:

- **Campos de imagen** → bolitas con las imágenes predefinidas reales de vuestra
  web (razas de perro/gato, zapatillas… de 1 a 5 puntos de imagen según el
  producto), con su suplemento de precio si lo tienen.
- **Campos de texto** → inputs con su límite de caracteres (hasta 3 o más puntos
  de texto, como en los felpudos de animales).
- **Vista previa en vivo** sobre la foto base del felpudo: textos arriba/abajo
  e imágenes elegidas en el centro. Es una previsualización aproximada (las
  posiciones exactas las define vuestro plugin de preview); suficiente para que
  el cliente vea qué está componiendo.
- **Añadir al carrito**: los productos personalizados se añaden por la vía
  clásica (`?add-to-cart=` con los campos `wapf[field_x]`), de modo que
  **Advanced Product Fields valida, guarda y cobra** los campos exactamente
  igual que en la web actual. El precio final con suplementos lo calcula Woo
  y se ve en el carrito/checkout reales.

**Nota honesta**: WAPF cambia ligeramente su estructura interna entre versiones.
El endpoint está escrito de forma defensiva (cubre meta por producto y grupos
globales con condición de producto), pero si algún felpudo personalizable no
muestra sus campos, abre en el navegador
`/wp-json/lucahome/v1/personalization/ID` y mándanos el JSON: el ajuste es
cambiar 4 líneas en `includes/rest-personalization.php`
(función `lucahome_sf_normalize_field`).

## Páginas de categoría con SEO

Las pestañas de navegación llevan a páginas de categoría propias
(`#/categoria/{slug}`) con H1, **el texto SEO que tengáis escrito en la
descripción de la categoría** (Productos → Categorías en el admin, donde Yoast
ya trabaja), rejilla de productos, breadcrumb y JSON-LD `CollectionPage` +
`ItemList`. El canonical apunta a la URL real de la categoría en WooCommerce.

## Blog · "El rincón del hogar"

La home incluye una sección de artículos que muestra **las 3 últimas entradas
reales de WordPress** (título, imagen destacada, extracto y fecha), enlazando a
sus URLs nativas. Esta es la forma óptima de hacer SEO de contenido: publicáis
entradas normales desde el admin (con Yoast, sitemap e indexación de siempre) y
la portada las luce automáticamente. El enlace "Ver todos" apunta a vuestra
página de blog.

## Compatibilidad con plugins de rendimiento, imágenes y Yoast

- **Caché (WP Rocket, LiteSpeed, W3TC…)**: la página puede cachearse sin miedo;
  al cargar, el frontend pide un nonce fresco a la Store API, así el carrito
  funciona aunque la copia cacheada tenga horas. Recomendado igualmente excluir
  la URL de la *minificación/combinación* de JS (la app ya viene en un único
  archivo optimizado).
- **Imágenes (WebP/AVIF, Smush, Imagify, CDN…)**: el frontend usa las URLs de
  la mediateca (miniatura ligera en tarjetas, tamaño completo en galería), así
  que las conversiones a WebP/AVIF por servidor o CDN se aplican igual que en
  el resto de la web.
- **Yoast SEO**: si la página que usa la plantilla tiene título/descripción
  definidos en Yoast, el frontend los respeta como SEO por defecto; el canonical
  es la URL real de la página. El resto del sitio (productos, categorías, blog,
  sitemap) sigue siendo 100% Yoast como hasta ahora.

## Alternativas de integración (si no quieres el plugin)

1. **Solo el archivo HTML**: sube `app.html` a cualquier hosting y define a mano
   `window.LUCAHOME_CONFIG` con la URL de tu WooCommerce. Requiere CORS si el
   dominio es distinto.
2. **Como tema/plantilla**: el HTML puede trocearse en un tema hijo (header.php,
   front-page.php...) si en el futuro queréis que todo el sitio use este diseño,
   no solo la portada.
3. **Directo contra PrestaShop**: técnicamente posible vía su Webservice API,
   pero perderíais el carrito/checkout de Woo y duplicaríais lógica; no lo
   recomendamos mientras WooCommerce sea la tienda que ve el cliente.
