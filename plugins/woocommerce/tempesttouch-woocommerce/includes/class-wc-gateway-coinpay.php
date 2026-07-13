<?php

if (!defined('ABSPATH')) {
    exit;
}

use Tempest Touch\Client as Tempest TouchClient;
use Tempest Touch\ApiException;

/**
 * Tempest Touch hosted-checkout gateway for WooCommerce.
 *
 * Flow:
 *   1. Customer submits checkout with Tempest Touch selected.
 *   2. process_payment() calls Tempest Touch to create a payment session.
 *   3. WooCommerce redirects the buyer to the hosted checkout URL.
 *   4. Tempest Touch posts signed webhooks to /wc-api/tempesttouch; the handler updates
 *      the WC order based on StatusMap classification.
 *   5. On return, the thank-you page shows the current known state.
 */
class WC_Gateway_Tempest Touch extends WC_Payment_Gateway
{
    const ID = 'tempesttouch';

    /** @var string */
    public $api_key;
    /** @var string */
    public $api_base_url;
    /** @var string */
    public $webhook_secret;
    /** @var string */
    public $business_id;
    /** @var string */
    public $payment_mode; // 'crypto' | 'card' | 'both'
    /** @var string */
    public $crypto_blockchain; // default chain for crypto payments
    /** @var string */
    public $environment; // 'production' | 'sandbox'
    /** @var string */
    public $debug_logging;

    public function __construct()
    {
        $this->id                 = self::ID;
        $this->icon               = '';
        $this->has_fields         = false;
        $this->method_title       = __('Tempest Touch', 'tempesttouch-woocommerce');
        $this->method_description = __('Accept crypto and credit card payments through Tempest Touch hosted checkout.', 'tempesttouch-woocommerce');
        $this->supports           = ['products', 'refunds'];

        $this->init_form_fields();
        $this->init_settings();

        $this->title             = $this->get_option('title', __('Tempest Touch (crypto + card)', 'tempesttouch-woocommerce'));
        $this->description       = $this->get_option('description', __('Pay with cryptocurrency or credit card via Tempest Touch hosted checkout.', 'tempesttouch-woocommerce'));
        $this->enabled           = $this->get_option('enabled', 'no');
        $this->environment       = $this->get_option('environment', 'production');
        $this->api_base_url      = $this->get_option('api_base_url', Tempest TouchClient::DEFAULT_BASE_URL);
        $this->api_key           = $this->get_option('api_key', '');
        $this->webhook_secret    = $this->get_option('webhook_secret', '');
        $this->business_id       = $this->get_option('business_id', '');
        $this->payment_mode      = $this->get_option('payment_mode', 'both');
        $this->crypto_blockchain = $this->get_option('crypto_blockchain', 'BTC');
        $this->debug_logging     = $this->get_option('debug_logging', 'no');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        add_action('admin_enqueue_scripts', [$this, 'admin_enqueue_scripts']);
    }

