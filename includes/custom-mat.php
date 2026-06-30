<?php
/**
 * Lucahome Storefront · Felpudo personalizado → pedido WooCommerce
 * ----------------------------------------------------------------
 * Recibe el diseño del configurador de la portada (texto, tipografía, tamaño,
 * posiciones) y el SVG vectorial generado en el navegador. Lo guarda en la
 * línea del pedido, fija el precio según el tamaño y, al crearse el pedido,
 * envía el/los SVG por email a la dirección de avisos de pedido de WooCommerce
 * para pasarlos a la impresora de felpudos.
 *
 * REQUISITO: un producto WooCommerce que represente el felpudo personalizado.
 * Indica su ID con la opción `lucahome_custom_mat_product`
 * (Ajustes → o vía wp option) o con el filtro `lucahome_sf_custom_mat_id`.
 * Ese ID se inyecta al front como CFG.customMatProductId (ver render.php).
 *
 * El front lo añade por alta clásica (?add-to-cart=) con dos campos POST:
 *   - lucahome_mat      → JSON { size, font, line1, line2, vector }
 *   - lucahome_mat_svg  → el SVG completo (texto vectorizado a <path>)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/** ID del producto "Felpudo personalizado". 0 = no configurado. */
function lucahome_sf_custom_mat_id() {
	$id = (int) get_option( 'lucahome_custom_mat_product', 0 );
	return (int) apply_filters( 'lucahome_sf_custom_mat_id', $id );
}

/** Precio por tamaño (debe coincidir con el configurador del front). */
function lucahome_sf_mat_price( $size ) {
	$map = array( '40x70' => 19.95, '50x80' => 24.95, '60x90' => 29.95, '70x120' => 39.95 );
	$p   = isset( $map[ $size ] ) ? $map[ $size ] : 0;
	return (float) apply_filters( 'lucahome_sf_mat_price', $p, $size );
}

/** Carpeta de uploads donde guardamos los SVG de impresión. */
function lucahome_sf_svg_dir() {
	$up  = wp_upload_dir();
	$dir = trailingslashit( $up['basedir'] ) . 'lucahome-felpudos';
	$url = trailingslashit( $up['baseurl'] ) . 'lucahome-felpudos';
	if ( ! file_exists( $dir ) ) {
		wp_mkdir_p( $dir );
		// Evita el listado del directorio.
		@file_put_contents( trailingslashit( $dir ) . 'index.html', '' );
	}
	return array( 'dir' => $dir, 'url' => $url );
}

/**
 * 1) Capturar el diseño + SVG al añadir al carrito.
 *    El SVG se guarda en un archivo de uploads (la sesión queda ligera) y en
 *    el carrito sólo viajan rutas y datos.
 */
add_filter( 'woocommerce_add_cart_item_data', function ( $cart_item_data, $product_id ) {
	$mat_id = lucahome_sf_custom_mat_id();
	if ( ! $mat_id || (int) $product_id !== $mat_id ) return $cart_item_data;
	if ( empty( $_POST['lucahome_mat'] ) ) return $cart_item_data;

	$design = json_decode( wp_unslash( $_POST['lucahome_mat'] ), true );
	if ( ! is_array( $design ) ) return $cart_item_data;

	$clean = array(
		'size'   => isset( $design['size'] )  ? sanitize_text_field( $design['size'] )  : '',
		'font'   => isset( $design['font'] )  ? sanitize_text_field( $design['font'] )  : '',
		'line1'  => isset( $design['line1'] ) ? sanitize_text_field( $design['line1'] ) : '',
		'line2'  => isset( $design['line2'] ) ? sanitize_text_field( $design['line2'] ) : '',
		'vector' => ! empty( $design['vector'] ),
	);

	// Guardar el SVG en uploads.
	if ( ! empty( $_POST['lucahome_mat_svg'] ) ) {
		$svg = wp_unslash( $_POST['lucahome_mat_svg'] );
		if ( is_string( $svg ) && strpos( ltrim( $svg ), '<svg' ) === 0 ) {
			$paths = lucahome_sf_svg_dir();
			$name  = 'felpudo-' . gmdate( 'Ymd-His' ) . '-' . wp_generate_password( 6, false ) . '.svg';
			$file  = trailingslashit( $paths['dir'] ) . $name;
			if ( false !== file_put_contents( $file, $svg ) ) {
				$clean['svg_path'] = $file;
				$clean['svg_url']  = trailingslashit( $paths['url'] ) . $name;
			}
		}
	}

	$cart_item_data['lucahome_mat'] = $clean;
	// UID único para que cada diseño sea una línea independiente del carrito.
	$cart_item_data['lucahome_mat']['_uid'] = md5( wp_json_encode( $clean ) . microtime() );
	return $cart_item_data;
}, 10, 2 );

/**
 * 2) Precio según el tamaño elegido (lo fija el servidor, no el cliente).
 */
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
	if ( is_admin() && ! defined( 'DOING_AJAX' ) ) return;
	if ( ! $cart || ! is_callable( array( $cart, 'get_cart' ) ) ) return;
	foreach ( $cart->get_cart() as $ci ) {
		if ( empty( $ci['lucahome_mat']['size'] ) ) continue;
		$price = lucahome_sf_mat_price( $ci['lucahome_mat']['size'] );
		if ( $price > 0 && isset( $ci['data'] ) && is_callable( array( $ci['data'], 'set_price' ) ) ) {
			$ci['data']->set_price( $price );
		}
	}
}, 20 );

