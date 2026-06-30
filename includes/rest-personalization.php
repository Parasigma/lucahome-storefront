<?php
/**
 * Lucahome Storefront · REST de personalización
 * ------------------------------------------------
 * Expone GET /wp-json/lucahome/v1/personalization/{product_id}
 * con los campos de personalización del producto definidos por el
 * plugin "Advanced Product Fields for WooCommerce" (WAPF), en un
 * formato normalizado que entiende el frontend:
 *
 * { "fields": [
 *     { "param": "wapf[field_abc123]", "type": "image"|"text",
 *       "label": "...", "required": true, "maxlength": 30,
 *       "options": [ { "label": "Bulldog", "image": "https://...", "price": 3 } ] }
 * ] }
 *
 * Es deliberadamente defensivo: WAPF guarda su configuración en el
 * meta `_wapf_fieldgroup` del producto (override por producto) o en
 * grupos globales (CPT `wapf`) asignados por condiciones. Cubrimos
 * el caso por producto, que es el habitual en felpudos personalizados,
 * y si la estructura de vuestra versión difiere, basta ajustar
 * lucahome_sf_normalize_field().
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function () {
	register_rest_route( 'lucahome/v1', '/personalization/(?P<id>\d+)', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true', // datos de catálogo públicos
		'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
		'callback'            => 'lucahome_sf_personalization',
	) );
} );

function lucahome_sf_personalization( WP_REST_Request $req ) {
	$product_id = absint( $req['id'] );
	$out        = array( 'fields' => array(), 'source' => 'none' );

	if ( ! $product_id || get_post_type( $product_id ) !== 'product' ) {
		return rest_ensure_response( $out );
	}

	$raw_fields = array();

	// 1) Configuración por producto (lo más común en personalizables).
	$meta = get_post_meta( $product_id, '_wapf_fieldgroup', true );
	if ( is_array( $meta ) && ! empty( $meta['fields'] ) && is_array( $meta['fields'] ) ) {
		$raw_fields = $meta['fields'];
		$out['source'] = 'product_meta';
	}

	// 2) Grupos globales WAPF (CPT 'wapf') que apliquen a este producto.
	//    Solo si no hay override por producto. Cubrimos la condición más
	//    habitual ("productos concretos"); otras condiciones complejas
	//    pueden añadirse aquí si las usáis.
	if ( empty( $raw_fields ) ) {
		$groups = get_posts( array(
			'post_type'      => 'wapf',
			'post_status'    => 'publish',
			'posts_per_page' => 20,
			'fields'         => 'ids',
		) );
		foreach ( $groups as $gid ) {
			$g = get_post_meta( $gid, 'wapf_fields', true );
			$rules = get_post_meta( $gid, 'wapf_rules', true );
			if ( ! is_array( $g ) || empty( $g ) ) continue;
			if ( lucahome_sf_group_applies( $rules, $product_id ) ) {
				$raw_fields = $g;
				$out['source'] = 'group_' . $gid;
				break;
			}
		}
	}

	foreach ( (array) $raw_fields as $f ) {
		$norm = lucahome_sf_normalize_field( $f );
		if ( $norm ) $out['fields'][] = $norm;
	}

	// Imagen base del producto, útil para la vista previa del frontend.
	$thumb = get_the_post_thumbnail_url( $product_id, 'large' );
	if ( $thumb ) $out['image'] = $thumb;

	$res = rest_ensure_response( $out );
	$res->header( 'Cache-Control', 'public, max-age=300' );
	return $res;
}

/**
 * IDs de productos personalizables (con configuración WAPF por producto).
 * El frontend lo usa para mostrar "Personalizar" en la tarjeta sin tener que
 * consultar producto por producto. Una sola consulta indexada por meta_key.
 */
function lucahome_sf_personalizable_ids() {
	global $wpdb;
	$ids = $wpdb->get_col( $wpdb->prepare(
		"SELECT DISTINCT pm.post_id
		   FROM {$wpdb->postmeta} pm
		   INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
		  WHERE pm.meta_key = %s
		    AND p.post_type = 'product'
		    AND p.post_status = 'publish'",
		'_wapf_fieldgroup'
	) );
	return array_values( array_unique( array_map( 'intval', (array) $ids ) ) );
}

/**
 * ¿Aplica un grupo global WAPF a este producto? (condición "products").
 */
function lucahome_sf_group_applies( $rules, $product_id ) {
	if ( ! is_array( $rules ) ) return false;
	$json = wp_json_encode( $rules );
	// Búsqueda tolerante del ID del producto dentro de las condiciones.
	return ( false !== strpos( $json, '"' . $product_id . '"' ) || false !== strpos( $json, ':' . $product_id ) );
}

/**
 * Normaliza un campo WAPF al formato del frontend.
 * Tipos de texto → "text"; tipos con opciones/imágenes → "image".
 */
function lucahome_sf_normalize_field( $f ) {
	if ( ! is_array( $f ) ) return null;

	$id    = isset( $f['id'] ) ? sanitize_key( $f['id'] ) : '';
	$type  = isset( $f['type'] ) ? strtolower( (string) $f['type'] ) : '';
	$label = isset( $f['label'] ) ? wp_strip_all_tags( (string) $f['label'] ) : '';
	if ( ! $id || ! $type ) return null;

	$text_types  = array( 'text', 'textarea', 'true-text' );
	$image_types = array( 'image-swatch', 'images', 'image', 'radio', 'select', 'checkboxes', 'color-swatch' );

	$base = array(
		'param'    => 'wapf[field_' . $id . ']',
		'label'    => $label ?: 'Personalización',
		'required' => ! empty( $f['required'] ),
	);

	if ( in_array( $type, $text_types, true ) ) {
		$base['type']        = 'text';
		$base['maxlength']   = isset( $f['maxlength'] ) ? absint( $f['maxlength'] ) : 40;
		$base['placeholder'] = isset( $f['placeholder'] ) ? wp_strip_all_tags( (string) $f['placeholder'] ) : '';
		return $base;
	}

	if ( in_array( $type, $image_types, true ) ) {
		$choices = array();
		$raw     = array();
		if ( isset( $f['options']['choices'] ) && is_array( $f['options']['choices'] ) ) {
			$raw = $f['options']['choices'];
		} elseif ( isset( $f['choices'] ) && is_array( $f['choices'] ) ) {
			$raw = $f['choices'];
		}
		foreach ( $raw as $c ) {
			if ( ! is_array( $c ) ) continue;
			$img = '';
			// WAPF guarda la imagen como ID de adjunto o como URL según versión.
			if ( ! empty( $c['image'] ) ) {
				$img = is_numeric( $c['image'] ) ? (string) wp_get_attachment_image_url( (int) $c['image'], 'medium' ) : esc_url_raw( (string) $c['image'] );
			}
			$choices[] = array(
				'label' => isset( $c['label'] ) ? wp_strip_all_tags( (string) $c['label'] ) : '',
				'image' => $img ?: null,
				'price' => isset( $c['pricing_amount'] ) ? floatval( $c['pricing_amount'] ) : ( isset( $c['price'] ) ? floatval( $c['price'] ) : 0 ),
			);
		}
		if ( ! $choices ) return null;
		// Campo opcional → añadimos la opción "Ninguno" para poder deseleccionar.
		if ( empty( $f['required'] ) ) {
			array_unshift( $choices, array( 'label' => 'Ninguno', 'image' => null, 'price' => 0, 'none' => true ) );
		}
		$base['type']    = 'image';
		$base['options'] = $choices;
		return $base;
	}

	return null; // tipos no soportados (file upload, fecha…) se omiten
}