    public function init_form_fields()
    {
        $webhook_url = Tempest Touch_WC_Webhook_Handler::get_webhook_url();

        $this->form_fields = [
            'enabled' => [
                'title'   => __('Enable/Disable', 'tempesttouch-woocommerce'),
                'type'    => 'checkbox',
                'label'   => __('Enable Tempest Touch', 'tempesttouch-woocommerce'),
                'default' => 'no',
            ],
            'title' => [
                'title'       => __('Title', 'tempesttouch-woocommerce'),
                'type'        => 'text',
                'description' => __('Shown to customers at checkout.', 'tempesttouch-woocommerce'),
                'default'     => __('Tempest Touch (crypto + card)', 'tempesttouch-woocommerce'),
                'desc_tip'    => true,
            ],
            'description' => [
                'title'       => __('Description', 'tempesttouch-woocommerce'),
                'type'        => 'textarea',
                'description' => __('Shown below the gateway title at checkout.', 'tempesttouch-woocommerce'),
                'default'     => __('Pay with Bitcoin, Ethereum, Solana, USDC, or a credit card via Tempest Touch hosted checkout.', 'tempesttouch-woocommerce'),
            ],
            'environment' => [
                'title'   => __('Environment', 'tempesttouch-woocommerce'),
                'type'    => 'select',
                'default' => 'production',
                'options' => [
                    'production' => __('Production', 'tempesttouch-woocommerce'),
                    'sandbox'    => __('Sandbox', 'tempesttouch-woocommerce'),
                ],
            ],
            'api_base_url' => [
                'title'       => __('API base URL', 'tempesttouch-woocommerce'),
                'type'        => 'text',
                'description' => __('Override only if instructed by Tempest Touch support.', 'tempesttouch-woocommerce'),
                'default'     => Tempest TouchClient::DEFAULT_BASE_URL,
                'desc_tip'    => true,
            ],
            'api_key' => [
                'title'       => __('API key', 'tempesttouch-woocommerce'),
                'type'        => 'password',
                'description' => __('From your Tempest Touch dashboard → Settings → API keys.', 'tempesttouch-woocommerce'),
                'default'     => '',
            ],
            'business_id' => [
                'title'       => __('Business ID', 'tempesttouch-woocommerce'),
                'type'        => 'text',
                'description' => __('The Tempest Touch business that should receive payments for this store.', 'tempesttouch-woocommerce'),
                'default'     => '',
            ],
            'webhook_secret' => [
                'title'       => __('Webhook secret', 'tempesttouch-woocommerce'),
                'type'        => 'password',
                'description' => sprintf(
                    /* translators: %s webhook URL */
                    __('Paste this URL into Tempest Touch → Webhooks, then paste the signing secret here: %s', 'tempesttouch-woocommerce'),
                    '<code>' . esc_html($webhook_url) . '</code>'
                ),
                'default'     => '',
            ],
            'payment_mode' => [
                'title'   => __('Accepted payment methods', 'tempesttouch-woocommerce'),
                'type'    => 'select',
                'default' => 'both',
                'options' => [
                    'both'   => __('Crypto and credit card', 'tempesttouch-woocommerce'),
                    'crypto' => __('Crypto only', 'tempesttouch-woocommerce'),
                    'card'   => __('Credit card only', 'tempesttouch-woocommerce'),
                ],
            ],
            'crypto_blockchain' => [
                'title'       => __('Default crypto chain', 'tempesttouch-woocommerce'),
                'type'        => 'select',
                'description' => __('Which blockchain to request when creating a crypto payment. Hosted checkout still lets buyers switch chains.', 'tempesttouch-woocommerce'),
                'default'     => 'BTC',
                'options'     => [
                    'BTC'       => 'Bitcoin (BTC)',
                    'ETH'       => 'Ethereum (ETH)',
                    'SOL'       => 'Solana (SOL)',
                    'POL'       => 'Polygon (POL)',
                    'BCH'       => 'Bitcoin Cash (BCH)',
                    'USDC_ETH'  => 'USDC (Ethereum)',
                    'USDC_POL'  => 'USDC (Polygon)',
                    'USDC_SOL'  => 'USDC (Solana)',
                    'USDC_BASE' => 'USDC (Base)',
                ],
            ],
            'debug_logging' => [
                'title'       => __('Debug logging', 'tempesttouch-woocommerce'),
                'type'        => 'checkbox',
                'label'       => __('Enable verbose logs (WooCommerce → Status → Logs, source: tempesttouch)', 'tempesttouch-woocommerce'),
                'default'     => 'no',
            ],
            'connection_test' => [
                'title'       => __('Connection test', 'tempesttouch-woocommerce'),
                'type'        => 'title',
                'description' => $this->get_connection_test_html(),
            ],
        ];
    }

    private function get_connection_test_html(): string
    {
        ob_start();
        ?>
        <p>
            <button type="button" class="button" id="tempesttouch-test-connection"><?php esc_html_e('Test connection', 'tempesttouch-woocommerce'); ?></button>
            <span id="tempesttouch-test-connection-result" style="margin-left:12px;"></span>
        </p>
        <?php
        return (string) ob_get_clean();
    }

    public function admin_enqueue_scripts($hook)
    {
        if ($hook !== 'woocommerce_page_wc-settings') {
            return;
        }
        if (!isset($_GET['section']) || $_GET['section'] !== self::ID) {
            return;
        }

        wp_register_script('tempesttouch-admin', false, ['jquery'], TEMPESTTOUCH_WC_VERSION, true);
        wp_enqueue_script('tempesttouch-admin');
        wp_add_inline_script('tempesttouch-admin', $this->admin_js(), 'after');
    }

