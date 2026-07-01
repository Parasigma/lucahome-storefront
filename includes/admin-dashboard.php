<?php
/**
 * Lucahome Storefront · Panel de administración
 * ---------------------------------------------
 * Menú "Lucahome" en el escritorio de WordPress para editar, sin tocar código:
 *   - El CARRUSEL de cabeceras (cabecera 3D + cabeceras adicionales con imagen,
 *     texto y botones; añadir / quitar / reordenar / editar).
 *   - La CINTA de textos en movimiento (ticker).
 *   - Ajustes del carrusel (autoplay e intervalo).
 *
 * Se guarda en la opción `lucahome_theme_options` (array). render.php la inyecta
 * en window.LUCAHOME_CONFIG.theme y el front la usa; si no hay nada guardado,
 * el front muestra sus valores por defecto.
 *
 * Es el primer bloque de un panel ampliable: aquí se irán añadiendo más
 * secciones editables (textos de la web, orden de secciones, etc.).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/** Opciones guardadas (o null si aún no se ha configurado nada). */
function lucahome_sf_theme_options() {
	$o = get_option( 'lucahome_theme_options' );
	return is_array( $o ) && ! empty( $o ) ? $o : null;
}

/** Tags HTML permitidos en títulos/subtítulos de las cabeceras. */
function lucahome_sf_theme_kses() {
	return array(
		'span'   => array( 'class' => true ),
		'br'     => array(),
		'b'      => array(), 'strong' => array(),
		'em'     => array(), 'i' => array(),
	);
}

/* ------------------------------------------------------------------ *
 *  Menú y página
 * ------------------------------------------------------------------ */
add_action( 'admin_menu', function () {
	add_menu_page(
		'Lucahome Storefront',
		'Lucahome',
		'manage_options',
		'lucahome-storefront',
		'lucahome_sf_render_admin',
		'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2MCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTYgMzAgTDI3IDEwIEwyNyA0IEwzNiA0IEwzNiAxMiBMNTggMzAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE0IDI2IFY1NCBINTAgVjI2IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxyZWN0IHg9IjI3IiB5PSIzNiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjUiLz48L3N2Zz4=',
		58
	);
} );

/** Carga el media uploader de WordPress en nuestra página. */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'toplevel_page_lucahome-storefront' === $hook ) {
		wp_enqueue_media();
	}
} );

/* ------------------------------------------------------------------ *
 *  Guardado
 * ------------------------------------------------------------------ */
add_action( 'admin_post_lucahome_save_theme', function () {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( 'No autorizado' );
	check_admin_referer( 'lucahome_save_theme' );

	$kses = lucahome_sf_theme_kses();
	$in   = wp_unslash( $_POST );

	$btn = function ( $raw ) {
		$raw = is_array( $raw ) ? $raw : array();
		$out = array();
		foreach ( $raw as $b ) {
			$label = isset( $b['label'] ) ? sanitize_text_field( $b['label'] ) : '';
			if ( '' === $label ) continue;
			$out[] = array(
				'label' => $label,
				'href'  => isset( $b['href'] ) ? esc_url_raw( $b['href'] ) : '',
				'style' => ( isset( $b['style'] ) && 'ghost' === $b['style'] ) ? 'ghost' : 'primary',
			);
		}
		return $out;
	};

	$opts = array(
		'hero' => array(
			'autoplay' => ! empty( $in['autoplay'] ),
			'interval' => max( 2500, absint( isset( $in['interval'] ) ? $in['interval'] : 6000 ) ),
			'main'     => array(
				'badge'    => isset( $in['main']['badge'] ) ? sanitize_text_field( $in['main']['badge'] ) : '',
				'title'    => isset( $in['main']['title'] ) ? wp_kses( $in['main']['title'], $kses ) : '',
				'subtitle' => isset( $in['main']['subtitle'] ) ? sanitize_textarea_field( $in['main']['subtitle'] ) : '',
				'buttons'  => $btn( isset( $in['main']['buttons'] ) ? $in['main']['buttons'] : array() ),
			),
			'slides'   => array(),
		),
		'ticker' => array(),
	);

	if ( isset( $in['slides'] ) && is_array( $in['slides'] ) ) {
		foreach ( $in['slides'] as $s ) {
			$title = isset( $s['title'] ) ? wp_kses( $s['title'], $kses ) : '';
			$eyebrow = isset( $s['eyebrow'] ) ? sanitize_text_field( $s['eyebrow'] ) : '';
			$kind = isset( $s['kind'] ) && in_array( $s['kind'], array( 'image', 'matshow', 'curtain' ), true ) ? $s['kind'] : 'image';
			if ( '' === $title && '' === $eyebrow && empty( $s['image'] ) && 'image' === $kind ) continue; // fila vacía
			$opts['hero']['slides'][] = array(
				'kind'     => $kind,
				'eyebrow'  => $eyebrow,
				'title'    => $title,
				'subtitle' => isset( $s['subtitle'] ) ? sanitize_textarea_field( $s['subtitle'] ) : '',
				'image'    => isset( $s['image'] ) ? esc_url_raw( $s['image'] ) : '',
				'mediaTag' => isset( $s['mediaTag'] ) ? sanitize_text_field( $s['mediaTag'] ) : '',
				'media'    => ( isset( $s['media'] ) && 'curtains' === $s['media'] ) ? 'curtains' : 'perso',
				'reverse'  => ! empty( $s['reverse'] ),
				'buttons'  => $btn( isset( $s['buttons'] ) ? $s['buttons'] : array() ),
			);
		}
	}

	if ( isset( $in['ticker'] ) ) {
		$lines = preg_split( '/\r\n|\r|\n/', (string) $in['ticker'] );
		foreach ( $lines as $l ) {
			$l = sanitize_text_field( $l );
			if ( '' !== $l ) $opts['ticker'][] = $l;
		}
	}

	update_option( 'lucahome_theme_options', $opts );
	wp_safe_redirect( add_query_arg( array( 'page' => 'lucahome-storefront', 'updated' => '1' ), admin_url( 'admin.php' ) ) );
	exit;
} );

