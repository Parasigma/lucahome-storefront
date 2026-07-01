<?php
/**
 * Lucahome Storefront · Generador de reseñas realistas
 * -----------------------------------------------------
 * Submenú "Lucahome → Reseñas" en wp-admin: crea, en un clic, un lote de
 * valoraciones de producto (WooCommerce nativo, tabla wp_comments) con
 * nombre, estrellas y texto variados, generados localmente en PHP (sin
 * ninguna API externa ni clave). Se guardan como reseñas normales de
 * WooCommerce: se ven, editan y borran desde Productos → Valoraciones,
 * exactamente igual que una reseña dejada por un cliente real.
 *
 * El texto se compone combinando frases de un banco (apertura + cuerpo con
 * el nombre del producto + cierre) y se le aplican, con baja probabilidad,
 * "imperfecciones" típicas de una persona escribiendo rápido desde el móvil:
 * alguna tilde que falta, una coma de más o de menos, una mayúscula que se
 * escapa… Así el conjunto no luce como una remesa de texto perfecto y
 * uniforme. La distribución de estrellas también es realista (mayoría de
 * 4-5, alguna 3, rara vez menos) en lugar de ser siempre 5 estrellas.
 *
 * AVISO LEGAL: publicar reseñas que no proceden de compradores reales,
 * presentándolas como si lo fueran, puede infringir la normativa de
 * consumidores (transposición española de la Directiva UE 2019/2161 sobre
 * prácticas comerciales desleales / reseñas falsas). Usa esta herramienta
 * bajo tu responsabilidad, por ejemplo para poblar de salida un catálogo
 * nuevo, e ir sustituyéndolas por reseñas reales cuanto antes.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ------------------------------------------------------------------ *
 *  Menú
 * ------------------------------------------------------------------ */
add_action( 'admin_menu', function () {
	add_submenu_page(
		'lucahome-storefront',
		'Reseñas con IA',
		'Reseñas',
		'manage_options',
		'lucahome-reviews',
		'lucahome_sf_render_reviews_admin'
	);
} );

/* ------------------------------------------------------------------ *
 *  Bancos de texto y utilidades de generación
 * ------------------------------------------------------------------ */

/** Nombres realistas "Nombre I." (formato habitual en reseñas online). */
function lucahome_sf_review_names() {
	return array(
		'María G.', 'José Luis R.', 'Carmen P.', 'Antonio M.', 'Lucía F.', 'Manuel S.',
		'Elena V.', 'Francisco T.', 'Rosa A.', 'Javier C.', 'Ana B.', 'Sergio N.',
		'Isabel M.', 'David R.', 'Laura G.', 'Miguel Á.', 'Cristina L.', 'Pedro J.',
		'Raquel D.', 'Álvaro P.', 'Marta S.', 'Rubén H.', 'Nuria T.', 'Óscar V.',
		'Beatriz C.', 'Ignacio F.', 'Silvia R.', 'Carlos M.', 'Patricia N.', 'Diego A.',
		// algunas con nombre y apellido completo, como escriben algunos usuarios
		'Mari Carmen Ruiz', 'Fran Gómez', 'Sole Martínez', 'Juanjo Vidal', 'Encarna Ortiz',
	);
}

/** Frases de apertura, por valoración (5/4/3/2 estrellas). */
function lucahome_sf_review_openers() {
	return array(
		5 => array(
			'Genial, tal cual se ve en la foto.',
			'Muy contenta con la compra.',
			'Superó mis expectativas.',
			'Perfecto, exactamente lo que buscaba.',
			'Un acierto total.',
			'No tengo ninguna pega que ponerle.',
			'Ya es la segunda vez que compro y siempre bien.',
			'Encantada con el resultado.',
		),
		4 => array(
			'Muy bien en general.',
			'Cumple de sobra lo que promete.',
			'Contento con la compra, aunque hay algún detalle mejorable.',
			'Buena relación calidad-precio.',
			'Bastante conforme con el resultado.',
			'En líneas generales, recomendable.',
		),
		3 => array(
			'Está bien, sin más.',
			'Cumple pero esperaba algo más.',
			'Ni fu ni fa, hace su función.',
			'Correcto para el precio que tiene.',
			'No está mal aunque tampoco me ha enamorado.',
		),
		2 => array(
			'No cumplió del todo mis expectativas.',
			'Esperaba algo mejor sinceramente.',
			'Regular, con matices.',
		),
	);
}

