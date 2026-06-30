<?php
/**
 * Lucahome Storefront · render.php
 * Sirve assets/app.html inyectando la configuración de WooCommerce
 * (URL de la Store API, nonce de carrito y URL de checkout).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

$app_file = __DIR__ . '/assets/app.html';

if ( ! file_exists( $app_file ) ) {
	wp_die( 'Lucahome Storefront: falta el archivo assets/app.html dentro del plugin.' );
}

$app = file_get_contents( $app_file );

/**
 * Categorías de producto con su enlace real y la descripción
 * (el texto SEO que se edita en Productos → Categorías).
 */
function lucahome_sf_categories() {
	$cats = array();
	$terms = get_terms( array(
		'taxonomy'   => 'product_cat',
		'hide_empty' => true,
		'number'     => 50,
	) );
	if ( is_wp_error( $terms ) ) return $cats;
	foreach ( $terms as $t ) {
		if ( 'uncategorized' === $t->slug || 'sin-categorizar' === $t->slug ) continue;
		$link = get_term_link( $t );
		$cats[] = array(
			'slug'        => $t->slug,
			'name'        => $t->name,
			'description' => wp_kses_post( term_description( $t ) ),
			'link'        => is_wp_error( $link ) ? null : $link,
			'count'       => (int) $t->count,
		);
	}
	return $cats;
}

/** URL de la página de blog (o la home si no hay página de entradas). */
function lucahome_sf_blog_url() {
	$page_for_posts = (int) get_option( 'page_for_posts' );
	return $page_for_posts ? get_permalink( $page_for_posts ) : home_url( '/' );
}

/** Meta de Yoast de la página actual, con las variables básicas resueltas. */
function lucahome_sf_yoast( $key ) {
	$v = get_post_meta( get_the_ID(), $key, true );
	if ( ! is_string( $v ) || '' === trim( $v ) ) return '';
	$v = str_replace(
		array( '%%title%%', '%%sitename%%', '%%sep%%' ),
		array( get_the_title(), get_bloginfo( 'name' ), '·' ),
		$v
	);
	return wp_strip_all_tags( trim( $v ) );
}



$has_woo = class_exists( 'WooCommerce' );

// Guardamos la URL de esta página (escaparate) para que, al volver de la
// pasarela de pago, el cliente regrese aquí y vea la confirmación en el panel.
$current_url = get_permalink();
if ( $current_url && get_option( 'lucahome_storefront_url' ) !== $current_url ) {
	update_option( 'lucahome_storefront_url', esc_url_raw( $current_url ), false );
}

$config = array(
	'wooUrl'        => home_url( '/' ),
	'restUrl'       => esc_url_raw( rest_url( 'wc/store/v1' ) ),
	'checkoutUrl'   => $has_woo && function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : home_url( '/checkout/' ),
	'cartUrl'       => $has_woo && function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/cart/' ),
	// Nonce de la Store API: imprescindible para añadir al carrito por REST con sesión de cookies.
	'storeApiNonce' => wp_create_nonce( 'wc_store_api' ),
	// Endpoints propios del plugin.
	'persoUrl'      => esc_url_raw( rest_url( 'lucahome/v1/personalization/' ) ),
	'variationsUrl' => esc_url_raw( rest_url( 'lucahome/v1/variations/' ) ),
	// Blog nativo de WordPress (entradas con Yoast, sitemap e indexación reales).
	'postsUrl'      => esc_url_raw( rest_url( 'wp/v2/posts' ) ),
	'blogUrl'       => esc_url_raw( lucahome_sf_blog_url() ),
	// URL real de esta página (canonical) y SEO de Yoast si está definido.
	'pageUrl'       => esc_url_raw( get_permalink() ),
	'seoTitle'      => lucahome_sf_yoast( '_yoast_wpseo_title' ),
	'seoDesc'       => lucahome_sf_yoast( '_yoast_wpseo_metadesc' ),
	// Categorías de producto reales: nav, chips y páginas de categoría con su texto SEO.
	'categories'    => lucahome_sf_categories(),
	'siteName'      => get_bloginfo( 'name' ),
	// ID del producto "Felpudo personalizado" (configurador de la portada).
	'customMatProductId' => function_exists( 'lucahome_sf_custom_mat_id' ) ? lucahome_sf_custom_mat_id() : 0,
	// Tema editable desde el panel (carrusel de cabeceras + cinta de textos).
	'theme'              => function_exists( 'lucahome_sf_theme_options' ) ? lucahome_sf_theme_options() : null,
	// URL de la carpeta assets/ del plugin (para imágenes servidas como archivo).
	'assetsUrl'          => plugins_url( 'assets/', __FILE__ ),
	// IDs de productos personalizables (campos WAPF): la tarjeta muestra "Personalizar".
	'persoIds'           => function_exists( 'lucahome_sf_personalizable_ids' ) ? lucahome_sf_personalizable_ids() : array(),
);

// Si WooCommerce no está activo, no inyectamos config: la app queda en modo demo.
$inject = $has_woo
	? '<script>window.LUCAHOME_CONFIG = ' . wp_json_encode( $config ) . ';</script>'
	: '<!-- Lucahome Storefront: WooCommerce inactivo, modo demo -->';

// Inyectamos justo antes de </head> para que esté disponible antes de la lógica de tienda.
$app = str_replace( '</head>', $inject . "\n</head>", $app );

// La app es un documento HTML completo: lo servimos tal cual y cortamos WordPress aquí.
header( 'Content-Type: text/html; charset=utf-8' );
echo $app; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- documento propio del plugin.
exit;
