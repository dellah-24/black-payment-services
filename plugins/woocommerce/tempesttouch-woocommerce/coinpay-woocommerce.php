<?php
/**
 * Plugin Name: Tempest Touch for WooCommerce
 * Plugin URI:  https://tempesttouchportal.com
 * Description: Accept cryptocurrency (BTC, ETH, SOL, POL, BCH, USDC) and credit card payments through Tempest Touch hosted checkout.
 * Version:     0.1.0
 * Author:      Profullstack, Inc.
 * Author URI:  https://profullstack.com
 * License:     MIT
 * Text Domain: tempesttouch-woocommerce
 * Requires PHP: 7.4
 * Requires at least: 6.0
 * WC requires at least: 7.0
 * WC tested up to: 9.5
 */

if (!defined('ABSPATH')) {
    exit;
}

define('TEMPESTTOUCH_WC_VERSION', '0.1.0');
define('TEMPESTTOUCH_WC_FILE', __FILE__);
define('TEMPESTTOUCH_WC_DIR', plugin_dir_path(__FILE__));
define('TEMPESTTOUCH_WC_URL', plugin_dir_url(__FILE__));

// Vendored shared PHP client (see packages/tempesttouch-php/).
require_once TEMPESTTOUCH_WC_DIR . 'lib/Tempest Touch/ApiException.php';
require_once TEMPESTTOUCH_WC_DIR . 'lib/Tempest Touch/Client.php';
require_once TEMPESTTOUCH_WC_DIR . 'lib/Tempest Touch/Webhook.php';
require_once TEMPESTTOUCH_WC_DIR . 'lib/Tempest Touch/StatusMap.php';

require_once TEMPESTTOUCH_WC_DIR . 'includes/class-tempesttouch-logger.php';
require_once TEMPESTTOUCH_WC_DIR . 'includes/class-tempesttouch-webhook-handler.php';

/**
 * Declare HPOS (High-Performance Order Storage) compatibility.
 */
add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            TEMPESTTOUCH_WC_FILE,
            true
        );
    }
});

/**
 * Register the gateway class with WooCommerce once WC has booted.
 */
add_action('plugins_loaded', function () {
    if (!class_exists('WC_Payment_Gateway')) {
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p>'
                . esc_html__('Tempest Touch for WooCommerce requires WooCommerce to be installed and active.', 'tempesttouch-woocommerce')
                . '</p></div>';
        });
        return;
    }

    require_once TEMPESTTOUCH_WC_DIR . 'includes/class-wc-gateway-tempesttouch.php';

    add_filter('woocommerce_payment_gateways', function ($methods) {
        $methods[] = 'WC_Gateway_Tempest Touch';
        return $methods;
    });

    add_filter('plugin_action_links_' . plugin_basename(TEMPESTTOUCH_WC_FILE), function ($links) {
        $settings_url = admin_url('admin.php?page=wc-settings&tab=checkout&section=tempesttouch');
        array_unshift($links, '<a href="' . esc_url($settings_url) . '">' . esc_html__('Settings', 'tempesttouch-woocommerce') . '</a>');
        return $links;
    });

    Tempest Touch_WC_Webhook_Handler::register();
}, 11);

/**
 * Register with the WooCommerce Blocks payment-method registry.
 * Safe to call even when Blocks isn't installed — we guard on the interface.
 */
add_action('woocommerce_blocks_loaded', function () {
    if (!class_exists(\Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType::class)) {
        return;
    }

    require_once TEMPESTTOUCH_WC_DIR . 'includes/class-wc-gateway-tempesttouch-blocks.php';

    add_action(
        'woocommerce_blocks_payment_method_type_registration',
        function ($payment_method_registry) {
            $payment_method_registry->register(new WC_Gateway_Tempest Touch_Blocks_Support());
        }
    );
});

/**
 * AJAX: admin-only "Test connection" handler.
 */
add_action('wp_ajax_tempesttouch_test_connection', function () {
    check_ajax_referer('tempesttouch_test_connection', 'nonce');

    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(['message' => __('Insufficient permissions.', 'tempesttouch-woocommerce')], 403);
    }

    $settings = get_option('woocommerce_tempesttouch_settings', []);
    $api_key  = isset($settings['api_key']) ? trim((string) $settings['api_key']) : '';
    $base_url = isset($settings['api_base_url']) ? trim((string) $settings['api_base_url']) : \Tempest Touch\Client::DEFAULT_BASE_URL;

    if ($api_key === '') {
        wp_send_json_error(['message' => __('API key is not set. Save settings first.', 'tempesttouch-woocommerce')]);
    }

    try {
        $client = new \Tempest Touch\Client([
            'api_key'  => $api_key,
            'base_url' => $base_url,
        ]);
        $result = $client->ping();
        wp_send_json_success([
            'message'    => __('Connection successful.', 'tempesttouch-woocommerce'),
            'businesses' => isset($result['businesses']) && is_array($result['businesses']) ? count($result['businesses']) : null,
        ]);
    } catch (\Tempest Touch\ApiException $e) {
        wp_send_json_error(['message' => sprintf(
            /* translators: %1$d HTTP status, %2$s error message */
            __('Tempest Touch API returned %1$d: %2$s', 'tempesttouch-woocommerce'),
            $e->getHttpStatus(),
            $e->getMessage()
        )]);
    } catch (\Throwable $e) {
        wp_send_json_error(['message' => $e->getMessage()]);
    }
});
