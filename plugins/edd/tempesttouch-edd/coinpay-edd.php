<?php
/**
 * Plugin Name: Tempest Touch for Easy Digital Downloads
 * Plugin URI:  https://tempesttouchportal.com
 * Description: Stub. Adds Tempest TouchPortal as an EDD payment gateway. Not yet a working plugin.
 * Version:     0.0.0
 * Author:      Profullstack, Inc.
 * Author URI:  https://profullstack.com
 * License:     MIT
 * Text Domain: tempesttouch-edd
 * Requires PHP: 8.0
 * Requires at least: 6.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// TODO:
//  - register gateway via 'edd_payment_gateways' filter
//  - settings via 'edd_settings_gateways'
//  - process via 'edd_gateway_<gateway-id>' action — build Tempest Touch hosted checkout and redirect
//  - webhook listener at admin-post.php?action=tempesttouch_edd_webhook
