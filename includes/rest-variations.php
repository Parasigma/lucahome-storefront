<?php
/**
 * Lucahome Storefront · REST de variaciones
 * ------------------------------------------------
 * Expone GET /wp-json/lucahome/v1/variations/{product_id}
 * con los mismos datos que usa la ficha clásica de WooCommerce
 * ($product->get_available_variations()), normalizados para el
 * frontend, incluyendo los metadatos de swatch (color / imagen)
 * que guardan los plugins de "Variation Swatches" en los términos
 * de atributo.
 *
 * Respuesta:
 * {
 *   "attributes": [
 *     { "name": "pa_color", "label": "Color",
 *       "terms": [ { "slug":"verde", "label":"Verde",
 *                    "color":"#3E944F", "image":"https://..." } ] }
 *   ],
 *   "variations": [
 *     { "variation_id": 123, "price": "12.95", "regular_price": "14.95",
 *       "image": "https://...", "in_stock": true,
 *       "attributes": { "pa_color": "verde", "pa_talla": "40x70" } }
 *   ]
 * }
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function () {
	register_rest_route( 'lucahome/v1', '/variations/(?P<id>\d+)', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true', // datos públicos de catálogo
		'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
		'callback'            => 'lucahome_sf_variations',
	) );
} );

function lucahome_sf_variations( WP_REST_Request $req ) {
	$out = array( 'attributes' => array(), 'variations' => array() );

	if ( ! function_exists( 'wc_get_product' ) ) {
		return rest_ensure_response( $out );
	}

	$product = wc_get_product( absint( $req['id'] ) );
	if ( ! $product || ! $product->is_type( 'variable' ) ) {
		return rest_ensure_response( $out );
	}

	/* ---------- Atributos usados en variaciones, con swatches ---------- */
	foreach ( $product->get_variation_attributes() as $attr_name => $options ) {
		$taxonomy = str_replace( 'attribute_', '', $attr_name );
		$is_tax   = taxonomy_exists( $taxonomy );
		$label    = $is_tax ? wc_attribute_label( $taxonomy ) : wc_attribute_label( $attr_name, $product );
		$terms    = array();

		if ( $is_tax ) {
			$term_objs = wc_get_product_terms( $product->get_id(), $taxonomy, array( 'fields' => 'all' ) );
			foreach ( $term_objs as $t ) {
				$terms[] = array(
					'slug'  => $t->slug,
					'label' => $t->name,
					'color' => lucahome_sf_term_color( $t->term_id ),
					'image' => lucahome_sf_term_image( $t->term_id ),
				);
			}
		} else {
			// Atributos personalizados (no taxonomía): solo etiquetas.
			foreach ( (array) $options as $opt ) {
				$terms[] = array( 'slug' => sanitize_title( $opt ), 'label' => $opt, 'color' => null, 'image' => null );
			}
		}

		if ( $terms ) {
			$out['attributes'][] = array(
				'name'  => $is_tax ? $taxonomy : sanitize_title( $attr_name ),
				'label' => $label,
				'terms' => $terms,
			);
		}
	}

	/* ---------- Variaciones disponibles (precio, foto, stock) ---------- */
	foreach ( $product->get_available_variations() as $v ) {
		$attrs = array();
		foreach ( (array) $v['attributes'] as $k => $val ) {
			// attribute_pa_color → pa_color ; valor vacío = "cualquiera"
			$attrs[ str_replace( 'attribute_', '', $k ) ] = (string) $val;
		}
		$out['variations'][] = array(
			'variation_id'  => (int) $v['variation_id'],
			'price'         => isset( $v['display_price'] ) ? (string) $v['display_price'] : '',
			'regular_price' => isset( $v['display_regular_price'] ) ? (string) $v['display_regular_price'] : '',
			'image'         => ! empty( $v['image']['src'] ) ? esc_url_raw( $v['image']['src'] ) : null,
			'in_stock'      => ! empty( $v['is_in_stock'] ),
			'attributes'    => $attrs,
		);
	}

	$res = rest_ensure_response( $out );
	$res->header( 'Cache-Control', 'public, max-age=300' );
	return $res;
}

/**
 * Color de swatch de un término. Los distintos plugins de Variation
 * Swatches guardan el color en metas diferentes; probamos las habituales.
 */
function lucahome_sf_term_color( $term_id ) {
	$keys = array(
		'product_attribute_color',          // Variation Swatches for WooCommerce (GetWooPlugins)
		'color',                            // Variation Swatches by CartFlows / otros
		'pa_color',
		'cfvsw_color',                      // CartFlows Variation Swatches
		'swatches_color',
	);
	foreach ( $keys as $k ) {
		$v = get_term_meta( $term_id, $k, true );
		if ( is_string( $v ) && preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', trim( $v ) ) ) {
			return trim( $v );
		}
	}
	return null;
}

/**
 * Imagen de swatch de un término (ID de adjunto o URL según plugin).
 */
function lucahome_sf_term_image( $term_id ) {
	$keys = array(
		'product_attribute_image',          // GetWooPlugins
		'image',
		'cfvsw_image',                      // CartFlows
		'swatches_image',
		'thumbnail_id',                     // imagen de término estándar de Woo
	);
	foreach ( $keys as $k ) {
		$v = get_term_meta( $term_id, $k, true );
		if ( ! $v ) continue;
		if ( is_numeric( $v ) ) {
			$url = wp_get_attachment_image_url( (int) $v, 'thumbnail' );
			if ( $url ) return esc_url_raw( $url );
		} elseif ( is_string( $v ) && false !== strpos( $v, 'http' ) ) {
			return esc_url_raw( $v );
		}
	}
	return null;
}
