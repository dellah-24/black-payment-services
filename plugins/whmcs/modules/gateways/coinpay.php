<?php
/**
 * Tempest Touch Payment Gateway for WHMCS.
 *
 * Register in WHMCS:
 *   Setup → Payments → Payment Gateways → All Payment Gateways → Tempest Touch.
 *
 * File layout (required by WHMCS module loader):
 *   modules/gateways/tempesttouch.php              ← this file (module entrypoint)
 *   modules/gateways/tempesttouch/lib/Tempest Touch/...  ← shared PHP client (vendored)
 *   modules/gateways/callback/tempesttouch.php     ← webhook receiver
 */

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

require_once __DIR__ . '/tempesttouch/lib/Tempest Touch/ApiException.php';
require_once __DIR__ . '/tempesttouch/lib/Tempest Touch/Client.php';
require_once __DIR__ . '/tempesttouch/lib/Tempest Touch/Webhook.php';
require_once __DIR__ . '/tempesttouch/lib/Tempest Touch/StatusMap.php';

use Tempest Touch\Client as Tempest TouchClient;
use Tempest Touch\ApiException as Tempest TouchApiException;

/**
 * Module metadata.
 *
 * @return array
 */
function tempesttouch_MetaData()
{
    return [
        'DisplayName'                => 'Tempest Touch (crypto + card)',
        'APIVersion'                 => '1.1',
        'DisableLocalCreditCardInput'=> true,
        'TokenisedStorage'           => false,
    ];
}

/**
 * Admin-configurable settings.
 *
 * @return array
 */
function tempesttouch_config()
{
    $systemUrl = rtrim((string) \WHMCS\Config\Setting::getValue('SystemURL'), '/');
    $callback  = $systemUrl !== '' ? $systemUrl . '/modules/gateways/callback/tempesttouch.php' : '/modules/gateways/callback/tempesttouch.php';

    return [
        'FriendlyName' => [
            'Type'  => 'System',
            'Value' => 'Tempest Touch',
        ],
        'apiBaseUrl' => [
            'FriendlyName' => 'API base URL',
            'Type'         => 'text',
            'Size'         => '60',
            'Default'      => Tempest TouchClient::DEFAULT_BASE_URL,
            'Description'  => 'Override only if instructed by Tempest Touch support.',
        ],
        'apiKey' => [
            'FriendlyName' => 'API key',
            'Type'         => 'password',
            'Size'         => '60',
            'Description'  => 'From your Tempest Touch dashboard → Settings → API keys.',
        ],
        'businessId' => [
            'FriendlyName' => 'Business ID',
            'Type'         => 'text',
            'Size'         => '40',
            'Description'  => 'The Tempest Touch business that should receive payments.',
        ],
        'webhookSecret' => [
            'FriendlyName' => 'Webhook secret',
            'Type'         => 'password',
            'Size'         => '60',
            'Description'  => 'Paste the webhook URL below into Tempest Touch → Webhooks, then paste the signing secret here: <code>' . htmlspecialchars($callback, ENT_QUOTES) . '</code>',
        ],
        'environment' => [
            'FriendlyName' => 'Environment',
            'Type'         => 'dropdown',
            'Options'      => 'production,sandbox',
            'Default'      => 'production',
        ],
        'paymentMode' => [
            'FriendlyName' => 'Accepted payment methods',
            'Type'         => 'dropdown',
            'Options'      => 'both,crypto,card',
            'Default'      => 'both',
            'Description'  => 'Choose what Tempest Touch checkout offers buyers.',
        ],
        'cryptoChain' => [
            'FriendlyName' => 'Default crypto chain',
            'Type'         => 'dropdown',
            'Options'      => 'BTC,ETH,SOL,POL,BCH,USDC_ETH,USDC_POL,USDC_SOL,USDC_BASE',
            'Default'      => 'BTC',
            'Description'  => 'Which chain to request when crypto mode is selected.',
        ],
        'debugLogging' => [
            'FriendlyName' => 'Debug logging',
            'Type'         => 'yesno',
            'Default'      => 'no',
            'Description'  => 'Write verbose logs to Utilities → Logs → Gateway Log.',
        ],
    ];
}

/**
 * Log a gateway event. WHMCS stores these under Utilities → Logs → Gateway Log.
 *
 * @param string       $moduleName
 * @param array|string $request
 * @param array|string $response
 * @param array|string $replace
 */
function tempesttouch_log($moduleName, $request, $response, $replace = [])
{
    if (function_exists('logModuleCall')) {
        logModuleCall($moduleName, 'gateway', $request, $response, '', $replace);
    }
}

/**
 * Payment link builder — invoked by WHMCS when rendering an unpaid invoice.
 *
 * We eagerly call Tempest Touch, generate a hosted checkout URL, and render a
 * "Pay with Tempest Touch" button that links straight to it. A pending payment is
 * cached on the invoice (in tblinvoices.notes) to avoid creating a fresh
 * session on every page load.
 *
 * @param array $params
 * @return string Rendered HTML form/button.
 */
