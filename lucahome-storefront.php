<?php
/**
 * Plugin Name:       Lucahome Storefront
 * Plugin URI:        https://www.lucahome.es/
 * Description:       Sirve la portada moderna de Lucahome (3D, fichas de producto, SEO) conectada al catálogo y carrito de WooCommerce mediante la Store API. Compatible con el flujo PrestaShop → WooCommerce: el frontend lee siempre lo que haya sincronizado en Woo. Uso: crea una página y asígnale la plantilla "Lucahome Storefront".
 * Version:           1.4.1
 * Update URI:        https://github.com/Parasigma/lucahome-storefront
 * Author:            Lucahome · Lucatex Ibérica S.L.
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Text Domain:       lucahome-storefront
 */

/*
 * CHANGELOG
 * 1.4.1  Logo: nuevo icono de casita (el de la marca real) en la cabecera, el
 *        pie de página, el favicon y el menú "Lucahome" del panel de
 *        WordPress, en vez del icono genérico de tienda de dashicons.
 * 1.4.0  Artículos: al hacer clic ahora se abre una ficha de lectura completa
 *        dentro del propio escaparate (#/articulo/slug), con su SEO, migas de
 *        pan y JSON-LD BlogPosting, en vez de no llevar a ningún sitio. Nuevo
 *        submenú "Lucahome → Reseñas": genera lotes de valoraciones realistas
 *        para un producto (nombres variados, reparto de estrellas natural y
 *        pequeñas erratas de tecleo), guardadas como reseñas normales de
 *        WooCommerce editables desde Productos → Valoraciones.
 * 1.3.1  Tienda: subcategorías/estilos de felpudos reales (Divertidos, Frikis,
 *        Originales, Personalizados, Mascotas…) que agrupan varios productos;
 *        en live salen de las categorías hijas de WooCommerce. Paginación
 *        numerada en la tienda (en vez del botón "mostrar más" infinito).
 *        Vista rápida: la foto del producto se ve ENTERA (sin recortar).
 * 1.3.0  Auto-actualización: el plugin se conecta a su repositorio de GitHub
 *        (releases) y WordPress muestra "actualización disponible" cuando
 *        publicamos una nueva versión, actualizándose con un clic desde el
 *        panel (sin volver a subir el zip a mano).
 * 1.2.2  Personalización: quitado el marco/borde oscuro de la vista previa
 *        (ahora el felpudo se ve limpio, solo con una sombra suave). Tienda:
 *        nueva fila de subcategorías/estilos (Divertidos, Personalizados,
 *        Frikis…) que aparece bajo la categoría activa; en live se nutre de
 *        las etiquetas de producto de WooCommerce.
 * 1.2.1  Personalización: base SIEMPRE coco liso (sin diseño de muestra) para
 *        "pintar" encima; los diseños se muestran a tamaño FIJO y ya no se
 *        adaptan al texto (huecos reservados, sin auto-encoger texto: solo
 *        límite de caracteres). Detección fiable de productos personalizables
 *        vía IDs inyectados por el plugin (campos WAPF) → la tarjeta muestra
 *        "Personalizar" de verdad en lugar de "Añadir".
 * 1.2.0  Personalización de felpudos: vista previa "en vivo" más grande y
 *        pulida (textos y animales a mayor tamaño, marco showroom, badge "En
 *        vivo", auto-ajuste de textos largos). Los productos personalizables
 *        muestran "Personalizar" en la tarjeta/vista rápida (lleva a la
 *        personalización) en lugar de "Añadir", evitando añadir el felpudo
 *        sin personalizar.
 * 1.1.0  Cabecera: comparador antes/después con fotos reales de terraza
 *        (más grande y protagonista). Tarjetas de categoría con fotos
 *        reales (césped, bambú, cortinas, infantil) en vez de texturas CSS.
 * 1.0.0  Versión inicial: escaparate conectado a WooCommerce (catálogo,
 *        variaciones, personalización, carrito y checkout en panel,
 *        configurador de felpudo, carrusel de cabeceras y panel admin).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'LUCAHOME_SF_TEMPLATE', 'lucahome-storefront.php' );
define( 'LUCAHOME_SF_VERSION', '1.4.1' );

require_once __DIR__ . '/includes/rest-personalization.php';
require_once __DIR__ . '/includes/rest-variations.php';
require_once __DIR__ . '/includes/custom-mat.php';
require_once __DIR__ . '/includes/rest-checkout.php';
require_once __DIR__ . '/includes/admin-dashboard.php';
require_once __DIR__ . '/includes/reviews-ai.php';

/**
 * Auto-actualización desde GitHub (releases).
 * El plugin consulta el repositorio público y, cuando publicamos una release
 * nueva con su zip, WordPress muestra "actualización disponible" en Plugins y
 * permite actualizar con un clic. Repo: Parasigma/lucahome-storefront.
 */
require_once __DIR__ . '/includes/plugin-update-checker/plugin-update-checker.php';
$lucahome_sf_update_checker = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
	'https://github.com/Parasigma/lucahome-storefront/',
	__FILE__,
	'lucahome-storefront'
);
// Usamos el zip adjunto a cada release (estructura de carpeta correcta para WP),
// no el zip de código fuente que genera GitHub automáticamente.
$lucahome_sf_update_checker->getVcsApi()->enableReleaseAssets( '/lucahome-storefront-.*\.zip$/i' );

/**
 * Registra la plantilla de página "Lucahome Storefront"
 * (aparece en el selector de plantillas del editor de páginas).
 */
add_filter( 'theme_page_templates', function ( $templates ) {
	$templates[ LUCAHOME_SF_TEMPLATE ] = __( 'Lucahome Storefront', 'lucahome-storefront' );
	return $templates;
} );

/**
 * Cuando una página usa la plantilla, servimos la app completa.
 */
add_filter( 'template_include', function ( $template ) {
	if ( is_page() && get_page_template_slug() === LUCAHOME_SF_TEMPLATE ) {
		return __DIR__ . '/render.php';
	}
	return $template;
} );

/**
 * Aviso si WooCommerce no está activo.
 */
add_action( 'admin_notices', function () {
	if ( class_exists( 'WooCommerce' ) ) return;
	echo '<div class="notice notice-warning"><p><strong>Lucahome Storefront:</strong> WooCommerce no está activo. La portada funcionará en modo demostración hasta que actives WooCommerce.</p></div>';
} );