/** Cuerpo del comentario: {p} se sustituye por el nombre del producto. */
function lucahome_sf_review_bodies() {
	return array(
		5 => array(
			'El {p} llegó bien embalado y en el plazo indicado.',
			'Se nota la calidad en cuanto lo tienes en las manos.',
			'Lo he colocado y queda tal cual se veía en las fotos de la web.',
			'Llevo ya varias semanas usándolo a diario y aguanta perfectamente.',
			'El material del {p} es más resistente de lo que pensaba por el precio.',
			'Muy fácil de instalar, no hizo falta ayuda de nadie.',
			'Los colores son tal cual la foto, nada que ver con otros que he comprado antes.',
			'Envío rapidísimo, en menos de 24 horas ya lo tenía en casa.',
		),
		4 => array(
			'El {p} llegó en el plazo previsto y bien protegido.',
			'La calidad es buena, un poco justo de tamaño para lo que necesitaba pero cumple.',
			'Se instala fácil aunque el manual podría ser más claro.',
			'Buen producto, el envío tardó un día más de lo esperado.',
			'Cumple lo que anuncia, quizás el precio podría ser un pelín más ajustado.',
		),
		3 => array(
			'El {p} es más pequeño de lo que me esperaba por las fotos.',
			'Tardó unos días más de lo indicado en llegar.',
			'La calidad es aceptable, no es la mejor que he probado tampoco.',
			'Hace su función pero sin nada que lo haga destacar especialmente.',
		),
		2 => array(
			'El {p} no tiene el acabado que esperaba por el precio.',
			'Llegó con el embalaje algo tocado, el producto en sí está bien.',
			'El tamaño real es más ajustado de lo que parecía en la ficha.',
		),
	);
}

/** Frases de cierre, por valoración. */
function lucahome_sf_review_closers() {
	return array(
		5 => array( 'Repetiré seguro.', 'Lo recomiendo sin duda.', 'Volveré a comprar en esta tienda.', 'Un 10.', '' ),
		4 => array( 'Repetiría sin problema.', 'Recomendable.', 'En general, contenta con la compra.', '' ),
		3 => array( 'Para lo que pagué, tampoco puedo quejarme mucho.', 'Ni la recomiendo ni la desaconsejo.', '' ),
		2 => array( 'No sé si repetiría la compra.', 'Esperaba algo más sinceramente.', '' ),
	);
}

/** Quita la tilde de una palabra suelta (simula una errata de tecleo). */
function lucahome_sf_strip_accent( $word ) {
	$map = array(
		'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
		'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
	);
	return strtr( $word, $map );
}

/**
 * Añade pequeñas "imperfecciones" orgánicas a un texto ya construido:
 * alguna tilde que falta, una coma movida, alguna mayúscula perdida.
 * Se aplican con baja probabilidad para que no todas las reseñas se
 * parezcan entre sí ni luzcan "perfectas" de más.
 */