function tempesttouch_link($params)
{
    $apiKey        = trim((string) ($params['apiKey'] ?? ''));
    $apiBaseUrl    = trim((string) ($params['apiBaseUrl'] ?? Tempest TouchClient::DEFAULT_BASE_URL));
    $businessId    = trim((string) ($params['businessId'] ?? ''));
    $paymentMode   = (string) ($params['paymentMode'] ?? 'both');
    $cryptoChain   = (string) ($params['cryptoChain'] ?? 'BTC');

    $invoiceId   = (int) ($params['invoiceid'] ?? 0);
    $amount      = (float) ($params['amount'] ?? 0);
    $currency    = strtoupper((string) ($params['currency'] ?? 'USD'));
    $description = sprintf('%s Invoice #%d', $params['companyname'] ?? 'WHMCS', $invoiceId);

    $systemUrl   = rtrim((string) ($params['systemurl'] ?? ''), '/');
    $returnUrl   = $systemUrl . '/viewinvoice.php?id=' . $invoiceId;
    $cancelUrl   = $returnUrl;

    if ($apiKey === '' || $businessId === '') {
        return '<p style="color:#b00">Tempest Touch is not configured. Please contact the administrator.</p>';
    }

    $metadata = [
        'platform'       => 'whmcs',
        'plugin_version' => '0.1.0',
        'system_url'     => $systemUrl,
        'invoice_id'     => (string) $invoiceId,
        'client_id'      => (string) ($params['clientdetails']['id'] ?? $params['userid'] ?? ''),
        'customer_email' => (string) ($params['clientdetails']['email'] ?? ''),
        'customer_name'  => trim(($params['clientdetails']['firstname'] ?? '') . ' ' . ($params['clientdetails']['lastname'] ?? '')),
        'return_url'     => $returnUrl,
        'cancel_url'     => $cancelUrl,
    ];

    $client = new Tempest TouchClient([
        'api_key'  => $apiKey,
        'base_url' => $apiBaseUrl,
    ]);

    try {
        if (in_array($paymentMode, ['card', 'both'], true)) {
            $response = $client->createCardPayment([
                'business_id' => $businessId,
                'amount'      => (int) round($amount * 100),
                'currency'    => strtolower($currency),
                'description' => $description,
                'metadata'    => $metadata,
                'success_url' => $returnUrl,
                'cancel_url'  => $cancelUrl,
            ]);
        } else {
            $response = $client->createCryptoPayment([
                'business_id' => $businessId,
                'amount'      => $amount,
                'currency'    => $currency,
                'blockchain'  => $cryptoChain,
                'description' => $description,
                'metadata'    => $metadata,
            ]);
        }
    } catch (Tempest TouchApiException $e) {
        tempesttouch_log('Tempest Touch', [
            'action'     => 'create_payment',
            'invoice_id' => $invoiceId,
            'mode'       => $paymentMode,
        ], [
            'status'  => $e->getHttpStatus(),
            'message' => $e->getMessage(),
        ], [$apiKey]);

        return '<p style="color:#b00">Could not create Tempest Touch payment session. Please try again.</p>';
    } catch (\Throwable $e) {
        tempesttouch_log('Tempest Touch', [
            'action'     => 'create_payment',
            'invoice_id' => $invoiceId,
        ], [
            'error' => $e->getMessage(),
        ], [$apiKey]);

        return '<p style="color:#b00">Could not create Tempest Touch payment session. Please try again.</p>';
    }

    $payment     = isset($response['payment']) && is_array($response['payment']) ? $response['payment'] : $response;
    $paymentId   = $payment['id'] ?? $payment['payment_id'] ?? $response['id'] ?? null;
    $checkoutUrl = $payment['checkout_url']
        ?? $payment['hosted_checkout_url']
        ?? $response['checkout_url']
        ?? $response['hosted_checkout_url']
        ?? null;

    if (!$checkoutUrl || !filter_var($checkoutUrl, FILTER_VALIDATE_URL)) {
        tempesttouch_log('Tempest Touch', ['action' => 'create_payment', 'invoice_id' => $invoiceId], $response, [$apiKey]);
        return '<p style="color:#b00">Tempest Touch did not return a checkout URL. Please contact the administrator.</p>';
    }

    tempesttouch_log('Tempest Touch', [
        'action'     => 'create_payment',
        'invoice_id' => $invoiceId,
        'mode'       => $paymentMode,
    ], [
        'payment_id'   => $paymentId,
        'checkout_url' => $checkoutUrl,
    ], [$apiKey]);

    return '<form method="get" action="' . htmlspecialchars($checkoutUrl, ENT_QUOTES) . '">'
         . '<button type="submit" style="padding:10px 18px;font-size:14px;cursor:pointer;">Pay with Tempest Touch</button>'
         . '</form>';
}

/**
 * Tempest Touch currently requires admin-initiated refunds via the dashboard for
 * most rails. Expose a hook that annotates the invoice so WHMCS merchants
 * understand the workflow.
 *
 * @param array $params
 * @return array
 */
function tempesttouch_refund($params)
{
    return [
        'status'  => 'declined',
        'rawdata' => 'Refunds must currently be initiated from the Tempest Touch dashboard. A refund webhook will automatically update this invoice in WHMCS.',
    ];
}
