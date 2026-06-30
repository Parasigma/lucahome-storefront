<?php
/**
 * Lucahome Storefront · soporte de checkout en panel
 * --------------------------------------------------
 * El checkout real lo hace la Store API de WooCommerce (POST wc/store/v1/checkout)
 * desde el front. Este archivo añade lo que la Store API no da:
 *
 *  - GET  lucahome/v1/payment-methods  → pasarelas activas (id, título, descripción)
 *  - GET  lucahome/v1/order/{id}?key=  → estado del pedido (validado por order_key)
 *  - Marca los pedidos creados desde el escaparate (_lucahome_src = 1).
 *  - Tras pagar en la pasarela (Redsys/PayPal), devuelve al cliente a la página
 *    del escaparate con ?lh_thankyou=ID&key=KEY para mostrar la confirmación
 *    dentro del propio panel (sin salir de la web).
 *
 * El pedido va por los MISMOS canales que cualquier pedido de la web: misma
 * sesión de carrito, mismas pasarelas, mismos emails y estados de WooCommerce.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ------------------------------------------------------------------ *
 *  Endpoints REST
 * ------------------------------------------------------------------ */
add_action( 'rest_api_init', function () {

	register_rest_route( 'lucahome/v1', '/payment-methods', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => 'lucahome_sf_payment_methods',
	) );

	register_rest_route( 'lucahome/v1', '/order/(?P<id>\d+)', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
		'callback'            => 'lucahome_sf_order_status',
	) );
} );

/** Pasarelas de pago activas de WooCommerce. */
function lucahome_sf_payment_methods() {
	$out = array();
	if ( ! function_exists( 'WC' ) || ! WC()->payment_gateways() ) {
		return rest_ensure_response( $out );
	}
	$gateways = WC()->payment_gateways()->get_available_payment_gateways();
	foreach ( $gateways as $gw ) {
		$out[] = array(
			'id'          => $gw->id,
			'title'       => wp_strip_all_tags( $gw->get_title() ),
			'description' => wp_strip_all_tags( $gw->get_description() ),
		);
	}
	return rest_ensure_response( $out );
}

/** Estado de un pedido, validado por su order_key (sin login). */
function lucahome_sf_order_status( WP_REST_Request $req ) {
	$id    = absint( $req['id'] );
	$key   = sanitize_text_field( (string) $req->get_param( 'key' ) );
	$order = $id ? wc_get_order( $id ) : false;

	if ( ! $order || ! $key || ! hash_equals( (string) $order->get_order_key(), $key ) ) {
		return new WP_Error( 'lucahome_order_not_found', 'Pedido no encontrado', array( 'status' => 404 ) );
	}
	return rest_ensure_response( array(
		'ok'     => true,
		'number' => $order->get_order_number(),
		'status' => $order->get_status(),
		'total'  => (float) $order->get_total(),
	) );
}

/* ------------------------------------------------------------------ *
 *  Marcar el origen del pedido (checkout del escaparate)
 * ------------------------------------------------------------------ */

/**
 * El front manda la cabecera HTTP X-Lucahome-Source: storefront en el POST de
 * checkout de la Store API. La leemos en el hook canónico que añade meta al
 * pedido durante el checkout (WooCommerce guarda el pedido tras este hook).
 */
add_action( 'woocommerce_store_api_checkout_update_order_meta', function ( $order ) {
	$src = isset( $_SERVER['HTTP_X_LUCAHOME_SOURCE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_LUCAHOME_SOURCE'] ) ) : '';
	if ( 'storefront' === $src ) {
		$order->update_meta_data( '_lucahome_src', 1 );
	}
}, 10, 1 );

/* ------------------------------------------------------------------ *
 *  Retorno desde la pasarela → de vuelta al escaparate
 * ------------------------------------------------------------------ */

/**
 * Para los pedidos creados desde el escaparate, la URL de retorno
 * (order-received / thank-you) apunta a la página del escaparate con
 * ?lh_thankyou=ID&key=KEY, para que el front muestre la confirmación en el panel.
 * El resto de pedidos de la web no se ven afectados.
 */
add_filter( 'woocommerce_get_return_url', function ( $return_url, $order ) {
	if ( ! $order || ! $order->get_meta( '_lucahome_src' ) ) return $return_url;
	$base = get_option( 'lucahome_storefront_url' );
	if ( ! $base ) return $return_url;
	return add_query_arg( array(
		'lh_thankyou' => $order->get_id(),
		'key'         => $order->get_order_key(),
	), $base );
}, 20, 2 );