/* ------------------------------------------------------------------ *
 *  Render de la página
 * ------------------------------------------------------------------ */
function lucahome_sf_render_admin() {
	$o      = lucahome_sf_theme_options();
	$hero   = isset( $o['hero'] ) ? $o['hero'] : array();
	$main   = isset( $hero['main'] ) ? $hero['main'] : array();
	$slides = isset( $hero['slides'] ) && is_array( $hero['slides'] ) ? $hero['slides'] : array();
	$ticker = isset( $o['ticker'] ) && is_array( $o['ticker'] ) ? $o['ticker'] : array();

	$g  = function ( $arr, $k, $d = '' ) { return isset( $arr[ $k ] ) ? $arr[ $k ] : $d; };
	$mb = isset( $main['buttons'] ) && is_array( $main['buttons'] ) ? $main['buttons'] : array();
	?>
	<div class="wrap lucahome-admin">
		<h1>Lucahome Storefront</h1>
		<?php if ( ! empty( $_GET['updated'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Cambios guardados. Recarga la página del escaparate para verlos.</p></div>
		<?php endif; ?>
		<p>Edita el carrusel de cabeceras y la cinta de textos de la portada. Tras guardar, los cambios se ven en la página del escaparate.</p>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="lucahome-form">
			<input type="hidden" name="action" value="lucahome_save_theme">
			<?php wp_nonce_field( 'lucahome_save_theme' ); ?>

			<h2 class="title">Carrusel</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Reproducción automática</th>
					<td><label><input type="checkbox" name="autoplay" value="1" <?php checked( ! empty( $hero['autoplay'] ) || empty( $o ) ); ?>> Pasar de cabecera sola</label></td>
				</tr>
				<tr>
					<th scope="row"><label for="lh-interval">Intervalo (ms)</label></th>
					<td><input type="number" id="lh-interval" name="interval" min="2500" step="500" value="<?php echo esc_attr( $g( $hero, 'interval', 6000 ) ); ?>"> <span class="description">Tiempo entre cabeceras (mín. 2500).</span></td>
				</tr>
			</table>

			<h2 class="title">Cabecera principal (escena 3D del césped)</h2>
			<p class="description">La imagen es la escena 3D interactiva; aquí editas sus textos y botones.</p>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label>Distintivo</label></th><td><input type="text" class="regular-text" name="main[badge]" value="<?php echo esc_attr( $g( $main, 'badge' ) ); ?>" placeholder="★ Vendedor destacado en Amazon España"></td></tr>
				<tr><th scope="row"><label>Título</label></th><td><textarea name="main[title]" rows="3" class="large-text" placeholder="Admite &lt;br&gt; y &lt;span class=&quot;accent&quot;&gt; / &lt;span class=&quot;gold&quot;&gt;"><?php echo esc_textarea( $g( $main, 'title' ) ); ?></textarea><p class="description">Etiquetas permitidas: <code>&lt;br&gt;</code>, <code>&lt;span class="accent"&gt;</code> (verde) y <code>&lt;span class="gold"&gt;</code> (dorado).</p></td></tr>
				<tr><th scope="row"><label>Subtítulo</label></th><td><textarea name="main[subtitle]" rows="3" class="large-text"><?php echo esc_textarea( $g( $main, 'subtitle' ) ); ?></textarea></td></tr>
				<tr><th scope="row">Botones</th><td>
					<?php for ( $i = 0; $i < 2; $i++ ) :
						$b = isset( $mb[ $i ] ) ? $mb[ $i ] : array(); ?>
						<p>
							<input type="text" name="main[buttons][<?php echo $i; ?>][label]" value="<?php echo esc_attr( $g( $b, 'label' ) ); ?>" placeholder="Texto del botón <?php echo $i + 1; ?>">
							<input type="text" name="main[buttons][<?php echo $i; ?>][href]" value="<?php echo esc_attr( $g( $b, 'href' ) ); ?>" placeholder="#tienda o https://…">
							<select name="main[buttons][<?php echo $i; ?>][style]">
								<option value="primary" <?php selected( $g( $b, 'style', 'primary' ), 'primary' ); ?>>Sólido</option>
								<option value="ghost" <?php selected( $g( $b, 'style' ), 'ghost' ); ?>>Contorno</option>
							</select>
						</p>
					<?php endfor; ?>
				</td></tr>
			</table>

			<h2 class="title">Cabeceras adicionales</h2>
			<p class="description">Cabeceras con imagen, texto y botones. Arrástralas con ▲▼ para reordenar.</p>
			<div id="lh-slides">
				<?php
				if ( $slides ) {
					foreach ( $slides as $s ) echo lucahome_sf_slide_row( $s );
				}
				?>
			</div>
			<p>
				<button type="button" class="button" id="lh-add-slide">+ Añadir cabecera</button>
			</p>

			<h2 class="title">Cinta de textos (ticker)</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="lh-ticker">Frases</label></th>
					<td><textarea id="lh-ticker" name="ticker" rows="6" class="large-text" placeholder="Una frase por línea"><?php echo esc_textarea( implode( "\n", $ticker ) ); ?></textarea>
						<p class="description">Una frase por línea. Se repiten en bucle.</p></td></tr>
			</table>

			<?php submit_button( 'Guardar cambios' ); ?>
		</form>

		<template id="lh-slide-tpl"><?php echo lucahome_sf_slide_row( array() ); ?></template>
	</div>

	<style>
		.lucahome-admin .lh-slide{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:14px 16px;margin:0 0 14px;position:relative}
		.lucahome-admin .lh-slide h4{margin:.2em 0 .8em}
		.lucahome-admin .lh-slide .lh-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
		.lucahome-admin .lh-slide .lh-row > label{flex:1 1 240px;font-weight:600;font-size:13px}
		.lucahome-admin .lh-slide input[type=text],.lucahome-admin .lh-slide textarea,.lucahome-admin .lh-slide select{width:100%}
		.lucahome-admin .lh-slide .lh-tools{position:absolute;top:10px;right:10px;display:flex;gap:4px}
		.lucahome-admin .lh-slide .lh-img{display:flex;gap:8px;align-items:center}
		.lucahome-admin .lh-btnrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
		.lucahome-admin .lh-btnrow input{flex:1 1 180px}
	</style>

	<script>
	(function(){
		const wrap = document.getElementById('lh-slides');
		const tpl  = document.getElementById('lh-slide-tpl');
		const form = document.getElementById('lucahome-form');

		function reindex(){
			wrap.querySelectorAll('.lh-slide').forEach((row, i) => {
				row.querySelectorAll('[name]').forEach(el => {
					el.name = el.name.replace(/slides\[\d*\]/, 'slides[' + i + ']');
				});
			});
		}
		function wire(row){
			row.querySelector('.lh-del').addEventListener('click', () => { row.remove(); reindex(); });
			row.querySelector('.lh-up').addEventListener('click', () => { const p = row.previousElementSibling; if (p) wrap.insertBefore(row, p); reindex(); });
			row.querySelector('.lh-down').addEventListener('click', () => { const n = row.nextElementSibling; if (n) wrap.insertBefore(n, row); reindex(); });
			const pick = row.querySelector('.lh-pick');
			if (pick) pick.addEventListener('click', e => {
				e.preventDefault();
				const frame = wp.media({ title:'Elegir imagen de cabecera', button:{ text:'Usar imagen' }, multiple:false });
				frame.on('select', () => { const a = frame.state().get('selection').first().toJSON(); row.querySelector('.lh-img input').value = a.url; });
				frame.open();
			});
		}
		document.getElementById('lh-add-slide').addEventListener('click', () => {
			const div = document.createElement('div');
			div.innerHTML = tpl.innerHTML;
			const row = div.firstElementChild;
			wrap.appendChild(row); wire(row); reindex();
		});
		wrap.querySelectorAll('.lh-slide').forEach(wire);
		form.addEventListener('submit', reindex);
		reindex();
	})();
	</script>
	<?php
}

/** HTML de una fila de cabecera adicional (para PHP y como plantilla JS). */
function lucahome_sf_slide_row( $s ) {
	$g  = function ( $arr, $k, $d = '' ) { return isset( $arr[ $k ] ) ? $arr[ $k ] : $d; };
	$bs = isset( $s['buttons'] ) && is_array( $s['buttons'] ) ? $s['buttons'] : array();
	ob_start();
	?>
	<div class="lh-slide">
		<div class="lh-tools">
			<button type="button" class="button lh-up" title="Subir">▲</button>
			<button type="button" class="button lh-down" title="Bajar">▼</button>
			<button type="button" class="button lh-del" title="Eliminar">✕</button>
		</div>
		<h4>Cabecera</h4>
		<div class="lh-row">
			<label>Tipo de cabecera
				<select name="slides[][kind]" class="lh-kind">
					<option value="image" <?php selected( $g( $s, 'kind', 'image' ), 'image' ); ?>>Imagen / fondo</option>
					<option value="matshow" <?php selected( $g( $s, 'kind' ), 'matshow' ); ?>>Felpudos (pase de diseños)</option>
					<option value="curtain" <?php selected( $g( $s, 'kind' ), 'curtain' ); ?>>Cortina simulada</option>
				</select>
			</label>
			<label>Epígrafe (arriba)<input type="text" name="slides[][eyebrow]" value="<?php echo esc_attr( $g( $s, 'eyebrow' ) ); ?>" placeholder="Hecho a tu medida"></label>
			<label>Etiqueta sobre la imagen<input type="text" name="slides[][mediaTag]" value="<?php echo esc_attr( $g( $s, 'mediaTag' ) ); ?>" placeholder="DISEÑO PROPIO"></label>
		</div>
		<p class="description" style="margin:.2em 0 .8em">«Felpudos» y «Cortina simulada» usan animación propia; los campos de imagen se ignoran en esos tipos.</p>
		<div class="lh-row">
			<label>Título<textarea name="slides[][title]" rows="2"><?php echo esc_textarea( $g( $s, 'title' ) ); ?></textarea></label>
		</div>
		<div class="lh-row">
			<label>Subtítulo<textarea name="slides[][subtitle]" rows="2"><?php echo esc_textarea( $g( $s, 'subtitle' ) ); ?></textarea></label>
		</div>
		<div class="lh-row">
			<label>Imagen
				<span class="lh-img"><input type="text" name="slides[][image]" value="<?php echo esc_attr( $g( $s, 'image' ) ); ?>" placeholder="https://… (vacío = fondo decorativo)"><button type="button" class="button lh-pick">Elegir</button></span>
			</label>
			<label>Fondo decorativo (si no hay imagen)
				<select name="slides[][media]">
					<option value="perso" <?php selected( $g( $s, 'media', 'perso' ), 'perso' ); ?>>Felpudo personalizado</option>
					<option value="curtains" <?php selected( $g( $s, 'media' ), 'curtains' ); ?>>Cortinas</option>
				</select>
			</label>
		</div>
		<div class="lh-row">
			<label><input type="checkbox" name="slides[][reverse]" value="1" <?php checked( ! empty( $s['reverse'] ) ); ?>> Imagen a la izquierda</label>
		</div>
		<?php for ( $i = 0; $i < 2; $i++ ) :
			$b = isset( $bs[ $i ] ) ? $bs[ $i ] : array(); ?>
			<div class="lh-btnrow">
				<input type="text" name="slides[][buttons][<?php echo $i; ?>][label]" value="<?php echo esc_attr( $g( $b, 'label' ) ); ?>" placeholder="Botón <?php echo $i + 1; ?>">
				<input type="text" name="slides[][buttons][<?php echo $i; ?>][href]" value="<?php echo esc_attr( $g( $b, 'href' ) ); ?>" placeholder="#tienda o https://…">
				<select name="slides[][buttons][<?php echo $i; ?>][style]">
					<option value="primary" <?php selected( $g( $b, 'style', 'primary' ), 'primary' ); ?>>Sólido</option>
					<option value="ghost" <?php selected( $g( $b, 'style' ), 'ghost' ); ?>>Contorno</option>
				</select>
			</div>
		<?php endfor; ?>
	</div>
	<?php
	return ob_get_clean();
}
