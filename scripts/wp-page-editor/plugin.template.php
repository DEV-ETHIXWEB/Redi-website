<?php
/**
 * Plugin Name:       REDI Page Editor
 * Description:       Puts the text of every marketing page into wp-admin. Adds one page per site page under Pages, grouped into tabs, and serves the values to the frontend. Any field left empty keeps the copy already on the site. Replaces REDI Home Editor.
 * Version:           __VERSION__
 * Author:            Ethixweb
 * Requires at least: 6.0
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Why this exists
 * ---------------
 * None of the page text was editable in WordPress. There were no pages for it
 * and the frontend never read /wp/v2/pages, so an editor had nothing to open
 * and every wording change came back to the developers.
 *
 * Why NOT redi/v1/page-copy
 * -------------------------
 * That route exists and returns this whole tree, but it is a frozen export:
 * its response still matches the repo as committed on 2026-09-04 because
 * nothing in wp-admin writes to it, and for a month it silently overrode
 * newer approved copy on the live site. Reusing it would rebuild that trap.
 *
 * The rule that stops it happening again
 * --------------------------------------
 * A field only overrides the site once an editor has actually typed into it.
 * Blank means "leave the approved copy alone", never "blank the section", so a
 * half-filled screen cannot empty a page. That single rule is the difference
 * between this and the export it replaces.
 *
 * Generated, not hand-written
 * ---------------------------
 * The field list below is produced from src/content/seed/pages.json by
 * scripts/wp-page-editor/build.mjs in the Redi-website repo. 120 definitions
 * kept by hand would drift from the site the first time the copy changed
 * shape, and a field whose path no longer resolves fails silently - the
 * editor types, saves, and nothing happens. Regenerating is how a new field
 * gets added; do not edit the list below by hand.
 *
 * Known limits
 * ------------
 * ACF here is the free edition: no Options Pages, no Repeaters. Hence a real
 * page per section rather than an options screen, and lists entered as one
 * textarea split on blank lines. Items inside structured lists (the process
 * steps, the value comparison) are editable individually but cannot be added
 * or removed from wp-admin, because their count is part of the layout.
 * Images, links and icons are deliberately not exposed.
 */

/** Editable text per page. Generated - see the note above. */
function redi_pages_manifest() {
	return array(
__MANIFEST__
	);
}

const REDI_PAGES_OPTION         = 'redi_page_editor_ids';
const REDI_PAGES_VERSION_OPTION = 'redi_page_editor_version';
/**
 * Set by the generator to the plugin version plus a short hash of the field
 * list, so ANY change to the editable copy changes it. That is deliberate: the
 * in-place update check below keys off this value, and the case that must not
 * be missed is a regenerated plugin that adds a page. A hand-maintained
 * version number would be forgotten exactly then.
 */
const REDI_PAGES_VERSION        = '__VERSION_FINGERPRINT__';

/* -------------------------------------------------------------------------
 * 1. The pages
 * ---------------------------------------------------------------------- */

/**
 * Creates one page per site page and fills it with the copy that is live, so
 * an editor opens real text rather than empty boxes.
 *
 * Reuses a page that already carries the slug, which is what keeps the Home
 * page created by REDI Home Editor 1.x, along with anything already typed
 * into it.
 */
function redi_pages_activate() {
	$ids = (array) get_option( REDI_PAGES_OPTION, array() );

	foreach ( redi_pages_manifest() as $key => $page ) {
		$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );

		if ( $existing ) {
			$ids[ $key ] = $existing->ID;
		} else {
			$id = wp_insert_post(
				array(
					'post_title'   => $page['title'],
					'post_name'    => $page['slug'],
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_content' => '',
				)
			);

			if ( is_wp_error( $id ) || ! $id ) {
				continue;
			}

			$ids[ $key ] = $id;
		}

		// Reused pages get their defaults too. Skipping this is what left the
		// Home screen showing 43 empty boxes on 2026-11-04: its page already
		// existed, carried over from REDI Home Editor, so it was recorded and
		// passed over. The site was never at risk - blank means "keep the
		// approved copy" - but an editor opening a wall of empty fields has no
		// idea that is what blank means.
		redi_pages_fill_defaults( $ids[ $key ], $page['fields'] );
	}

	update_option( REDI_PAGES_OPTION, $ids );
}
register_activation_hook( __FILE__, 'redi_pages_activate' );

/**
 * Re-runs the setup after the plugin is updated in place.
 *
 * Activation hooks do not fire when a plugin is replaced by uploading a newer
 * zip over an active one, which is exactly how this plugin gets updated: the
 * field list is regenerated from the site's copy, so new versions are routine.
 * Without this, a version that adds a page would register fields for a page
 * that was never created, and the editor would simply not see it.
 *
 * Guarded by a stored version, so it is one option read per admin request and
 * does nothing until the plugin version actually changes. Safe to repeat:
 * redi_pages_activate() reuses any page that already carries the slug and only
 * writes defaults into pages it creates, so nothing already typed is touched.
 */