function lucahome_sf_humanize_text( $text ) {
	// 1) Quitar la tilde de una palabra al azar (errata de teclado muy común).
	if ( wp_rand( 1, 100 ) <= 40 ) {
		$words = preg_split( '/(\s+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE );
		$candidates = array();
		foreach ( $words as $i => $w ) {
			if ( preg_match( '/[áéíóúÁÉÍÓÚ]/u', $w ) ) $candidates[] = $i;
		}
		if ( $candidates ) {
			$i = $candidates[ array_rand( $candidates ) ];
			$words[ $i ] = lucahome_sf_strip_accent( $words[ $i ] );
			$text = implode( '', $words );
		}
	}
	// 2) Quitar el punto final (bastante habitual escribiendo desde el móvil).
	if ( wp_rand( 1, 100 ) <= 25 ) {
		$text = rtrim( $text );
		$text = preg_replace( '/\.$/', '', $text );
	}
	// 3) Meter una coma de más antes de "pero"/"y" (error de puntuación típico).
	if ( wp_rand( 1, 100 ) <= 20 ) {
		$text = preg_replace( '/ (pero|y) /u', ', $1 ', $text, 1 );
	}
	// 4) Perder alguna mayúscula tras un punto (rarísimo pero pasa).
	if ( wp_rand( 1, 100 ) <= 12 ) {
		$text = preg_replace_callback( '/\.\s+([A-ZÁÉÍÓÚÑ])/u', function ( $m ) {
			return '. ' . mb_strtolower( $m[1], 'UTF-8' );
		}, $text, 1 );
	}
	return trim( $text );
}

/** Reparto de estrellas según el perfil elegido en el formulario. */
function lucahome_sf_pick_rating( $profile ) {
	$weights = array(
		'realista' => array( 5 => 55, 4 => 30, 3 => 12, 2 => 3 ),
		'positivo' => array( 5 => 75, 4 => 22, 3 => 3 ),
		'mixto'    => array( 5 => 40, 4 => 30, 3 => 20, 2 => 10 ),
	);
	$w = isset( $weights[ $profile ] ) ? $weights[ $profile ] : $weights['realista'];
	$total = array_sum( $w );
	$r = wp_rand( 1, $total );
	$acc = 0;
	foreach ( $w as $stars => $weight ) {
		$acc += $weight;
		if ( $r <= $acc ) return $stars;
	}
	return 5;
}

/** Construye el texto completo de una reseña para un producto y unas estrellas dadas. */
function lucahome_sf_build_review_text( $product_name, $stars ) {
	$openers = lucahome_sf_review_openers();
	$bodies  = lucahome_sf_review_bodies();
	$closers = lucahome_sf_review_closers();

	$o = $openers[ $stars ][ array_rand( $openers[ $stars ] ) ];
	// Algunas reseñas son solo la apertura (gente que escribe muy poco).
	if ( wp_rand( 1, 100 ) <= 20 ) {
		return lucahome_sf_humanize_text( $o );
	}

	$b1 = $bodies[ $stars ][ array_rand( $bodies[ $stars ] ) ];
	$parts = array( $o, str_replace( '{p}', $product_name, $b1 ) );

	// A veces se añade un segundo fragmento del cuerpo (reseña más larga).
	if ( wp_rand( 1, 100 ) <= 45 ) {
		$b2 = $bodies[ $stars ][ array_rand( $bodies[ $stars ] ) ];
		$b2 = str_replace( '{p}', $product_name, $b2 );
		if ( $b2 !== $parts[1] ) $parts[] = $b2;
	}

	$c = $closers[ $stars ][ array_rand( $closers[ $stars ] ) ];
	if ( '' !== $c ) $parts[] = $c;

	return lucahome_sf_humanize_text( implode( ' ', $parts ) );
}

/** Fecha pasada aleatoria (entre hace 3 días y hace 14 meses), realista. */
function lucahome_sf_random_past_date() {
	$days_ago = wp_rand( 3, 420 );
	return gmdate( 'Y-m-d H:i:s', time() - ( $days_ago * DAY_IN_SECONDS ) - wp_rand( 0, 86000 ) );
}

/* ------------------------------------------------------------------ *
 *  Generación real (inserta comentarios de tipo "review" en WooCommerce)
 * ------------------------------------------------------------------ */
function lucahome_sf_generate_reviews( $product_id, $count, $profile ) {
	$product = wc_get_product( $product_id );
	if ( ! $product ) return 0;

	$names = lucahome_sf_review_names();
	shuffle( $names );
	$done = 0;

	for ( $i = 0; $i < $count; $i++ ) {
		$stars = lucahome_sf_pick_rating( $profile );
		$name  = $names[ $i % count( $names ) ];
		$text  = lucahome_sf_build_review_text( $product->get_name(), $stars );
		$slug  = sanitize_title( $name ) . wp_rand( 100, 999 );

		$comment_id = wp_insert_comment( array(
			'comment_post_ID'      => $product_id,
			'comment_author'       => $name,
			'comment_author_email' => $slug . '@ejemplo-clientes.invalid',
			'comment_content'      => $text,
			'comment_type'         => 'review',
			'comment_approved'     => 1,
			'comment_date'         => lucahome_sf_random_past_date(),
		) );

		if ( $comment_id ) {
			add_comment_meta( $comment_id, 'rating', $stars );
			// Marca de origen: permite identificar/filtrar estas reseñas más adelante si hace falta.
			add_comment_meta( $comment_id, '_lucahome_ai_review', 1 );
			$done++;
		}
	}

	if ( $done ) {
		// Recalcula la media y el nº de valoraciones del producto (igual que hace WooCommerce
		// tras una reseña normal), para que se vea correcto en la tienda de inmediato.
		$counts = array();
		$sum    = 0;
		$total  = 0;
		for ( $s = 1; $s <= 5; $s++ ) {
			$c = get_comments( array(
				'post_id' => $product_id,
				'type'    => 'review',
				'status'  => 'approve',
				'count'   => true,
				'meta_query' => array( array( 'key' => 'rating', 'value' => $s ) ),
			) );
			$counts[ $s ] = (int) $c;
			$sum   += $s * $c;
			$total += $c;
		}
		$product->set_rating_counts( $counts );
		$product->set_review_count( $total );
		$product->set_average_rating( $total ? round( $sum / $total, 2 ) : 0 );
		$product->save();
	}

	return $done;
}

/* ------------------------------------------------------------------ *
 *  Guardado (admin-post)
 * ------------------------------------------------------------------ */
add_action( 'admin_post_lucahome_generate_reviews', function () {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( 'No autorizado' );
	check_admin_referer( 'lucahome_generate_reviews' );

	$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
	$count      = isset( $_POST['count'] ) ? absint( $_POST['count'] ) : 5;
	$count      = max( 1, min( 30, $count ) );
	$profile    = isset( $_POST['profile'] ) && in_array( $_POST['profile'], array( 'realista', 'positivo', 'mixto' ), true )
		? $_POST['profile'] : 'realista';

	$done = $product_id ? lucahome_sf_generate_reviews( $product_id, $count, $profile ) : 0;

	wp_safe_redirect( add_query_arg( array(
		'page'      => 'lucahome-reviews',
		'generated' => $done,
	), admin_url( 'admin.php' ) ) );
	exit;
} );

/* ------------------------------------------------------------------ *
 *  Render de la página
 * ------------------------------------------------------------------ */
function lucahome_sf_render_reviews_admin() {
	$products = get_posts( array(
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => 300,
		'orderby'        => 'title',
		'order'          => 'ASC',
	) );
	?>
	<div class="wrap lucahome-admin">
		<h1>Reseñas con IA</h1>
		<?php if ( isset( $_GET['generated'] ) ) :
			$n = absint( $_GET['generated'] ); ?>
			<div class="notice notice-success is-dismissible"><p>
				<?php if ( $n > 0 ) : ?>
					Se han generado <strong><?php echo esc_html( $n ); ?></strong> reseña(s) nueva(s). Puedes revisarlas y editarlas en
					<a href="<?php echo esc_url( admin_url( 'edit.php?post_type=product&page=product_reviews' ) ); ?>">Productos → Valoraciones</a>.
				<?php else : ?>
					No se ha podido generar ninguna reseña. Comprueba que has elegido un producto.
				<?php endif; ?>
			</p></div>
		<?php endif; ?>

		<p>Genera valoraciones realistas para un producto: nombres variados, reparto de estrellas natural (no
			siempre 5★) y texto con alguna pequeña imperfección de tecleo (una tilde que falta, una coma movida…),
			igual que escribiría un cliente real desde el móvil. Se guardan como reseñas normales de WooCommerce:
			puedes editarlas o borrarlas después en <em>Productos → Valoraciones</em>.</p>

		<div class="notice notice-warning inline" style="margin:0 0 20px">
			<p><strong>Aviso:</strong> publicar reseñas que no proceden de compradores reales puede entrar en conflicto
				con la normativa de consumidores sobre reseñas falsas. Úsalo con criterio (por ejemplo, para arrancar un
				catálogo nuevo) y sustitúyelas por reseñas reales en cuanto puedas.</p>
		</div>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lucahome_generate_reviews">
			<?php wp_nonce_field( 'lucahome_generate_reviews' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="lh-product">Producto</label></th>
					<td>
						<select name="product_id" id="lh-product" class="regular-text" required>
							<option value="">— Elige un producto —</option>
							<?php foreach ( $products as $p ) : ?>
								<option value="<?php echo esc_attr( $p->ID ); ?>"><?php echo esc_html( $p->post_title ); ?></option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="lh-count">Cantidad</label></th>
					<td><input type="number" id="lh-count" name="count" min="1" max="30" value="5"> <span class="description">Máximo 30 por lote.</span></td>
				</tr>
				<tr>
					<th scope="row">Reparto de estrellas</th>
					<td>
						<label><input type="radio" name="profile" value="realista" checked> Realista (mayoría 4-5★, alguna 3★)</label><br>
						<label><input type="radio" name="profile" value="positivo"> Muy positivo (casi todo 5★)</label><br>
						<label><input type="radio" name="profile" value="mixto"> Mixto (incluye más 3★ y alguna 2★)</label>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Generar reseñas' ); ?>
		</form>
	</div>
	<?php
}
