#!/usr/bin/env bash
# Build installable plugin zips for WooCommerce and WHMCS.
#
# Output:
#   dist/tempesttouch-woocommerce-<version>.zip
#   dist/tempesttouch-whmcs-<version>.zip
#
# The WooCommerce zip's top-level folder must match the plugin slug so
# WordPress activates it correctly. The WHMCS zip's layout mirrors the WHMCS
# install root so the merchant can unzip directly into WHMCS.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
VERSION="${TEMPESTTOUCH_PLUGIN_VERSION:-0.1.0}"

"${ROOT_DIR}/scripts/sync-plugin-sdk.sh"

mkdir -p "${DIST_DIR}"

# WooCommerce
WC_SRC="${ROOT_DIR}/plugins/woocommerce/tempesttouch-woocommerce"
WC_ZIP="${DIST_DIR}/tempesttouch-woocommerce-${VERSION}.zip"
rm -f "${WC_ZIP}"
(
    cd "${ROOT_DIR}/plugins/woocommerce"
    zip -rq "${WC_ZIP}" "tempesttouch-woocommerce" \
        -x "tempesttouch-woocommerce/node_modules/*" \
        -x "tempesttouch-woocommerce/.git/*" \
        -x "tempesttouch-woocommerce/tests/*"
)
echo "✓ built $(basename "${WC_ZIP}")"

# WHMCS
WHMCS_SRC="${ROOT_DIR}/plugins/whmcs"
WHMCS_ZIP="${DIST_DIR}/tempesttouch-whmcs-${VERSION}.zip"
rm -f "${WHMCS_ZIP}"
(
    cd "${WHMCS_SRC}"
    zip -rq "${WHMCS_ZIP}" "modules" "README.md"
)
echo "✓ built $(basename "${WHMCS_ZIP}")"

echo ""
echo "Output:"
ls -lh "${DIST_DIR}"/tempesttouch-*.zip