/**
 * 3) Resumen del diseño visible en carrito y checkout.
 */
add_filter( 'woocommerce_get_item_data', function ( $item_data, $cart_item ) {
	if ( empty( $cart_item['lucahome_mat'] ) ) return $item_data;
	$d   = $cart_item['lucahome_mat'];
	$txt = trim( ( $d['line1'] ?? '' ) . ' ' . ( $d['line2'] ?? '' ) );
	if ( $txt )                    $item_data[] = array( 'name' => 'Texto',      'value' => esc_html( $txt ) );
	if ( ! empty( $d['font'] ) )   $item_data[] = array( 'name' => 'Tipografía', 'value' => esc_html( $d['font'] ) );
	if ( ! empty( $d['size'] ) )   $item_data[] = array( 'name' => 'Tamaño',     'value' => esc_html( str_replace( 'x', ' × ', $d['size'] ) . ' cm' ) );
	return $item_data;
}, 10, 2 );

/**
 * 4) Persistir el diseño en la línea del pedido (visible en el admin del pedido).
 */
add_action( 'woocommerce_checkout_create_order_line_item', function ( $item, $cart_item_key, $values, $order ) {
	if ( empty( $values['lucahome_mat'] ) ) return;
	$d   = $values['lucahome_mat'];
	$txt = trim( ( $d['line1'] ?? '' ) . ' ' . ( $d['line2'] ?? '' ) );
	// Resumen visible para el cliente (es su propio pedido): texto, fuente, tamaño.
	if ( $txt )                       $item->add_meta_data( 'Texto felpudo', $txt, true );
	if ( ! empty( $d['font'] ) )      $item->add_meta_data( 'Tipografía', $d['font'], true );
	if ( ! empty( $d['size'] ) )      $item->add_meta_data( 'Tamaño', str_replace( 'x', ' × ', $d['size'] ) . ' cm', true );
	// SVG de impresión SOLO para el taller: meta oculto (prefijo _), nunca visible
	// al cliente (no aparece en su página de pedido ni en sus emails).
	if ( ! empty( $d['svg_url'] ) )   $item->add_meta_data( '_lucahome_svg_url', esc_url_raw( $d['svg_url'] ), true );
	if ( ! empty( $d['svg_path'] ) )  $item->add_meta_data( '_lucahome_svg_path', $d['svg_path'], true );
}, 10, 4 );

/**
 * 6) Enlace de descarga del SVG SOLO en el admin del pedido (el cliente no lo ve).
 */
add_action( 'woocommerce_after_order_itemmeta', function ( $item_id, $item, $product ) {
	if ( ! is_admin() || ! is_a( $item, 'WC_Order_Item_Product' ) ) return;
	$url = $item->get_meta( '_lucahome_svg_url' );
	if ( $url ) {
		echo '<p style="margin:.4em 0"><strong>SVG impresión (taller):</strong> '
			. '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener" download>Descargar diseño</a></p>';
	}
}, 10, 3 );

/**
 * 5) Al crearse el pedido, enviar los SVG por email a la dirección de avisos
 *    de pedido de WooCommerce (la misma que recibe el "Nuevo pedido").
 */
add_action( 'woocommerce_checkout_order_processed', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) return;

	$attachments = array();
	$resumen     = array();
	foreach ( $order->get_items() as $item ) {
		$path = $item->get_meta( '_lucahome_svg_path' );
		if ( $path && file_exists( $path ) ) {
			$attachments[] = $path;
			$resumen[]     = '• ' . $item->get_name() . ' ×' . $item->get_quantity();
		}
	}
	if ( empty( $attachments ) ) return;

	// Destinatario: el de "Nuevo pedido" de WooCommerce; si no, admin del sitio.
	$settings  = get_option( 'woocommerce_new_order_settings' );
	$recipient = ( is_array( $settings ) && ! empty( $settings['recipient'] ) ) ? $settings['recipient'] : get_option( 'admin_email' );
	$recipient = apply_filters( 'lucahome_sf_mat_email', $recipient, $order );

	$subject = sprintf( '[Felpudo personalizado] Pedido #%s · %d diseño(s) para impresión', $order->get_order_number(), count( $attachments ) );
	$body    = "Nuevo pedido con felpudo(s) personalizado(s) listos para imprimir.\n\n";
	$body   .= 'Pedido: #' . $order->get_order_number() . "\n";
	$body   .= 'Cliente: ' . trim( $order->get_formatted_billing_full_name() ) . "\n\n";
	$body   .= implode( "\n", $resumen ) . "\n\n";
	$body   .= "Adjuntamos el/los SVG vectorial(es) (texto expandido, negro, tamaño real en mm) para la impresora de felpudos.\n";

	wp_mail( $recipient, $subject, $body, array( 'Content-Type: text/plain; charset=UTF-8' ), $attachments );
}, 20 );