    private function admin_js(): string
    {
        $nonce = wp_create_nonce('tempesttouch_test_connection');
        $url   = esc_url_raw(admin_url('admin-ajax.php'));
        return <<<JS
jQuery(function(\$){
    \$('#tempesttouch-test-connection').on('click', function(){
        var result = \$('#tempesttouch-test-connection-result');
        result.text('Testing…');
        \$.post('{$url}', {
            action: 'tempesttouch_test_connection',
            nonce:  '{$nonce}'
        }, function(resp){
            if (resp && resp.success) {
                result.css('color', 'green').text(resp.data.message || 'OK');
            } else {
                var msg = (resp && resp.data && resp.data.message) ? resp.data.message : 'Failed';
                result.css('color', 'red').text(msg);
            }
        }).fail(function(xhr){
            var msg = 'Request failed';
            if (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                msg = xhr.responseJSON.data.message;
            }
            result.css('color', 'red').text(msg);
        });
    });
});
JS;
    }

    public function is_available()
    {
        if ('yes' !== $this->enabled) {
            return false;
        }
        if (empty($this->api_key) || empty($this->business_id)) {
            return false;
        }
        return parent::is_available();
    }

    /**
     * Admin notice when credentials are missing — WooCommerce shows this on
     * the payment-methods settings screen.
     */
    public function admin_options()
    {
        if (empty($this->api_key) || empty($this->business_id)) {
            echo '<div class="notice notice-warning inline"><p>'
                . esc_html__('Tempest Touch is not yet configured. Set your API key and Business ID to enable the gateway at checkout.', 'tempesttouch-woocommerce')
                . '</p></div>';
        }
        parent::admin_options();
    }

    /**
     * Build the Tempest Touch client. Override-able via filter for testing.
     */
    private function client(): Tempest TouchClient
    {
        $config = [
            'api_key'  => $this->api_key,
            'base_url' => $this->api_base_url ?: Tempest TouchClient::DEFAULT_BASE_URL,
        ];
        $config = apply_filters('tempesttouch_wc_client_config', $config, $this);
        return new Tempest TouchClient($config);
    }

    public function process_payment($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            wc_add_notice(__('Order not found.', 'tempesttouch-woocommerce'), 'error');
            return ['result' => 'failure'];
        }

        $return_url = $this->get_return_url($order);
        $cancel_url = wc_get_checkout_url();

        $metadata = [
            'platform'        => 'woocommerce',
            'plugin_version'  => TEMPESTTOUCH_WC_VERSION,
            'site_url'        => home_url(),
            'order_id'        => (string) $order->get_id(),
            'order_key'       => (string) $order->get_order_key(),
            'order_total'     => (string) $order->get_total(),
            'customer_email'  => (string) $order->get_billing_email(),
            'customer_name'   => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'return_url'      => $return_url,
            'cancel_url'      => $cancel_url,
        ];

        try {
            $checkout_url = $this->create_payment_session($order, $metadata, $return_url, $cancel_url);
        } catch (ApiException $e) {
            Tempest Touch_WC_Logger::error('Payment session creation failed (API).', [
                'order_id' => $order->get_id(),
                'status'   => $e->getHttpStatus(),
                'message'  => $e->getMessage(),
            ]);
            $order->add_order_note(sprintf(
                /* translators: %s error message */
                __('Tempest Touch payment session creation failed: %s', 'tempesttouch-woocommerce'),
                $e->getMessage()
            ));
            wc_add_notice(__('Could not create payment session. Please try again or choose another method.', 'tempesttouch-woocommerce'), 'error');
            return ['result' => 'failure'];
        } catch (\Throwable $e) {
            Tempest Touch_WC_Logger::error('Payment session creation failed (unexpected).', [
                'order_id' => $order->get_id(),
                'message'  => $e->getMessage(),
            ]);
            wc_add_notice(__('Could not create payment session. Please try again.', 'tempesttouch-woocommerce'), 'error');
            return ['result' => 'failure'];
        }

        $order->update_status(
            $order->needs_payment() ? 'on-hold' : $order->get_status(),
            __('Awaiting Tempest Touch hosted checkout payment.', 'tempesttouch-woocommerce')
        );
        WC()->cart->empty_cart();