add_action(
	'admin_init',
	function () {
		if ( get_option( REDI_PAGES_VERSION_OPTION ) === REDI_PAGES_VERSION ) {
			return;
		}
		redi_pages_activate();
		update_option( REDI_PAGES_VERSION_OPTION, REDI_PAGES_VERSION );
	}
);

/**
 * Writes the live copy into any field that has never been filled in.
 *
 * `metadata_exists` rather than an empty check, so the two meanings of "empty"
 * stay apart: a field nobody has touched gets the current copy, and a field an
 * editor deliberately cleared stays cleared. Both render identically - blank
 * keeps the approved copy either way - but repopulating a box someone emptied
 * on purpose would look like the CMS fighting back.
 *
 * Safe to call repeatedly, which is what lets the update check re-run it.
 */
function redi_pages_fill_defaults( $page_id, $fields ) {
	if ( ! function_exists( 'update_field' ) ) {
		return;
	}
	foreach ( $fields as $field ) {
		if ( metadata_exists( 'post', $page_id, $field['name'] ) ) {
			continue;
		}
		update_field( $field['name'], $field['default'], $page_id );
	}
}

/** Page id for a manifest key, or 0 before activation has run. */
function redi_pages_id( $key ) {
	$ids = (array) get_option( REDI_PAGES_OPTION, array() );
	if ( isset( $ids[ $key ] ) && get_post( $ids[ $key ] ) ) {
		return (int) $ids[ $key ];
	}
	$manifest = redi_pages_manifest();
	if ( ! isset( $manifest[ $key ] ) ) {
		return 0;
	}
	$page = get_page_by_path( $manifest[ $key ]['slug'], OBJECT, 'page' );
	return $page ? $page->ID : 0;
}

/* -------------------------------------------------------------------------
 * 2. The fields
 * ---------------------------------------------------------------------- */

add_action(
	'acf/init',
	function () {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			return; // ACF inactive - fail quiet rather than fatal.
		}

		foreach ( redi_pages_manifest() as $key => $page ) {
			$page_id = redi_pages_id( $key );
			if ( ! $page_id ) {
				continue;
			}

			$fields  = array();
			$section = null;

			foreach ( $page['fields'] as $field ) {
				// First segment of the label is the section it belongs to, so
				// a long page breaks into tabs instead of one endless column.
				$parts = explode( ' / ', $field['label'] );
				$group = $parts[0];

				if ( $group !== $section ) {
					$section  = $group;
					$fields[] = array(
						'key'   => 'field_' . $field['name'] . '_tab',
						'label' => $group,
						'type'  => 'tab',
					);
				}

				$is_list  = 'list' === $field['type'];
				$is_block = 'blocklist' === $field['type'];

				if ( $is_block ) {
					// Rows are entered as blocks so they can be added and removed,
					// which ACF free cannot do with a Repeater. Spell the format
					// out in the instructions - it is the only place it appears.
					$labels = array_map(
						function ( $name ) {
							return ucfirst( str_replace( '_', ' ', $name ) );
						},
						$field['fields']
					);
					$instructions = 'One per block, separated by a blank line. Inside a block: '
						. ( count( $labels ) > 1
							? 'first line is the ' . strtolower( $labels[0] ) . ', the rest is the ' . strtolower( $labels[1] ) . '.'
							: 'the ' . strtolower( $labels[0] ) . '.' )
						. ' Add or remove blocks to add or remove rows. Leave the whole box empty to keep what is on the site now.';
				} elseif ( $is_list ) {
					$instructions = 'One item per block, separated by a blank line. Leave empty to keep what is on the site now.';
				} else {
					$instructions = 'Leave empty to keep what is on the site now.';
				}

				$fields[] = array(
					'key'          => 'field_' . $field['name'],
					'label'        => count( $parts ) > 1 ? implode( ' / ', array_slice( $parts, 1 ) ) : $field['label'],
					'name'         => $field['name'],
					'type'         => $is_list || $is_block || 'textarea' === $field['type'] ? 'textarea' : 'text',
					'rows'         => $is_block ? 14 : ( $is_list ? 8 : 3 ),
					'new_lines'    => '',
					'instructions' => $instructions,
				);
			}

			acf_add_local_field_group(
				array(
					'key'          => 'group_redi_page_' . $key,
					'title'        => $page['label'] . ' Page Content',
					'menu_order'   => 0,
					'position'     => 'normal',
					'active'       => true,
					'show_in_rest' => 1,
					'location'     => array(
						array(
							array(
								'param'    => 'page',
								'operator' => '==',
								'value'    => $page_id,
							),
						),
					),
					'fields'       => $fields,
				)
			);
		}
	}
);