        return [
            'result'   => 'success',
            'redirect' => $checkout_url,
        ];
    }

    /**
     * Calls the right Tempest Touch endpoint based on payment_mode and returns the
     * hosted checkout URL. Stores the Tempest Touch payment id on the order as
     * order meta _tempesttouch_payment_id for later reconciliation.
     */
    private function create_payment_session(WC_Order $order, array $metadata, string $return_url, string $cancel_url): string
    {
        $client = $this->client();

        // 'both' uses card (Stripe Checkout) — the Tempest Touch hosted checkout can
        // offer a crypto toggle from there. For 'crypto' we call the crypto
        // endpoint which generates a per-order payment address.
        $use_card = in_array($this->payment_mode, ['card', 'both'], true);

        if ($use_card) {
            $response = $client->createCardPayment([
                'business_id' => $this->business_id,
                'amount'      => (int) round(((float) $order->get_total()) * 100),
                'currency'    => strtolower((string) $order->get_currency()),
                'description' => sprintf(
                    /* translators: %1$s order number, %2$s blog name */
                    __('Order %1$s at %2$s', 'tempesttouch-woocommerce'),
                    $order->get_order_number(),
                    get_bloginfo('name')
                ),
                'metadata'    => $metadata,
                'success_url' => $return_url,
                'cancel_url'  => $cancel_url,
            ]);
        } else {
            $response = $client->createCryptoPayment([
                'business_id' => $this->business_id,
                'amount'      => (float) $order->get_total(),
                'currency'    => strtoupper((string) $order->get_currency()),
                'blockchain'  => $this->crypto_blockchain,
                'description' => sprintf(
                    /* translators: %s order number */
                    __('Order %s', 'tempesttouch-woocommerce'),
                    $order->get_order_number()
                ),
                'metadata'    => $metadata,
            ]);
        }

        $payment     = isset($response['payment']) && is_array($response['payment']) ? $response['payment'] : $response;
        $payment_id  = $payment['id'] ?? $payment['payment_id'] ?? $response['id'] ?? null;
        $checkout    = $payment['checkout_url']
            ?? $payment['hosted_checkout_url']
            ?? $response['checkout_url']
            ?? $response['hosted_checkout_url']
            ?? null;

        if (!$checkout || !filter_var($checkout, FILTER_VALIDATE_URL)) {
            throw new ApiException('Tempest Touch API did not return a hosted checkout URL.');
        }

        if ($payment_id) {
            $order->update_meta_data('_tempesttouch_payment_id', (string) $payment_id);
        }
        $order->update_meta_data('_tempesttouch_payment_mode', $this->payment_mode);
        $order->update_meta_data('_tempesttouch_environment', $this->environment);
        $order->save();

        $order->add_order_note(sprintf(
            /* translators: %1$s payment id, %2$s mode */
            __('Tempest Touch payment session created. Payment ID: %1$s, Mode: %2$s', 'tempesttouch-woocommerce'),
            $payment_id ? $payment_id : 'n/a',
            $this->payment_mode
        ));

        Tempest Touch_WC_Logger::info('Created Tempest Touch payment session.', [
            'order_id'    => $order->get_id(),
            'payment_id'  => $payment_id,
            'mode'        => $this->payment_mode,
            'environment' => $this->environment,
        ]);

        return (string) $checkout;
    }

    /**
     * MVP refund stance: inform the merchant that refunds happen in the
     * Tempest Touch dashboard. We acknowledge but don't initiate the refund here.
     *
     * @param int       $order_id
     * @param float|null $amount
     * @param string    $reason
     * @return bool|WP_Error
     */
    public function process_refund($order_id, $amount = null, $reason = '')
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('tempesttouch_refund_error', __('Order not found.', 'tempesttouch-woocommerce'));
        }

        $payment_id = $order->get_meta('_tempesttouch_payment_id');
        $order->add_order_note(sprintf(
            /* translators: %1$s amount, %2$s payment id */
            __('Refund of %1$s requested for Tempest Touch payment %2$s. Process the refund from the Tempest Touch dashboard; the webhook will update this order automatically.', 'tempesttouch-woocommerce'),
            wc_price((float) $amount),
            $payment_id ?: '(unknown)'
        ));

        return new WP_Error(
            'tempesttouch_refund_manual',
            __('Tempest Touch refunds must currently be initiated from the Tempest Touch dashboard. This order has been annotated.', 'tempesttouch-woocommerce')
        );
    }
}