/** Hides the block editor on these pages: the fields are the content. */
add_filter(
	'use_block_editor_for_post',
	function ( $use, $post ) {
		if ( ! $post instanceof WP_Post ) {
			return $use;
		}
		foreach ( array_keys( redi_pages_manifest() ) as $key ) {
			if ( (int) $post->ID === redi_pages_id( $key ) ) {
				return false;
			}
		}
		return $use;
	},
	10,
	2
);

/* -------------------------------------------------------------------------
 * 3. The route the frontend reads
 * ---------------------------------------------------------------------- */

/** Writes a value into a nested array at a dotted path like a.b[0].c. */
function redi_pages_set_path( &$target, $path, $value ) {
	$segments = array();
	foreach ( explode( '.', $path ) as $part ) {
		if ( preg_match_all( '/^([^\[]+)|\[(\d+)\]/', $part, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$segments[] = '' !== $match[1] ? $match[1] : (int) $match[2];
			}
		}
	}

	$cursor = &$target;
	$last   = array_pop( $segments );
	foreach ( $segments as $segment ) {
		if ( ! isset( $cursor[ $segment ] ) || ! is_array( $cursor[ $segment ] ) ) {
			$cursor[ $segment ] = array();
		}
		$cursor = &$cursor[ $segment ];
	}
	$cursor[ $last ] = $value;
}

/**
 * Own namespace, not redi/v1. That belongs to REDI Headless CMS, and sharing
 * it risks a collision the day it adds a route of its own.
 *
 * Only fields an editor has filled in appear. Anything absent means "no
 * change", which the frontend reads as "keep the approved copy".
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'ethixweb/v1',
			'/page-copy',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true', // public: the same copy the pages already show
				'callback'            => function () {
					$out = array();

					foreach ( redi_pages_manifest() as $key => $page ) {
						$page_id = redi_pages_id( $key );
						if ( ! $page_id || ! function_exists( 'get_field' ) ) {
							continue;
						}

						foreach ( $page['fields'] as $field ) {
							$value = get_field( $field['name'], $page_id );
							if ( ! is_string( $value ) ) {
								continue;
							}
							$value = trim( $value );
							if ( '' === $value ) {
								continue; // untouched: let the site keep its own copy
							}

							$target = $key . ( '' !== $field['path'] ? '.' . $field['path'] : '' );

							if ( 'list' === $field['type'] ) {
								$items = preg_split( '/\R\s*\R/', $value );
								$items = array_values( array_filter( array_map( 'trim', $items ), 'strlen' ) );
								if ( ! $items ) {
									continue;
								}
								redi_pages_set_path( $out, $target, $items );
							} elseif ( 'blocklist' === $field['type'] ) {
								// A block per row; inside a block, the first line is the
								// first field and everything after it is the second.
								$rows = array();
								foreach ( preg_split( '/\R\s*\R/', $value ) as $block ) {
									$block = trim( $block );
									if ( '' === $block ) {
										continue;
									}
									$lines = preg_split( '/\R/', $block );
									$row   = array();
									if ( count( $field['fields'] ) > 1 ) {
										$row[ $field['fields'][0] ] = trim( array_shift( $lines ) );
										$row[ $field['fields'][1] ] = trim( implode( ' ', array_map( 'trim', $lines ) ) );
									} else {
										$row[ $field['fields'][0] ] = trim( implode( ' ', array_map( 'trim', $lines ) ) );
									}
									// A row whose first field is blank is a stray blank
									// line, not a row the editor meant to create.
									if ( '' === reset( $row ) ) {
										continue;
									}
									$rows[] = $row;
								}
								if ( ! $rows ) {
									continue;
								}
								redi_pages_set_path( $out, $target, $rows );
							} else {
								redi_pages_set_path( $out, $target, $value );
							}
						}
					}

					return rest_ensure_response( $out );
				},
			)
		);
	}
);

/* -------------------------------------------------------------------------
 * 4. Rebuild the site when a page is saved
 * ---------------------------------------------------------------------- */

/**
 * REDI Auto Deploy watches the five content post types, not pages, so saving
 * one of these would otherwise change nothing until an unrelated publish.
 */
add_action(
	'acf/save_post',
	function ( $post_id ) {
		if ( ! is_numeric( $post_id ) || ! function_exists( 'redi_deploy_schedule' ) ) {
			return;
		}
		foreach ( array_keys( redi_pages_manifest() ) as $key ) {
			if ( (int) $post_id === redi_pages_id( $key ) ) {
				redi_deploy_schedule();
				return;
			}
		}
	},
	20
);
